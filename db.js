// ═══════════════════════════════════════════════════
//  FLAVOR HOUSE — Firebase Backend
//  No schema, no RLS, no column issues. Just works.
// ═══════════════════════════════════════════════════

// ── YOUR FIREBASE CONFIG ───────────────────────────
// Go to: console.firebase.google.com
// Create project → Add Web App → Copy config here
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyD0fFEilVq5sJud3E2nzTEZ9wezpim3o7k",
  authDomain:        "system-fb58f.firebaseapp.com",
  projectId:         "system-fb58f",
  storageBucket:     "system-fb58f.firebasestorage.app",
  messagingSenderId: "206434677599",
  appId:             "1:206434677599:web:6ab4658982fa9942dcbcea"
};

// ── FIREBASE INIT ──────────────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const firestore = firebase.firestore();
const auth      = firebase.auth();

// ── ORDER NUMBER COUNTER ───────────────────────────
async function getNextOrderNumber() {
  const ref = firestore.collection('meta').doc('counters');
  return firestore.runTransaction(async tx => {
    const doc = await tx.get(ref);
    const next = doc.exists ? (doc.data().order_number || 0) + 1 : 1;
    tx.set(ref, { order_number: next }, { merge: true });
    return next;
  });
}

// ═══════════════════════════════════════════════════
//  DB API — same interface as before
// ═══════════════════════════════════════════════════
const DB = {

  // ── MENU ──────────────────────────────────────────
  async getMenuItems() {
    const snap = await firestore.collection('menu_items')
      .orderBy('sort_order', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getCategories() {
    const snap = await firestore.collection('categories')
      .orderBy('sort_order', 'asc').get();
    // Always include an "All" placeholder at front
    const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return [{ id: null, name: 'All', name_ar: 'الكل', icon: '✨' }, ...cats];
  },

  async upsertMenuItem(item) {
    const { id, categories: _c, ...data } = item;
    data.updated_at = firebase.firestore.FieldValue.serverTimestamp();
    if (id) {
      await firestore.collection('menu_items').doc(id).set(data, { merge: true });
      const snap = await firestore.collection('menu_items').doc(id).get();
      const saved = { id: snap.id, ...snap.data() };
      // Attach category name for rendering
      if (saved.category_id) {
        const catSnap = await firestore.collection('categories').doc(saved.category_id).get();
        if (catSnap.exists) saved.categories = catSnap.data();
      }
      return saved;
    } else {
      data.created_at = firebase.firestore.FieldValue.serverTimestamp();
      data.sort_order = data.sort_order || 999;
      const ref = await firestore.collection('menu_items').add(data);
      const snap = await ref.get();
      const saved = { id: snap.id, ...snap.data() };
      if (saved.category_id) {
        const catSnap = await firestore.collection('categories').doc(saved.category_id).get();
        if (catSnap.exists) saved.categories = catSnap.data();
      }
      return saved;
    }
  },

  async deleteMenuItem(id) {
    await firestore.collection('menu_items').doc(id).delete();
  },

  async toggleMenuItemAvailability(id, available) {
    await firestore.collection('menu_items').doc(id).update({ available });
  },

  // ── ORDERS ─────────────────────────────────────────
  async insertOrder(order) {
    const order_number = await getNextOrderNumber();
    const data = {
      ...order,
      order_number,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      updated_at: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await firestore.collection('orders').add(data);
    return { id: ref.id, ...data, order_number };
  },

  async getOrders(limit = 200) {
    const snap = await firestore.collection('orders')
      .orderBy('created_at', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async updateOrderStatus(id, status) {
    await firestore.collection('orders').doc(id).update({
      status,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async getOrderById(id) {
    const snap = await firestore.collection('orders').doc(id).get();
    if (!snap.exists) throw new Error('Order not found');
    return { id: snap.id, ...snap.data() };
  },

  // ── TABLES ─────────────────────────────────────────
  async getTables() {
    const snap = await firestore.collection('tables')
      .orderBy('table_number', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async upsertTable(data) {
    const { id, ...rest } = data;
    if (id) {
      await firestore.collection('tables').doc(id).set(rest, { merge: true });
      const snap = await firestore.collection('tables').doc(id).get();
      return { id: snap.id, ...snap.data() };
    } else {
      const ref = await firestore.collection('tables').add(rest);
      const snap = await ref.get();
      return { id: snap.id, ...snap.data() };
    }
  },

  async deleteTable(id) {
    await firestore.collection('tables').doc(id).delete();
  },

  // ── SETTINGS ───────────────────────────────────────
  async getSettings() {
    const snap = await firestore.collection('settings').doc('main').get();
    return snap.exists ? snap.data() : {};
  },

  async updateSetting(key, value) {
    await firestore.collection('settings').doc('main')
      .set({ [key]: value }, { merge: true });
  },

  // ── COUPONS ────────────────────────────────────────
  async validateCoupon(code) {
    const snap = await firestore.collection('coupons')
      .where('code', '==', code.toUpperCase())
      .where('active', '==', true)
      .limit(1).get();
    if (snap.empty) return null;
    const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() };
    if (coupon.max_uses && coupon.uses >= coupon.max_uses) return null;
    if (coupon.expires_at && coupon.expires_at.toDate() < new Date()) return null;
    return coupon;
  },

  async incrementCouponUse(id) {
    await firestore.collection('coupons').doc(id).update({
      uses: firebase.firestore.FieldValue.increment(1)
    });
  },

  // ── AUTH (hardcoded bypass) ─────────────────────────
  async signIn(email, password) {
    // Hardcoded admin: admin / admin123
    if (email === 'admin' && password === 'admin123') return { user: { email: 'admin' } };
    throw new Error('Invalid credentials');
  },

  async signOut() {
    sessionStorage.removeItem('fh_admin');
  },

  async getSession() {
    if (sessionStorage.getItem('fh_admin') === '1') return { user: { email: 'admin' } };
    return null;
  },

  // ── REALTIME ───────────────────────────────────────
  subscribeToOrders(callback) {
    // Returns unsubscribe fn — wrap to match old API shape
    const unsub = firestore.collection('orders')
      .orderBy('created_at', 'desc')
      .limit(1)
      .onSnapshot(snap => {
        snap.docChanges().forEach(change => {
          const doc = { id: change.doc.id, ...change.doc.data() };
          callback({
            eventType: change.type === 'added' ? 'INSERT' : 'UPDATE',
            new: doc
          });
        });
      });
    // Return object with remove() to match old unsubscribe API
    return { unsubscribe: unsub };
  },

  subscribeToOrders_all(callback) {
    return firestore.collection('orders').onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        callback({
          eventType: change.type === 'added' ? 'INSERT' : 'UPDATE',
          new: { id: change.doc.id, ...change.doc.data() }
        });
      });
    });
  },

  subscribeToMenu(callback) {
    const unsub = firestore.collection('menu_items').onSnapshot(() => callback({}));
    return { unsubscribe: unsub };
  },

  unsubscribe(channel) {
    if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe();
  }
};

window.DB = DB;
