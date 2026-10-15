# HR Manager & Salary Analytics System

Full-stack Internet Programming final exam project:
- Backend: Node.js + Express.js
- Frontend: React Native + Expo
- Login, employee CRUD, and 1D K-Means salary clustering (k=3)
- Employee data is stored in an in-memory array as required by the exam.

## Demo login
- Username: `admin`
- Password: `password123`

## Requirements
Install Node.js LTS and Expo Go on your phone, or use an Android emulator.
The frontend must connect to the computer's LAN IP address when testing on a physical phone.

## 1. Start the backend
Open a terminal in `backend` and run:

```bash
npm install
npm start
```

The API runs on `http://localhost:3000`.
Test in a browser: `http://localhost:3000/api/employees`

## 2. Set the frontend API address
Open `frontend/App.js` and edit `API_BASE_URL`:
- Android emulator: `http://10.0.2.2:3000/api`
- iOS simulator: `http://localhost:3000/api`
- Physical phone: `http://YOUR_COMPUTER_LAN_IP:3000/api` (phone and computer on same Wi-Fi)
- Web preview on same computer: `http://localhost:3000/api`

To find Windows LAN IP, run `ipconfig` and look for IPv4 Address under the active Wi-Fi adapter.

## 3. Start the frontend
Open a second terminal in `frontend` and run:

```bash
npm install
npx expo start
```

Scan the QR code using Expo Go, or press `a` for Android emulator. Ensure `API_BASE_URL` points to the correct host.

## API endpoints
- `POST /api/login` `{ "username": "admin", "password": "password123" }`
- `GET /api/employees`
- `POST /api/employees` `{ "name": "...", "position": "...", "salary": 45000 }`
- `PUT /api/employees/:id/status`
- `DELETE /api/employees/:id`
- `GET /api/employees/salary-clusters`

## Notes
- The login token is a mock token because the exam explicitly asks for one.
- The token is checked by middleware for employee and analytics endpoints.
- Data resets to the five sample employees whenever the backend restarts.
- For submission, rename the root folder/repository to `Std` + your actual 7-digit student ID + `IPFinal2026`.
