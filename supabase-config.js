// =============================================
// SUPABASE CONFIGURATION
// Replace these with your actual project credentials.
// Find them at: Supabase Dashboard → Project Settings → API
// =============================================
const SUPABASE_URL  = 'https://ikeujqaqmwmvkyhjqdmv.supabase.co';        // e.g. https://abcxyz.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZXVqcWFxbXdtdmt5aGpxZG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTEyNDgsImV4cCI6MjA4NzE2NzI0OH0.Bs1sQ1EGTRdGeWOODg3vVPerjmHoQy3DkqmASX-yY9k'; // anon / public key

// Initialize Supabase client (uses UMD global loaded from CDN)
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expose globally so HTML pages can use real-time subscriptions
window._supabase = _sb;

// =============================================
// ROW ↔ JS OBJECT MAPPING
// SQL uses snake_case; JS objects use camelCase
// =============================================
function rowToBooking(r) {
  return {
    ref:           r.ref,
    fullName:      r.full_name,
    contactNumber: r.contact_number,
    email:         r.email,
    courtId:       r.court_id,
    courtName:     r.court_name,
    date:          r.date,
    slots:         r.slots || [],
    startTime:     r.start_time,
    endTime:       r.end_time,
    duration:      r.duration,
    rate:          r.rate,
    total:         r.total,
    paymentMethod: r.payment_method,
    status:        r.status,
    createdAt:     r.created_at,
  };
}

function bookingToRow(b) {
  return {
    ref:            b.ref,
    full_name:      b.fullName,
    contact_number: b.contactNumber,
    email:          b.email,
    court_id:       b.courtId,
    court_name:     b.courtName,
    date:           b.date,
    slots:          b.slots,
    start_time:     b.startTime,
    end_time:       b.endTime,
    duration:       b.duration,
    rate:           b.rate,
    total:          b.total,
    payment_method: b.paymentMethod,
    status:         b.status,
    created_at:     b.createdAt,
  };
}

function rowToCourt(r) {
  return {
    id:      r.id,
    name:    r.name,
    desc:    r.description,
    rate:    r.rate,
    blocked: r.blocked,
    feats:   r.feats || [],
    photo:   r.photo || '',
  };
}

function courtToRow(c) {
  return {
    id:          c.id,
    name:        c.name,
    description: c.desc,
    rate:        c.rate,
    blocked:     c.blocked,
    feats:       c.feats || [],
    photo:       c.photo || null,
  };
}

function rowToAccount(r) {
  return {
    id:        r.id,
    username:  r.username,
    password:  r.password,
    role:      r.role,
    fullName:  r.full_name,
    email:     r.email,
    createdAt: r.created_at,
  };
}

function accountToRow(a) {
  return {
    id:         a.id,
    username:   a.username,
    password:   a.password,
    role:       a.role,
    full_name:  a.fullName,
    email:      a.email,
    created_at: a.createdAt,
  };
}

// =============================================
// DB — Async Data Layer (replaces localStorage)
// =============================================
window.DB = {

  // ---- COURTS ----
  async getCourts() {
    const { data, error } = await _sb.from('courts').select('*').order('id');
    if (error) { console.error('getCourts:', error); return []; }
    return data.map(rowToCourt);
  },

  async saveCourt(court) {
    const { error } = await _sb.from('courts').upsert(courtToRow(court));
    if (error) { console.error('saveCourt:', error); throw error; }
  },

  async deleteCourt(id) {
    const { error } = await _sb.from('courts').delete().eq('id', id);
    if (error) console.error('deleteCourt:', error);
  },

  // ---- BOOKINGS ----
  async getBookings() {
    const { data, error } = await _sb.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) { console.error('getBookings:', error); return []; }
    return data.map(rowToBooking);
  },

  async addBooking(booking) {
    const { error } = await _sb.from('bookings').insert(bookingToRow(booking));
    if (error) { console.error('addBooking:', error); throw error; }
  },

  async updateBooking(ref, updates) {
    // Map only the fields provided (camelCase → snake_case)
    const row = {};
    if (updates.status    !== undefined) row.status = updates.status;
    if (updates.fullName  !== undefined) row.full_name = updates.fullName;
    const { error } = await _sb.from('bookings').update(row).eq('ref', ref);
    if (error) console.error('updateBooking:', error);
  },

  async deleteBooking(ref) {
    const { error } = await _sb.from('bookings').delete().eq('ref', ref);
    if (error) console.error('deleteBooking:', error);
  },

  // ---- BLOCKED DATES ----
  async getBlockedDates() {
    const { data, error } = await _sb.from('blocked_dates').select('date').order('date');
    if (error) { console.error('getBlockedDates:', error); return []; }
    return data.map(r => r.date);
  },

  async addBlockedDate(date) {
    const { error } = await _sb.from('blocked_dates').insert({ date, created_at: new Date().toISOString() });
    if (error) console.error('addBlockedDate:', error);
  },

  async removeBlockedDate(date) {
    const { error } = await _sb.from('blocked_dates').delete().eq('date', date);
    if (error) console.error('removeBlockedDate:', error);
  },

  // ---- ACCOUNTS ----
  async getAccounts() {
    const { data, error } = await _sb.from('accounts').select('*').order('created_at');
    if (error) { console.error('getAccounts:', error); return []; }
    return data.map(rowToAccount);
  },

  async saveAccount(account) {
    const { error } = await _sb.from('accounts').upsert(accountToRow(account));
    if (error) { console.error('saveAccount:', error); throw error; }
  },

  async deleteAccount(id) {
    const { error } = await _sb.from('accounts').delete().eq('id', id);
    if (error) console.error('deleteAccount:', error);
  },

  // ---- SEED DEFAULT DATA (runs once on first load) ----
  async seedDefaultData() {
    const courts = await this.getCourts();
    if (courts.length === 0) {
      await _sb.from('courts').insert([
        { id: 'c1', name: 'Court Alpha', description: 'Outdoor · Air passing through · Standard Flooring', rate: 350, blocked: false, feats: ['Outdoor','Open Air','Standard Floor'], photo: null },
        { id: 'c2', name: 'Court Beta',  description: 'Outdoor · Air passing through · Standard Flooring', rate: 280, blocked: false, feats: ['Outdoor','Open Air','Standard Floor'], photo: null },
      ]);
    }

    const accounts = await this.getAccounts();
    if (accounts.length === 0) {
      await _sb.from('accounts').insert([{
        id: 'dev_001', username: 'developer', password: 'dev123',
        role: 'developer', full_name: 'Super Admin',
        email: 'dev@pickleballhub.com', created_at: new Date().toISOString(),
      }]);
    }
  },
};

// =============================================
// AUTH — Session via sessionStorage
// (No Firebase/Supabase Auth — validates against accounts table)
// =============================================
window.Auth = {

  async login(username, password) {
    const { data, error } = await _sb
      .from('accounts')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();
    if (error || !data) return { ok: false };
    const session = rowToAccount(data);
    session.loginAt = new Date().toISOString();
    sessionStorage.setItem('pb_session', JSON.stringify(session));
    return { ok: true };
  },

  getSession() {
    const s = sessionStorage.getItem('pb_session');
    return s ? JSON.parse(s) : null;
  },

  requireAuth() {
    const sess = this.getSession();
    if (!sess) { window.location.href = 'login.html'; return null; }
    return sess;
  },

  logout() {
    sessionStorage.removeItem('pb_session');
    window.location.href = 'login.html';
  },

  // Used by admin.html account management
  async getAll() {
    return DB.getAccounts();
  },

  async add(d) {
    const all = await DB.getAccounts();
    if (all.find(x => x.username === d.username)) return { ok: false, msg: 'Username taken.' };
    const acc = { id: 'mgr_' + Date.now(), ...d, role: 'manager', createdAt: new Date().toISOString() };
    try { await DB.saveAccount(acc); return { ok: true }; }
    catch(e) { return { ok: false, msg: 'Failed to save.' }; }
  },

  async update(id, d) {
    const all = await DB.getAccounts();
    const existing = all.find(x => x.id === id);
    if (!existing) return { ok: false };
    try { await DB.saveAccount({ ...existing, ...d }); return { ok: true }; }
    catch(e) { return { ok: false }; }
  },

  async del(id) {
    await DB.deleteAccount(id);
    return { ok: true };
  },
};
