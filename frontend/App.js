import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';

// Web on this laptop: localhost. For Android emulator use http://10.0.2.2:3000/api.
const API_BASE_URL = 'http://localhost:3000/api';

const C = {
  primary: '#167A65', primaryDark: '#105B4C', mint: '#DDF4EA', mintSoft: '#F0F8F4',
  bg: '#F4F7F5', surface: '#FFFFFF', ink: '#17332D', muted: '#71817B',
  line: '#E1EAE5', orange: '#C17B2A', orangeSoft: '#FFF3DF', red: '#B84C4C', redSoft: '#FFF0EF',
  blue: '#436D8D', blueSoft: '#EAF2F8', shadow: '#20382F'
};

async function apiRequest(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

function Button({ title, onPress, variant = 'primary', disabled = false, compact = false }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled}
    style={[styles.button, styles[`button_${variant}`], compact && styles.buttonCompact, disabled && styles.disabled]}>
    <Text style={[styles.buttonText, variant !== 'primary' && styles[`buttonText_${variant}`]]}>{title}</Text>
  </TouchableOpacity>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false }) {
  return <View style={styles.field}>
    {!!label && <Text style={styles.label}>{label}</Text>}
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder || label}
      placeholderTextColor="#9BAAA4" keyboardType={keyboardType} secureTextEntry={secureTextEntry}
      autoCapitalize="none" style={styles.input} />
  </View>;
}

function StatCard({ label, value, note, tone = 'green', icon }) {
  return <View style={styles.statCard}>
    <View style={styles.statTop}><Text style={styles.statIcon}>{icon}</Text><Text style={styles.statNote}>{note}</Text></View>
    <Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text>
    <View style={[styles.statAccent, styles[`accent_${tone}`]]} />
  </View>;
}

export default function App() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [adding, setAdding] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [clusters, setClusters] = useState(null);
  const [screenError, setScreenError] = useState('');
  const [notice, setNotice] = useState('');

  const loadEmployees = async (authToken = token) => {
    setLoadingEmployees(true);
    try { const data = await apiRequest('/employees', authToken); setEmployees(data.employees || []); setScreenError(''); }
    catch (error) { setScreenError(error.message); }
    finally { setLoadingEmployees(false); }
  };
  useEffect(() => { if (token) loadEmployees(token); }, [token]);

  const login = async () => {
    if (!username.trim() || !password) { Alert.alert('Missing information', 'Please enter username and password.'); return; }
    setLoggingIn(true);
    try {
      const data = await apiRequest('/login', '', { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) });
      if (data.success && data.token) setToken(data.token); else Alert.alert('Login failed', 'Please check your credentials.');
    } catch (error) { Alert.alert('Login failed', `${error.message}. Make sure the backend is running on port 3000.`); }
    finally { setLoggingIn(false); }
  };

  const addEmployee = async () => {
    if (!name.trim() || !position.trim() || salary.trim() === '') { Alert.alert('Missing information', 'Please fill in name, position, and salary.'); return; }
    const numericSalary = Number(salary);
    if (!Number.isFinite(numericSalary) || numericSalary < 0) { Alert.alert('Invalid salary', 'Salary must be a valid non-negative number.'); return; }
    setAdding(true);
    try {
      await apiRequest('/employees', token, { method: 'POST', body: JSON.stringify({ name: name.trim(), position: position.trim(), salary: numericSalary }) });
      setName(''); setPosition(''); setSalary(''); setClusters(null); setNotice('Employee added successfully.');
      await loadEmployees();
    } catch (error) { Alert.alert('Could not add employee', error.message); }
    finally { setAdding(false); }
  };

  const toggleStatus = async (employee) => {
    try { await apiRequest(`/employees/${employee.id}/status`, token, { method: 'PUT' }); setClusters(null); setNotice(`Updated ${employee.name}'s status.`); await loadEmployees(); }
    catch (error) { Alert.alert('Error', error.message); }
  };

  const performDelete = async (employee) => {
    try { await apiRequest(`/employees/${employee.id}`, token, { method: 'DELETE' }); setClusters(null); setNotice(`${employee.name} was removed.`); await loadEmployees(); }
    catch (error) { Alert.alert('Delete failed', error.message); }
  };
  const deleteEmployee = (employee) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Delete ${employee.name}? This action cannot be undone.`)) performDelete(employee);
      return;
    }
    Alert.alert('Confirm delete', `Are you sure you want to delete ${employee.name}?`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => performDelete(employee) }
    ]);
  };

  const analyzeSalaries = async () => {
    setAnalyzing(true); setClusters(null);
    try { const data = await apiRequest('/employees/salary-clusters', token); setClusters(data.clusters || []); setNotice('Salary analysis completed using K-Means (k = 3).'); }
    catch (error) { Alert.alert('Analysis failed', error.message); }
    finally { setAnalyzing(false); }
  };

  const activeCount = employees.filter(e => e.status === 'Active').length;
  const leaveCount = employees.filter(e => e.status === 'On Leave').length;
  const payroll = employees.reduce((sum, e) => sum + Number(e.salary || 0), 0);
  const averageSalary = employees.length ? payroll / employees.length : 0;
  const visibleEmployees = useMemo(() => employees.filter(e => {
    const matchesQuery = `${e.name} ${e.position}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === 'All' || e.status === filter;
    return matchesQuery && matchesFilter;
  }), [employees, query, filter]);

  if (!token) return <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" />
    <ScrollView contentContainerStyle={styles.loginPage}>
      <View style={styles.loginLayout}>
        <View style={styles.loginBrand}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>h.</Text></View>
          <Text style={styles.brandEyebrow}>PEOPLE FIRST · DATA SMART</Text>
          <Text style={styles.loginTitle}>A better way to{ '\n' }manage your people.</Text>
          <Text style={styles.loginDescription}>A clear view of your team, employee status, and salary insights — all in one place.</Text>
          <View style={styles.loginMiniStats}><View><Text style={styles.miniNumber}>01</Text><Text style={styles.miniLabel}>People</Text></View><View><Text style={styles.miniNumber}>02</Text><Text style={styles.miniLabel}>Operations</Text></View><View><Text style={styles.miniNumber}>03</Text><Text style={styles.miniLabel}>Insights</Text></View></View>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginCard}>
          <View style={styles.loginCardTop}><Text style={styles.kicker}>WELCOME BACK</Text><Text style={styles.loginCardTitle}>Sign in to HR Manager</Text><Text style={styles.muted}>Enter your account details to continue.</Text></View>
          <Field label="USERNAME" value={username} onChangeText={setUsername} placeholder="Enter username" />
          <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
          <Button title={loggingIn ? 'Signing in…' : 'Sign in to workspace  →'} onPress={login} disabled={loggingIn} />
          {loggingIn && <ActivityIndicator color={C.primary} style={{ marginTop: 12 }} />}
          <View style={styles.demoBox}><Text style={styles.demoLabel}>DEMO ACCOUNT</Text><Text style={styles.demoText}>Username <Text style={styles.demoStrong}>admin</Text>  ·  Password <Text style={styles.demoStrong}>password123</Text></Text></View>
          <Text style={styles.loginFoot}>HR MANAGER · EMPLOYEE & SALARY ANALYTICS</Text>
        </KeyboardAvoidingView>
      </View>
    </ScrollView>
  </SafeAreaView>;

  return <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" />
    <View style={styles.appLayout}>
      <View style={styles.sidebar}>
        <View style={styles.sidebarBrand}><View style={styles.sidebarMark}><Text style={styles.sidebarMarkText}>h.</Text></View><View><Text style={styles.sidebarBrandTitle}>humanly</Text><Text style={styles.sidebarBrandSub}>HR WORKSPACE</Text></View></View>
        <Text style={styles.navCaption}>WORKSPACE</Text>
        <View style={styles.navItemActive}><Text style={styles.navIcon}>▦</Text><Text style={styles.navTextActive}>Overview</Text></View>
        <View style={styles.navItem}><Text style={styles.navIcon}>♙</Text><Text style={styles.navText}>Employees</Text></View>
        <View style={styles.navItem}><Text style={styles.navIcon}>◷</Text><Text style={styles.navText}>Salary insights</Text></View>
        <View style={styles.sidebarBottom}><View style={styles.sidebarAvatar}><Text style={styles.sidebarAvatarText}>HR</Text></View><View style={{ flex: 1 }}><Text style={styles.sidebarUser}>HR Administrator</Text><Text style={styles.sidebarUserSub}>Workspace admin</Text></View><TouchableOpacity onPress={() => { setToken(''); setClusters(null); setNotice(''); }}><Text style={styles.logoutIcon}>↪</Text></TouchableOpacity></View>
      </View>
      <FlatList data={visibleEmployees} keyExtractor={item => item.id} style={styles.mainScroll} contentContainerStyle={styles.mainPage}
        ListHeaderComponent={<View>
          <View style={styles.pageTop}><View><Text style={styles.breadcrumb}>WORKSPACE  /  OVERVIEW</Text><Text style={styles.pageTitle}>Good to see you, Admin <Text style={styles.wave}>✦</Text></Text><Text style={styles.pageSubtitle}>Here’s what’s happening with your people today.</Text></View><View style={styles.topActions}><View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE DATA</Text></View><Button title="↻  Refresh" variant="outline" compact onPress={() => loadEmployees()} /></View></View>
          {!!screenError && <View style={styles.errorBanner}><Text style={styles.errorText}>{screenError}</Text><Button title="Retry" variant="outline" compact onPress={() => loadEmployees()} /></View>}
          {!!notice && <TouchableOpacity style={styles.notice} onPress={() => setNotice('')}><Text style={styles.noticeText}>✓  {notice}</Text><Text style={styles.noticeClose}>×</Text></TouchableOpacity>}
          <View style={styles.statsGrid}>
            <StatCard label="Total employees" value={employees.length} note="TEAM SIZE" icon="♙" tone="green" />
            <StatCard label="Active employees" value={activeCount} note={`${employees.length ? Math.round(activeCount / employees.length * 100) : 0}% OF TEAM`} icon="✓" tone="blue" />
            <StatCard label="On leave" value={leaveCount} note="CURRENTLY AWAY" icon="◷" tone="orange" />
            <StatCard label="Monthly payroll" value={`฿${payroll.toLocaleString('en-US')}`} note={`AVG. ฿${Math.round(averageSalary).toLocaleString('en-US')}`} icon="฿" tone="purple" />
          </View>
          <View style={styles.contentGrid}>
            <View style={styles.formCard}>
              <View style={styles.cardHeadingRow}><View><Text style={styles.kicker}>TEAM MANAGEMENT</Text><Text style={styles.sectionTitle}>Add a teammate</Text></View><View style={styles.addIcon}><Text style={styles.addIconText}>＋</Text></View></View>
              <Text style={styles.cardDescription}>Create an employee record and add them to your team.</Text>
              <Field label="FULL NAME" value={name} onChangeText={setName} placeholder="e.g. Taylor Green" />
              <Field label="JOB TITLE" value={position} onChangeText={setPosition} placeholder="e.g. Product Designer" />
              <Field label="MONTHLY SALARY (THB)" value={salary} onChangeText={setSalary} placeholder="e.g. 35000" keyboardType="decimal-pad" />
              <Button title={adding ? 'Adding teammate…' : '＋  Add employee'} onPress={addEmployee} disabled={adding} />
            </View>
            <View style={styles.insightCard}>
              <View style={styles.cardHeadingRow}><View><Text style={styles.kicker}>SMART ANALYTICS</Text><Text style={styles.sectionTitle}>Salary structure</Text></View><View style={styles.sparkleIcon}><Text style={styles.sparkleText}>✦</Text></View></View>
              <Text style={styles.cardDescription}>Discover salary patterns by grouping employee salaries with 1D K-Means clustering (k = 3).</Text>
              <View style={styles.analyticsPreview}><View style={styles.previewBarGroup}><View style={[styles.previewBar, { height: 25, backgroundColor: '#9FD7C4' }]} /><View style={[styles.previewBar, { height: 42, backgroundColor: '#58B69A' }]} /><View style={[styles.previewBar, { height: 58, backgroundColor: C.primary }]} /><View style={[styles.previewBar, { height: 35, backgroundColor: '#B4D8CD' }]} /><View style={[styles.previewBar, { height: 48, backgroundColor: '#70C2AA' }]} /></View><View style={{ flex: 1 }}><Text style={styles.previewTitle}>Make data-driven decisions</Text><Text style={styles.previewSubtitle}>Compare salary groups and employee counts.</Text></View></View>
              <Button title={analyzing ? 'Analyzing salaries…' : '✦  Analyze salary structure'} onPress={analyzeSalaries} disabled={analyzing} />
              {analyzing && <View style={styles.loadingRow}><ActivityIndicator color={C.primary} /><Text style={styles.muted}>Calculating clusters…</Text></View>}
              {!!clusters && <View style={styles.clusterResults}><View style={styles.resultHeading}><Text style={styles.resultTitle}>Analysis results</Text><Text style={styles.resultMeta}>{employees.length} employees</Text></View>{clusters.map((cluster, index) => {
                const max = Math.max(...clusters.map(c => Number(c.centroid) || 0), 1);
                const labels = ['Lower salary', 'Mid salary', 'Higher salary'];
                const colors = ['#8FCDB8', '#3D9F82', C.primaryDark];
                return <View key={cluster.group} style={styles.clusterRow}><View style={[styles.clusterDot, { backgroundColor: colors[index] }]} /><View style={{ flex: 1 }}><View style={styles.clusterLabelRow}><Text style={styles.clusterName}>{labels[index] || cluster.group}</Text><Text style={styles.clusterCount}>{cluster.count} people</Text></View><View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(3, (Number(cluster.centroid) / max) * 100)}%`, backgroundColor: colors[index] }]} /></View><Text style={styles.clusterSalary}>฿{Number(cluster.centroid).toLocaleString('en-US', { maximumFractionDigits: 2 })} <Text style={styles.perMonth}>average / month</Text></Text></View></View>;
              })}<Text style={styles.analysisFoot}>Groups are ordered by the calculated average salary.</Text></View>}
            </View>
          </View>
          <View style={styles.directoryHeader}><View><Text style={styles.kicker}>YOUR PEOPLE</Text><Text style={styles.sectionTitle}>Employee directory</Text><Text style={styles.cardDescription}>Search, review status, and manage employee records.</Text></View><View style={styles.directoryCount}><Text style={styles.directoryCountNumber}>{visibleEmployees.length}</Text><Text style={styles.directoryCountLabel}>SHOWING</Text></View></View>
          <View style={styles.filtersRow}><View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search name or job title…" placeholderTextColor="#9BAAA4" style={styles.searchInput} /></View><View style={styles.filterPills}>{['All', 'Active', 'On Leave'].map(item => <TouchableOpacity key={item} onPress={() => setFilter(item)} style={[styles.filterPill, filter === item && styles.filterPillActive]}><Text style={[styles.filterPillText, filter === item && styles.filterPillTextActive]}>{item}</Text></TouchableOpacity>)}</View></View>
          {loadingEmployees && <ActivityIndicator size="small" color={C.primary} style={{ marginBottom: 12 }} />}
        </View>}
        renderItem={({ item, index }) => <View style={styles.employeeCard}>
          <View style={[styles.employeeAvatar, { backgroundColor: [C.mint, C.blueSoft, '#F5EAF7', C.orangeSoft][index % 4] }]}><Text style={[styles.employeeAvatarText, { color: [C.primary, C.blue, '#9361A4', C.orange][index % 4] }]}>{item.name.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.employeeInfo}><Text style={styles.employeeName}>{item.name}</Text><Text style={styles.employeePosition}>{item.position}</Text></View>
          <View style={styles.employeeSalaryWrap}><Text style={styles.employeeSalary}>฿{Number(item.salary).toLocaleString('en-US')}</Text><Text style={styles.employeeSalaryCaption}>PER MONTH</Text></View>
          <View style={[styles.statusPill, item.status === 'Active' ? styles.activePill : styles.leavePill]}><View style={[styles.statusDot, item.status === 'Active' ? styles.activeDot : styles.leaveDot]} /><Text style={[styles.statusText, item.status === 'Active' ? styles.activeText : styles.leaveText]}>{item.status}</Text></View>
          <View style={styles.employeeActions}><Button title="Change status" variant="soft" compact onPress={() => toggleStatus(item)} /><Button title="Delete" variant="danger" compact onPress={() => deleteEmployee(item)} /></View>
        </View>}
        ListEmptyComponent={!loadingEmployees ? <View style={styles.emptyState}><Text style={styles.emptyIcon}>⌕</Text><Text style={styles.emptyTitle}>No employees found</Text><Text style={styles.muted}>Try another search or change the status filter.</Text></View> : null}
        ListFooterComponent={<View style={styles.footer}><Text style={styles.footerBrand}>humanly <Text style={styles.footerDot}>●</Text></Text><Text style={styles.footerText}>HR MANAGER · SALARY ANALYTICS · DEMO WORKSPACE</Text></View>}
      />
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  loginPage: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: C.bg },
  loginLayout: { width: '100%', maxWidth: 1120, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 34, alignItems: 'center', justifyContent: 'center' },
  loginBrand: { flex: 1, minWidth: 280, maxWidth: 510, paddingVertical: 30 },
  brandMark: { width: 58, height: 58, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  brandMarkText: { color: '#fff', fontWeight: '900', fontSize: 29, letterSpacing: -2 },
  brandEyebrow: { color: C.primary, fontSize: 11, fontWeight: '900', letterSpacing: 2.2, marginBottom: 18 },
  loginTitle: { fontSize: 43, lineHeight: 50, fontWeight: '900', color: C.ink, letterSpacing: -1.5 },
  loginDescription: { color: C.muted, fontSize: 15, lineHeight: 25, maxWidth: 420, marginTop: 18 },
  loginMiniStats: { flexDirection: 'row', gap: 42, marginTop: 38 },
  miniNumber: { color: C.primary, fontSize: 19, fontWeight: '900' }, miniLabel: { color: C.muted, fontSize: 11, marginTop: 5 },
  loginCard: { width: '100%', maxWidth: 440, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 24, padding: 30, shadowColor: C.shadow, shadowOpacity: 0.06, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  loginCardTop: { marginBottom: 18 }, kicker: { fontSize: 10, fontWeight: '900', color: C.primary, letterSpacing: 1.6, marginBottom: 7 },
  loginCardTitle: { fontSize: 23, color: C.ink, fontWeight: '900', letterSpacing: -0.5, marginBottom: 7 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 18 }, field: { marginTop: 13, marginBottom: 3 },
  label: { color: '#52645D', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: C.line, backgroundColor: '#FBFDFC', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, color: C.ink, fontSize: 14, outlineStyle: 'none' },
  button: { backgroundColor: C.primary, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '900' }, button_outline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.line }, buttonText_outline: { color: C.ink },
  button_soft: { backgroundColor: C.mint }, buttonText_soft: { color: C.primaryDark }, button_danger: { backgroundColor: C.redSoft }, buttonText_danger: { color: C.red },
  buttonCompact: { paddingHorizontal: 11, paddingVertical: 8, marginTop: 0, borderRadius: 9 }, disabled: { opacity: 0.55 },
  demoBox: { backgroundColor: C.mintSoft, borderRadius: 12, padding: 13, marginTop: 20 }, demoLabel: { color: C.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7 }, demoText: { color: C.muted, fontSize: 11 }, demoStrong: { color: C.ink, fontWeight: '900' },
  loginFoot: { color: '#9AA8A1', fontSize: 8, fontWeight: '800', letterSpacing: 1.1, textAlign: 'center', marginTop: 23 },
  appLayout: { flex: 1, flexDirection: 'row' }, sidebar: { width: 224, backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: C.line, paddingHorizontal: 17, paddingTop: 25, paddingBottom: 16 },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 42, paddingHorizontal: 5 }, sidebarMark: { width: 39, height: 39, borderRadius: 13, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }, sidebarMarkText: { color: '#fff', fontWeight: '900', fontSize: 23 },
  sidebarBrandTitle: { color: C.ink, fontSize: 17, fontWeight: '900', letterSpacing: -0.6 }, sidebarBrandSub: { color: '#91A19A', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 }, navCaption: { color: '#A2AFA9', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginHorizontal: 10, marginBottom: 12 },
  navItemActive: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.mintSoft, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 6 }, navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 6 }, navIcon: { color: C.primary, fontSize: 17, width: 18, textAlign: 'center' }, navTextActive: { color: C.primaryDark, fontWeight: '900', fontSize: 12 }, navText: { color: C.muted, fontWeight: '700', fontSize: 12 },
  sidebarBottom: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 9 }, sidebarAvatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }, sidebarAvatarText: { color: C.primary, fontSize: 10, fontWeight: '900' }, sidebarUser: { color: C.ink, fontSize: 10, fontWeight: '900' }, sidebarUserSub: { color: C.muted, fontSize: 9, marginTop: 3 }, logoutIcon: { color: C.muted, fontSize: 19, paddingHorizontal: 4 },
  mainScroll: { flex: 1 }, mainPage: { paddingHorizontal: 30, paddingTop: 27, paddingBottom: 25, maxWidth: 1600, width: '100%', alignSelf: 'center' }, pageTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 23 }, breadcrumb: { color: '#9AA9A1', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 9 }, pageTitle: { color: C.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.8 }, wave: { color: C.primary, fontSize: 20 }, pageSubtitle: { color: C.muted, fontSize: 12, marginTop: 7 }, topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.mintSoft, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 9 }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#299A73' }, liveText: { color: C.primaryDark, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, marginBottom: 19 }, statCard: { flexGrow: 1, flexBasis: 180, minWidth: 150, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, overflow: 'hidden' }, statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, statIcon: { color: C.primary, backgroundColor: C.mintSoft, overflow: 'hidden', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, fontSize: 15, fontWeight: '900' }, statNote: { color: '#A1AEA8', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }, statValue: { color: C.ink, fontSize: 25, fontWeight: '900', marginTop: 15, letterSpacing: -0.7 }, statLabel: { color: C.muted, fontSize: 11, marginTop: 4 }, statAccent: { height: 3, width: 34, borderRadius: 3, marginTop: 15 }, accent_green: { backgroundColor: C.primary }, accent_blue: { backgroundColor: C.blue }, accent_orange: { backgroundColor: C.orange }, accent_purple: { backgroundColor: '#9361A4' },
  contentGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 16, marginBottom: 26 }, formCard: { flex: 1, flexBasis: 300, minWidth: 280, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 19 }, insightCard: { flex: 1.15, flexBasis: 330, minWidth: 280, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 19 }, cardHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: C.ink, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 }, cardDescription: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 7, marginBottom: 8 }, addIcon: { backgroundColor: C.mintSoft, borderRadius: 11, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, addIconText: { color: C.primary, fontSize: 21, fontWeight: '500' }, sparkleIcon: { backgroundColor: '#F2F0FB', borderRadius: 11, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, sparkleText: { color: '#8067B2', fontSize: 17 },
  analyticsPreview: { backgroundColor: C.mintSoft, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, marginBottom: 2 }, previewBarGroup: { height: 65, flexDirection: 'row', alignItems: 'flex-end', gap: 5 }, previewBar: { width: 9, borderRadius: 5 }, previewTitle: { color: C.ink, fontSize: 11, fontWeight: '900' }, previewSubtitle: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 5 }, loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13 }, clusterResults: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 17, paddingTop: 15 }, resultHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, resultTitle: { color: C.ink, fontSize: 12, fontWeight: '900' }, resultMeta: { color: C.muted, fontSize: 10 }, clusterRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 13 }, clusterDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 }, clusterLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, clusterName: { color: C.ink, fontSize: 11, fontWeight: '900' }, clusterCount: { color: C.muted, fontSize: 10 }, barTrack: { height: 5, borderRadius: 4, backgroundColor: '#EDF2EF', overflow: 'hidden', marginTop: 7 }, barFill: { height: 5, borderRadius: 4 }, clusterSalary: { color: C.ink, fontSize: 12, fontWeight: '900', marginTop: 6 }, perMonth: { color: C.muted, fontSize: 9, fontWeight: '500' }, analysisFoot: { color: '#96A49D', fontSize: 9, marginTop: 1 },
  directoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 15, marginBottom: 13 }, directoryCount: { backgroundColor: C.mintSoft, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' }, directoryCountNumber: { color: C.primary, fontWeight: '900', fontSize: 17 }, directoryCountLabel: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 }, filtersRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }, searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, flex: 1, minWidth: 220 }, searchIcon: { color: '#8EA097', fontSize: 22, marginRight: 8 }, searchInput: { flex: 1, minWidth: 0, paddingVertical: 10, color: C.ink, fontSize: 11, outlineStyle: 'none' }, filterPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, filterPill: { borderWidth: 1, borderColor: C.line, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: C.surface }, filterPillActive: { borderColor: C.primary, backgroundColor: C.mintSoft }, filterPillText: { color: C.muted, fontSize: 10, fontWeight: '800' }, filterPillTextActive: { color: C.primaryDark },
  employeeCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, employeeAvatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, employeeAvatarText: { fontSize: 16, fontWeight: '900' }, employeeInfo: { flex: 1, minWidth: 115 }, employeeName: { color: C.ink, fontSize: 12, fontWeight: '900' }, employeePosition: { color: C.muted, fontSize: 10, marginTop: 4 }, employeeSalaryWrap: { minWidth: 95 }, employeeSalary: { color: C.ink, fontSize: 12, fontWeight: '900' }, employeeSalaryCaption: { color: '#9BAAA4', fontSize: 8, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 }, statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 7 }, activePill: { backgroundColor: C.mintSoft }, leavePill: { backgroundColor: C.orangeSoft }, statusDot: { width: 6, height: 6, borderRadius: 3 }, activeDot: { backgroundColor: C.primary }, leaveDot: { backgroundColor: C.orange }, statusText: { fontSize: 9, fontWeight: '900' }, activeText: { color: C.primaryDark }, leaveText: { color: C.orange }, employeeActions: { flexDirection: 'row', gap: 7 },
  emptyState: { alignItems: 'center', padding: 35, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line }, emptyIcon: { color: C.primary, fontSize: 25, marginBottom: 7 }, emptyTitle: { color: C.ink, fontSize: 13, fontWeight: '900', marginBottom: 5 }, footer: { paddingTop: 26, paddingBottom: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, footerBrand: { color: C.primaryDark, fontWeight: '900', fontSize: 11 }, footerDot: { color: '#70BFA5', fontSize: 8 }, footerText: { color: '#A2AFA9', fontSize: 8, fontWeight: '800', letterSpacing: 1 }, errorBanner: { backgroundColor: C.redSoft, borderRadius: 10, padding: 12, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, errorText: { color: C.red, fontSize: 11, flex: 1 }, notice: { backgroundColor: C.mintSoft, borderWidth: 1, borderColor: '#CDE9DD', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 13, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, noticeText: { color: C.primaryDark, fontSize: 11, fontWeight: '800' }, noticeClose: { color: C.primary, fontSize: 18, marginLeft: 8 }
});
