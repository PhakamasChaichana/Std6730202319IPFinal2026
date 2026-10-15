const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// In-memory mock data (resets whenever the server restarts).
let employees = [
  { id: '1', name: 'John Doe', position: 'Software Engineer', status: 'Active', salary: 45000 },
  { id: '2', name: 'Jane Smith', position: 'HR Officer', status: 'Active', salary: 30000 },
  { id: '3', name: 'Peter Jones', position: 'IT Support', status: 'On Leave', salary: 22000 },
  { id: '4', name: 'Mary Brown', position: 'Project Manager', status: 'Active', salary: 85000 },
  { id: '5', name: 'Alex Wilson', position: 'Graphic Designer', status: 'Active', salary: 38000 },
  { id: '6', name: 'Nina Lee', position: 'Accountant', status: 'On Leave', salary: 52000 }
];
let nextId = 7;
const MOCK_TOKEN = 'mock-jwt-token';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (header !== `Bearer ${MOCK_TOKEN}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }
  next();
}

app.get('/', (_req, res) => res.json({ success: true, message: 'HR Manager API is running.' }));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({ success: true, token: MOCK_TOKEN });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password.' });
});

app.get('/api/employees', requireAuth, (_req, res) => {
  res.json({ success: true, employees });
});

app.post('/api/employees', requireAuth, (req, res) => {
  const { name, position, salary } = req.body || {};
  if (typeof name !== 'string' || !name.trim() ||
      typeof position !== 'string' || !position.trim() ||
      salary === undefined || salary === null || String(salary).trim() === '') {
    return res.status(400).json({ success: false, message: 'Name, position, and salary are required.' });
  }
  const parsedSalary = Number(salary);
  if (!Number.isFinite(parsedSalary) || parsedSalary < 0) {
    return res.status(400).json({ success: false, message: 'Salary must be a valid non-negative number.' });
  }
  const employee = {
    id: String(nextId++),
    name: name.trim(),
    position: position.trim(),
    status: 'Active',
    salary: parsedSalary
  };
  employees.push(employee);
  return res.status(201).json({ success: true, employee });
});

app.put('/api/employees/:id/status', requireAuth, (req, res) => {
  const employee = employees.find(item => item.id === req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });
  employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';
  return res.json({ success: true, employee });
});

app.delete('/api/employees/:id', requireAuth, (req, res) => {
  const index = employees.findIndex(item => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Employee not found.' });
  const [deleted] = employees.splice(index, 1);
  return res.json({ success: true, employee: deleted });
});

// One-dimensional K-Means. Starts from low/middle/high salary values,
// assigns each salary to the nearest centroid, then recalculates means.
function kMeans1D(values, k = 3, maxIterations = 100) {
  if (values.length < k) {
    throw new Error(`At least ${k} employees with salary values are required for ${k} clusters.`);
  }
  const sorted = [...values].sort((a, b) => a - b);
  let centroids = [sorted[0], sorted[Math.floor((sorted.length - 1) / 2)], sorted[sorted.length - 1]];
  let assignments = new Array(values.length).fill(-1);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false;
    const sums = new Array(k).fill(0);
    const counts = new Array(k).fill(0);

    values.forEach((value, index) => {
      let best = 0;
      for (let c = 1; c < k; c++) {
        if (Math.abs(value - centroids[c]) < Math.abs(value - centroids[best])) best = c;
      }
      if (assignments[index] !== best) changed = true;
      assignments[index] = best;
      sums[best] += value;
      counts[best]++;
    });

    const updated = centroids.map((centroid, c) => counts[c] ? sums[c] / counts[c] : centroid);
    const converged = updated.every((value, c) => Math.abs(value - centroids[c]) < 1e-8);
    centroids = updated;
    if (!changed || converged) break;
  }

  // Sort groups by average salary and keep empty clusters visible with count 0.
  const sums = new Array(k).fill(0);
  const counts = new Array(k).fill(0);
  values.forEach((value, index) => {
    let best = 0;
    for (let c = 1; c < k; c++) {
      if (Math.abs(value - centroids[c]) < Math.abs(value - centroids[best])) best = c;
    }
    sums[best] += value;
    counts[best]++;
  });
  return centroids.map((centroid, c) => ({
    centroid: counts[c] ? sums[c] / counts[c] : centroid,
    count: counts[c]
  })).sort((a, b) => a.centroid - b.centroid);
}

app.get('/api/employees/salary-clusters', requireAuth, (_req, res) => {
  const salaries = employees.map(employee => Number(employee.salary)).filter(Number.isFinite);
  if (salaries.length < 3) {
    return res.status(400).json({ success: false, message: 'At least 3 employees with valid salaries are required.' });
  }
  try {
    const clusters = kMeans1D(salaries, 3).map((cluster, index) => ({
      group: `Tier ${index + 1}`,
      centroid: Math.round(cluster.centroid * 100) / 100,
      count: cluster.count
    }));
    return res.status(200).json({ success: true, employeeCount: salaries.length, clusters });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not analyze salaries.', detail: error.message });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HR Manager API running on http://localhost:${PORT}`);
});
