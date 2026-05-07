// ═══════════════════════════════════════════════════
//  FLAVOR HOUSE — Firebase Backend v2
//  All features: loyalty, stock, WhatsApp, feedback,
//  dietary, scheduled orders, dynamic pricing, split bill
// ═══════════════════════════════════════════════════

// ── YOUR FIREBASE CONFIG ───────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyD0fFEilVq5sJud3E2nzTEZ9wezpim3o7k",
  authDomain:        "system-fb58f.firebaseapp.com",
  projectId:         "system-fb58f",
  storageBucket:     "system-fb58f.firebasestorage.app",
  messagingSenderId: "206434677599",
  appId:             "1:206434677599:web:6ab4658982fa9942dcbcea"
};

// ── WHATSAPP CONFIG ────────────────────────────────
// 1. Go to callmebot.com → register your WhatsApp number
// 2. You'll receive an API key via WhatsApp
// 3. Fill these in:
const WHATSAPP_CONFIG = {
  phone: '',        // e.g. "201012345678" (no + sign)
  apikey: '',       // e.g. "123456"
  enabled: false,   // set to true once configured
};

// ── ANTHROPIC API KEY ──────────────────────────────
// For AI features (recommendations, upsell, menu writer, demand prediction)
// Get from: console.anthropic.com
const ANTHROPIC_KEY = '';  // 'sk-ant-...'

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
//  DB API
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
      if (saved.category_id) {
        const catSnap = await firestore.collection('categories').doc(saved.category_id).get();
        if (catSnap.exists) saved.categories = catSnap.data();
      }
      return saved;
    } else {
      data.created_at = firebase.firestore.FieldValue.serverTimestamp();
      data.sort_order = data.sort_order || 999;
      data.stock_count = data.stock_count ?? null; // null = unlimited
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

  // ── STOCK MANAGEMENT ───────────────────────────────
  async updateMenuItemStock(id, stockCount) {
    const available = stockCount === null || stockCount > 0;
    await firestore.collection('menu_items').doc(id).update({
      stock_count: stockCount,
      available,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async decrementStockForOrder(items) {
    // Atomically decrement stock for all items in an order
    const batch = firestore.batch();
    for (const item of items) {
      if (!item.id) continue;
      const ref = firestore.collection('menu_items').doc(item.id);
      const snap = await ref.get();
      if (!snap.exists) continue;
      const data = snap.data();
      if (data.stock_count === null || data.stock_count === undefined) continue; // unlimited
      const newCount = Math.max(0, (data.stock_count || 0) - item.qty);
      batch.update(ref, {
        stock_count: newCount,
        available: newCount > 0,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch.commit();
  },

  async resetDailyStock(itemId, resetTo) {
    await firestore.collection('menu_items').doc(itemId).update({
      stock_count: resetTo,
      available: true,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
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
    const inserted = { id: ref.id, ...data, order_number };

    // Decrement stock
    if (order.items?.length) {
      try { await DB.decrementStockForOrder(order.items); } catch(e) { console.warn('Stock decrement failed:', e); }
    }

    // Update loyalty punch
    if (order.customer_phone) {
      try { await DB.addLoyaltyPunch(order.customer_phone, ref.id, order_number); } catch(e) { console.warn('Loyalty failed:', e); }
    }

    // WhatsApp notification
    try { await sendWhatsAppAlert(inserted); } catch(e) { console.warn('WhatsApp failed:', e); }

    return inserted;
  },

  async getOrders(limit = 200) {
    const snap = await firestore.collection('orders')
      .orderBy('created_at', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async updateOrderStatus(id, status) {
    await firestore.collection('orders').doc(id).update({
      status,
      updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      ...(status === 'preparing' ? { prep_started_at: firebase.firestore.FieldValue.serverTimestamp() } : {}),
      ...(status === 'done' ? { completed_at: firebase.firestore.FieldValue.serverTimestamp() } : {}),
    });
  },

  async getOrderById(id) {
    const snap = await firestore.collection('orders').doc(id).get();
    if (!snap.exists) throw new Error('Order not found');
    return { id: snap.id, ...snap.data() };
  },

  async getOrdersByTable(tableNumber) {
    const snap = await firestore.collection('orders')
      .where('table_number', '==', tableNumber)
      .where('status', 'in', ['pending','confirmed','preparing','ready'])
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

  async generateOneShotCoupon(discountPct, expiryDays = 30, prefix = 'SHARE') {
    const code = prefix + Math.random().toString(36).slice(2,6).toUpperCase();
    const expires = new Date();
    expires.setDate(expires.getDate() + expiryDays);
    await firestore.collection('coupons').add({
      code, discount_pct: discountPct, max_uses: 1, uses: 0, active: true,
      expires_at: firebase.firestore.Timestamp.fromDate(expires),
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    return code;
  },

  // ── LOYALTY ────────────────────────────────────────
  async getLoyalty(phone) {
    const snap = await firestore.collection('loyalty').doc(phone).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async addLoyaltyPunch(phone, orderId, orderNumber) {
    const ref = firestore.collection('loyalty').doc(phone);
    return firestore.runTransaction(async tx => {
      const doc = await tx.get(ref);
      const current = doc.exists ? doc.data() : { phone, punch_count: 0, total_orders: 0, order_ids: [] };
      const newPunchCount = (current.punch_count || 0) + 1;
      const newTotal = (current.total_orders || 0) + 1;
      const orderIds = [...(current.order_ids || []), orderId].slice(-50);

      let rewardCoupon = null;
      let newPunchCountReset = newPunchCount;

      if (newPunchCount >= 10) {
        // Generate free meal coupon
        rewardCoupon = 'LOYALTY' + Math.random().toString(36).slice(2,5).toUpperCase();
        newPunchCountReset = 0; // reset after reward
        const expires = new Date();
        expires.setDate(expires.getDate() + 60);
        const couponRef = firestore.collection('coupons').doc();
        tx.set(couponRef, {
          code: rewardCoupon, discount_pct: 100, max_uses: 1, uses: 0, active: true,
          expires_at: firebase.firestore.Timestamp.fromDate(expires),
          for_phone: phone,
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      tx.set(ref, {
        phone, punch_count: newPunchCountReset, total_orders: newTotal,
        order_ids: orderIds, last_order_at: firebase.firestore.FieldValue.serverTimestamp(),
        ...(doc.exists ? {} : { first_order_at: firebase.firestore.FieldValue.serverTimestamp() }),
        reward_coupon: rewardCoupon || (current.reward_coupon || null)
      }, { merge: true });

      return { punch_count: newPunchCountReset, total_orders: newTotal, reward_coupon: rewardCoupon };
    });
  },

  // ── FEEDBACK ───────────────────────────────────────
  async submitFeedback(orderId, tableNumber, emoji, comment, orderItems) {
    await firestore.collection('feedback').add({
      order_id: orderId,
      table_number: tableNumber,
      emoji,          // 1, 2, or 3 (😐 😊 🤩)
      comment: comment || null,
      items: orderItems || [],
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async getFeedback(limit = 100) {
    const snap = await firestore.collection('feedback')
      .orderBy('created_at', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── DYNAMIC PRICING RULES ─────────────────────────
  async getPricingRules() {
    const snap = await firestore.collection('settings').doc('pricing_rules').get();
    return snap.exists ? (snap.data().rules || []) : [];
  },

  async savePricingRules(rules) {
    await firestore.collection('settings').doc('pricing_rules').set({ rules }, { merge: true });
  },

  // Check if a pricing rule is currently active
  getActiveDiscount(rules) {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
    for (const rule of rules) {
      if (!rule.active) continue;
      const start = parseFloat(rule.start_hour || 0);
      const end = parseFloat(rule.end_hour || 24);
      const days = rule.days || [0,1,2,3,4,5,6];
      if (days.includes(day) && hours >= start && hours < end) {
        return rule; // { label, discount_pct, start_hour, end_hour, days }
      }
    }
    return null;
  },

  // ── SCHEDULED ORDERS ──────────────────────────────
  async insertScheduledOrder(order) {
    const order_number = await getNextOrderNumber();
    const data = {
      ...order,
      order_number,
      status: 'scheduled',
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      updated_at: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await firestore.collection('orders').add(data);
    return { id: ref.id, ...data };
  },

  async getScheduledOrders() {
    const now = new Date();
    const snap = await firestore.collection('orders')
      .where('status', '==', 'scheduled')
      .orderBy('scheduled_for', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── DEMAND PREDICTION (reads order history) ────────
  async getOrderHistoryForPrediction() {
    // Returns last 90 days grouped by day-of-week and hour
    const snap = await firestore.collection('orders')
      .where('status', '==', 'done')
      .orderBy('created_at', 'desc')
      .limit(500).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── AUTH ───────────────────────────────────────────
  async signIn(email, password) {
    if (email === 'admin' && password === 'admin123') return { user: { email: 'admin' } };
    throw new Error('Invalid credentials');
  },
  async signOut() { sessionStorage.removeItem('fh_admin'); },
  async getSession() {
    if (sessionStorage.getItem('fh_admin') === '1') return { user: { email: 'admin' } };
    return null;
  },

  // ── REALTIME ───────────────────────────────────────
  subscribeToOrders(callback) {
    const unsub = firestore.collection('orders')
      .orderBy('created_at', 'desc').limit(1)
      .onSnapshot(snap => {
        snap.docChanges().forEach(change => {
          callback({ eventType: change.type === 'added' ? 'INSERT' : 'UPDATE', new: { id: change.doc.id, ...change.doc.data() } });
        });
      });
    return { unsubscribe: unsub };
  },

  unsubscribe(channel) {
    if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe();
  }
};

// ═══════════════════════════════════════════════════
//  WHATSAPP NOTIFICATION
// ═══════════════════════════════════════════════════
async function sendWhatsAppAlert(order) {
  if (!WHATSAPP_CONFIG.enabled || !WHATSAPP_CONFIG.phone || !WHATSAPP_CONFIG.apikey) return;
  const pmEmoji = { cash: '💵', card: '💳', instapay: '📲' };
  const items = order.items?.map(i => `  • ${i.name} ×${i.qty}`).join('\n') || '';
  const msg = `🔔 *New Order #${order.order_number}*\n📍 Table ${order.table_number}\n${items}\n💰 ج.م ${Math.round(order.total).toLocaleString()}\n${pmEmoji[order.payment_method || 'cash']} ${order.payment_method || 'cash'}${order.notes ? `\n📝 ${order.notes}` : ''}`;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_CONFIG.phone}&text=${encodeURIComponent(msg)}&apikey=${WHATSAPP_CONFIG.apikey}`;
  try { await fetch(url); } catch(e) { console.warn('WhatsApp notification failed:', e); }
}

// ═══════════════════════════════════════════════════
//  AI HELPERS (Claude API)
// ═══════════════════════════════════════════════════
const AI = {

  async callClaude(systemPrompt, userMessage, maxTokens = 600) {
    if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_KEY not configured');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || '';
  },

  // Meal recommendations
  async recommend(userMood, menuItems, lang = 'en') {
    const menuSummary = menuItems
      .filter(i => i.available)
      .map(i => `[${i.id}] ${i.name} — ${i.description || ''} — ج.م ${i.price}${i.calories ? ` (${i.calories}cal)` : ''}`)
      .join('\n');
    const system = `You are a friendly restaurant assistant for Flavor House. Based on what the customer feels like eating, recommend 2–3 dishes from the menu. Respond in ${lang === 'ar' ? 'Arabic' : 'English'}. Return ONLY valid JSON: {"recommendations":[{"id":"...","name":"...","reason":"..."}]}. Keep reasons short and appealing (max 12 words).`;
    const text = await AI.callClaude(system, `Customer says: "${userMood}"\n\nMenu:\n${menuSummary}`, 400);
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean).recommendations || [];
    } catch { return []; }
  },

  // Cart upsell
  async upsell(cartItems, menuItems, lang = 'en') {
    const cartSummary = cartItems.map(i => i.name).join(', ');
    const available = menuItems.filter(i => i.available && !cartItems.find(c => c.id === i.id));
    const menuSummary = available.slice(0, 20).map(i => `[${i.id}] ${i.name} — ج.م ${i.price}`).join('\n');
    const system = `You are a smart upsell engine for Flavor House restaurant. Suggest ONE item that pairs well with the cart. Respond in ${lang === 'ar' ? 'Arabic' : 'English'}. Return ONLY valid JSON: {"id":"...","name":"...","reason":"..."}. Keep reason under 10 words. Only suggest if there's a genuine pairing.`;
    const text = await AI.callClaude(system, `Cart: ${cartSummary}\n\nAvailable to suggest:\n${menuSummary}`, 200);
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch { return null; }
  },

  // Generate menu item description
  async generateMenuDescription(name, category, price, lang = 'both') {
    const system = `You are a professional food writer for Flavor House restaurant in Egypt. Write compelling, appetizing menu descriptions. Return ONLY valid JSON: {"description":"...","description_ar":"...","tags":["..."],"calories_estimate":number}. Description max 20 words each. Tags: 2-4 short relevant tags.`;
    const text = await AI.callClaude(system, `Dish: ${name}\nCategory: ${category}\nPrice: ج.م ${price}`, 400);
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch { return null; }
  },

  // Demand prediction
  async predictDemand(orderHistory) {
    if (!orderHistory.length) return null;
    const itemCounts = {};
    const dayItemCounts = {};
    orderHistory.forEach(o => {
      const ts = o.created_at?.toDate ? o.created_at.toDate() : new Date(o.created_at || Date.now());
      const day = ts.getDay();
      o.items?.forEach(i => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + i.qty;
        if (!dayItemCounts[day]) dayItemCounts[day] = {};
        dayItemCounts[day][i.name] = (dayItemCounts[day][i.name] || 0) + i.qty;
      });
    });
    const top = Object.entries(itemCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
    const tomorrowDay = tomorrow.getDay();
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const tomorrowData = dayItemCounts[tomorrowDay] || {};
    const system = `You are a restaurant analytics AI for Flavor House. Based on order history, predict tomorrow's demand. Return ONLY valid JSON: {"predictions":[{"item":"...","expected_qty":number,"confidence":"high|medium|low"}],"alerts":["..."]}. Max 6 predictions, max 3 alerts.`;
    const text = await AI.callClaude(system,
      `Tomorrow: ${dayNames[tomorrowDay]}\nTop items overall: ${JSON.stringify(top)}\nHistorical data for ${dayNames[tomorrowDay]}s: ${JSON.stringify(tomorrowData)}\nTotal orders analyzed: ${orderHistory.length}`, 600);
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch { return null; }
  },

  // Photo to order (vision)
  async identifyDish(base64Image, menuItems) {
    if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_KEY not configured');
    const menuNames = menuItems.filter(i => i.available).map(i => i.name).join(', ');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
            { type: 'text', text: `Our menu items: ${menuNames}. What menu item does this photo show? Return ONLY JSON: {"matched_name":"...","confidence":"high|medium|low","message":"..."}. If no match, set matched_name to null.` }
          ]
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch { return null; }
  },
};

window.DB = DB;
window.AI = AI;
window.sendWhatsAppAlert = sendWhatsAppAlert;
window.ANTHROPIC_KEY = ANTHROPIC_KEY;
