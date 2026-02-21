/* ============================================================
   auth.js — Authentication & Role Management
   ============================================================ */

const Auth = (() => {
  // Default accounts stored in localStorage under 'pb_accounts'
  const DEFAULT_ACCOUNTS = [
    {
      id: 'dev_001',
      username: 'developer',
      password: 'dev123',
      role: 'developer',
      fullName: 'Super Admin',
      email: 'dev@pickleballhub.com',
      createdAt: new Date().toISOString(),
    },
  ];

  // Initialize accounts if not already set
  function initAccounts() {
    if (!localStorage.getItem('pb_accounts')) {
      localStorage.setItem('pb_accounts', JSON.stringify(DEFAULT_ACCOUNTS));
    }
  }

  // Get all accounts
  function getAccounts() {
    initAccounts();
    return JSON.parse(localStorage.getItem('pb_accounts')) || [];
  }

  // Save accounts
  function saveAccounts(accounts) {
    localStorage.setItem('pb_accounts', JSON.stringify(accounts));
  }

  // Login — returns {success, user, message}
  function login(username, password) {
    const accounts = getAccounts();
    const user = accounts.find(
      (a) => a.username === username && a.password === password
    );
    if (!user) {
      return { success: false, message: 'Invalid username or password.' };
    }
    // Store session
    localStorage.setItem('pb_session', JSON.stringify({ ...user, loginAt: new Date().toISOString() }));
    return { success: true, user };
  }

  // Logout
  function logout() {
    localStorage.removeItem('pb_session');
    window.location.href = 'login.html';
  }

  // Get current session
  function getSession() {
    const s = localStorage.getItem('pb_session');
    return s ? JSON.parse(s) : null;
  }

  // Check if logged in; redirect if not
  function requireAuth(redirectTo = 'login.html') {
    if (!getSession()) {
      window.location.href = redirectTo;
      return null;
    }
    return getSession();
  }

  // Check if user has required role
  function hasRole(role) {
    const session = getSession();
    if (!session) return false;
    if (session.role === 'developer') return true; // developer has all access
    return session.role === role;
  }

  // Add manager account (developer only)
  function addManager(data) {
    const accounts = getAccounts();
    const exists = accounts.find((a) => a.username === data.username);
    if (exists) return { success: false, message: 'Username already exists.' };
    const newAccount = {
      id: 'mgr_' + Date.now(),
      username: data.username,
      password: data.password,
      role: 'manager',
      fullName: data.fullName,
      email: data.email,
      createdAt: new Date().toISOString(),
    };
    accounts.push(newAccount);
    saveAccounts(accounts);
    return { success: true, account: newAccount };
  }

  // Update account
  function updateAccount(id, data) {
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.id === id);
    if (idx === -1) return { success: false, message: 'Account not found.' };
    accounts[idx] = { ...accounts[idx], ...data };
    saveAccounts(accounts);
    return { success: true };
  }

  // Delete account
  function deleteAccount(id) {
    const accounts = getAccounts().filter((a) => a.id !== id);
    saveAccounts(accounts);
    return { success: true };
  }

  // Expose public API
  return { login, logout, getSession, requireAuth, hasRole, getAccounts, addManager, updateAccount, deleteAccount, initAccounts };
})();
