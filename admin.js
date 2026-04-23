/* ═══════════════════════════════════════════════════
   FLAVOR HOUSE — Admin Dashboard
═══════════════════════════════════════════════════ */
'use strict';

const Admin = {
  currentPage: 'dashboard',
  orders: [],
  menu: [],
  categories: [],
  settings: {},
  ordersChannel: null,
  menuChannel: null,
  charts: {},
  orderFilter: 'all',
  menuSearch: '',
};

const fmt = n => `ج.م ${Math.round(n).toLocaleString()}`;

// ═══════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('login-err');
  err.style.display = 'none';
  btn.textContent = 'Signing in...'; btn.disabled = true;

  // Hardcoded admin bypass: admin / admin123
  if (email === 'admin' && pass === 'admin123') {
    sessionStorage.setItem('fh_admin', '1');
    onAuthSuccess('admin');
    return;
  }

  try {
    await DB.signIn(email, pass);
    onAuthSuccess(email);
  } catch(e) {
    err.textContent = e.message || 'Invalid credentials';
    err.style.display = 'block';
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

async function checkAuth() {
  // Check hardcoded session first (stored in sessionStorage on login)
  if (sessionStorage.getItem('fh_admin') === '1') {
    onAuthSuccess('admin');
    return;
  }
  const session = await DB.getSession();
  if (session) onAuthSuccess(session.user.email);
}

function onAuthSuccess(email) {
  document.getElementById('login-screen').style.display = 'none';
  const shell = document.getElementById('app-shell');
  shell.classList.remove('hidden'); shell.style.display = 'flex';
  document.getElementById('adminEmail').textContent = email;
  initAdmin();
}

async function doLogout() {
  sessionStorage.removeItem('fh_admin');
  await DB.signOut();
  location.reload();
}

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
async function initAdmin() {
  try {
    const [orders, menu, cats, settings] = await Promise.all([
      DB.getOrders(200),
      DB.getMenuItems(),
      DB.getCategories(),
      DB.getSettings()
    ]);
    Admin.orders = orders;
    Admin.menu = menu;
    Admin.categories = cats.filter(c => c.name !== 'All');
    Admin.settings = settings;
    updatePendingBadge();
    navigate('dashboard');
    subscribeRealtime();
  } catch(e) {
    console.error(e);
    toast('Failed to load data', 'error');
  }
}

function subscribeRealtime() {
  // Firebase realtime — listen to all order changes
  Admin.ordersChannel = firebase.firestore().collection('orders')
    .orderBy('created_at', 'desc')
    .onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        const o = { id: change.doc.id, ...change.doc.data() };
        const idx = Admin.orders.findIndex(x => x.id === o.id);
        if (idx >= 0) Admin.orders[idx] = o;
        else Admin.orders.unshift(o);
        updatePendingBadge();
        if (Admin.currentPage === 'orders') renderOrders();
        if (Admin.currentPage === 'dashboard') renderDashboard();
        if (change.type === 'added' && Admin.orders.length > 1) {
          toast(`🔔 New order #${o.order_number} — Table ${o.table_number}`, 'info');
        }
      });
    });

  // Firebase realtime — listen to menu changes
  Admin.menuChannel = firebase.firestore().collection('menu_items')
    .onSnapshot(async () => {
      Admin.menu = await DB.getMenuItems();
      if (Admin.currentPage === 'menu') renderMenuPage();
    });
}

function updatePendingBadge() {
  const pending = Admin.orders.filter(o => o.status === 'pending').length;
  const badge = document.getElementById('pendingBadge');
  badge.textContent = pending;
  badge.classList.toggle('hidden', pending === 0);
}

// ═══════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════
function navigate(page) {
  Admin.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');

  const titles = { dashboard:'Dashboard', orders:'Orders', menu:'Menu Items', analytics:'Analytics', tables:'Tables & NFC', settings:'Settings' };
  const subs = { dashboard:'Overview & key metrics', orders:'Manage incoming orders', menu:'Add, edit and manage dishes', analytics:'Revenue & performance', tables:'Manage tables and NFC chip URLs', settings:'Restaurant configuration' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('pageSubtitle').textContent = subs[page] || '';

  const pageEl = document.getElementById('page');
  pageEl.innerHTML = '';

  if (page === 'dashboard') renderDashboard();
  else if (page === 'orders') renderOrders();
  else if (page === 'menu') renderMenuPage();
  else if (page === 'analytics') renderAnalytics();
  else if (page === 'tables') renderTablesPage();
  else if (page === 'settings') renderSettings();

  if (typeof gsap !== 'undefined') {
    gsap.fromTo('#page', { opacity:0, y:16 }, { opacity:1, y:0, duration:0.4, ease:'power3.out' });
  }
}

// ═══════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════
function renderDashboard() {
  const orders = Admin.orders;
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
  const totalRev = orders.filter(o => o.status === 'done').reduce((a,o) => a+o.total, 0);
  const todayRev = todayOrders.filter(o => o.status !== 'cancelled').reduce((a,o) => a+o.total, 0);
  const pending = orders.filter(o => o.status === 'pending').length;
  const avgOrder = orders.length ? orders.reduce((a,o) => a+o.total, 0) / orders.length : 0;

  document.getElementById('page').innerHTML = `
    <div class="stat-grid">
      ${[
        ['💰', 'Total Revenue', fmt(totalRev), ''],
        ['📅', "Today's Sales", fmt(todayRev), `${todayOrders.length} orders`],
        ['⏳', 'Pending Orders', pending, 'Need attention'],
        ['📦', 'All Orders', orders.length, ''],
        ['🍕', 'Menu Items', Admin.menu.length, `${Admin.menu.filter(m=>m.available).length} active`],
        ['📊', 'Avg Order Value', fmt(avgOrder), ''],
      ].map(([icon,label,val,sub]) => `
        <div class="stat-card">
          <div class="stat-icon">${icon}</div>
          <div class="stat-value">${val}</div>
          <div class="stat-label">${label}</div>
          ${sub ? `<div class="stat-change">${sub}</div>` : ''}
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div class="chart-card">
        <h3>Orders by Status</h3>
        <canvas id="statusChart" height="180"></canvas>
      </div>
      <div class="chart-card">
        <h3>Top Dishes</h3>
        <div class="top-items-list" id="topItemsList"></div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header">
        <h3>Recent Orders</h3>
        <button class="btn btn-ghost btn-sm" onclick="navigate('orders')">View All →</button>
      </div>
      <div class="table-overflow">
        <table class="data-table">
          <thead><tr>
            <th>#</th><th>Table</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th><th>Action</th>
          </tr></thead>
          <tbody id="recentOrdersBody"></tbody>
        </table>
      </div>
    </div>
  `;
  renderRecentOrders(orders.slice(0, 10));
  renderStatusChart();
  renderTopItems();
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersBody');
  if (!tbody) return;
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3)">No orders yet</td></tr>'; return; }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td style="font-weight:700;color:var(--accent)">#${o.order_number}</td>
      <td>Table ${o.table_number}</td>
      <td style="color:var(--text2);font-size:13px">${o.items?.slice(0,2).map(i=>`${i.name} ×${i.qty}`).join(', ')}${o.items?.length > 2 ? ` +${o.items.length-2}` : ''}</td>
      <td style="font-weight:600">${fmt(o.total)}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td style="color:var(--text3);font-size:13px">${timeAgo(o.created_at)}</td>
      <td>
        <select class="status-select" onchange="quickUpdateStatus('${o.id}', this.value)">
          ${['pending','confirmed','preparing','ready','done','cancelled'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>
  `).join('');
}

function renderStatusChart() {
  const ctx = document.getElementById('statusChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const statuses = ['pending','confirmed','preparing','ready','done','cancelled'];
  const counts = statuses.map(s => Admin.orders.filter(o => o.status === s).length);
  const colors = ['#3b82f6','#f59e0b','#f97316','#22c55e','#6b7280','#ef4444'];
  if (Admin.charts.status) Admin.charts.status.destroy();
  Admin.charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: statuses, datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
    options: { plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 12 } } } }, cutout: '68%', maintainAspectRatio: false }
  });
}

function renderTopItems() {
  const container = document.getElementById('topItemsList');
  if (!container) return;
  const counts = {};
  Admin.orders.forEach(o => o.items?.forEach(i => { counts[i.name] = (counts[i.name]||0) + i.qty; }));
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,6);
  if (!sorted.length) { container.innerHTML = '<p style="color:var(--text3);font-size:13px">No data yet</p>'; return; }
  const max = sorted[0][1];
  container.innerHTML = sorted.map(([name,qty]) => `
    <div class="top-item-row">
      <span class="top-item-name">${name}</span>
      <div class="top-item-bar-wrap"><div class="top-item-bar" style="width:${Math.round(qty/max*100)}%"></div></div>
      <span class="top-item-count">${qty}</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════
//  ORDERS PAGE
// ═══════════════════════════════════════════════════
function renderOrders() {
  const page = document.getElementById('page');
  page.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>All Orders <span style="color:var(--text3);font-weight:400;font-size:13px">(${Admin.orders.length})</span></h3>
        <div class="table-filters">
          <select class="filter-select" onchange="filterOrders(this.value)" id="statusFilter">
            <option value="all">All Statuses</option>
            ${['pending','confirmed','preparing','ready','done','cancelled'].map(s=>`<option value="${s}">${s}</option>`).join('')}
          </select>
          <input class="search-field" placeholder="Search table / order..." oninput="searchOrders(this.value)">
          <button class="btn btn-ghost btn-sm" onclick="exportOrdersCSV()">📥 Export CSV</button>
        </div>
      </div>
      <div class="table-overflow">
        <table class="data-table">
          <thead><tr>
            <th>Order</th><th>Table</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Notes</th><th>Time</th><th>Actions</th>
          </tr></thead>
          <tbody id="ordersBody"></tbody>
        </table>
      </div>
    </div>
  `;
  renderOrdersTable(Admin.orders);
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersBody');
  if (!tbody) return;
  const filtered = orders.filter(o => {
    if (Admin.orderFilter !== 'all' && o.status !== Admin.orderFilter) return false;
    if (Admin.menuSearch) {
      const q = Admin.menuSearch.toLowerCase();
      return String(o.table_number).includes(q) || String(o.order_number).includes(q) || (o.customer_name||'').toLowerCase().includes(q);
    }
    return true;
  });
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:50px;color:var(--text3)">No orders found</td></tr>'; return; }
  tbody.innerHTML = filtered.map(o => `
    <tr id="order-row-${o.id}">
      <td style="font-weight:700;color:var(--accent)">#${o.order_number}</td>
      <td><span style="font-weight:600">Table ${o.table_number}</span></td>
      <td style="color:var(--text2);font-size:13px">${o.customer_name || '—'}</td>
      <td style="font-size:12px;color:var(--text2);max-width:180px">${o.items?.map(i=>`${i.name} ×${i.qty}`).join(', ')}</td>
      <td style="font-weight:700">${fmt(o.total)}</td>
      <td>
        <select class="status-select" onchange="quickUpdateStatus('${o.id}', this.value)">
          ${['pending','confirmed','preparing','ready','done','cancelled'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="font-size:12px;color:var(--text3);max-width:120px">${o.notes || '—'}</td>
      <td style="font-size:12px;color:var(--text3);white-space:nowrap">${new Date(o.created_at).toLocaleString()}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-xs btn-ghost" onclick="viewOrder('${o.id}')">View</button>
          <button class="btn btn-xs btn-danger" onclick="cancelOrder('${o.id}')">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterOrders(status) { Admin.orderFilter = status; renderOrdersTable(Admin.orders); }
function searchOrders(q) { Admin.menuSearch = q; renderOrdersTable(Admin.orders); }

async function quickUpdateStatus(orderId, status) {
  try {
    await DB.updateOrderStatus(orderId, status);
    const o = Admin.orders.find(x => x.id === orderId);
    if (o) o.status = status;
    updatePendingBadge();
    toast(`Order updated → ${status}`, 'success');
  } catch(e) { toast('Failed to update', 'error'); }
}

function viewOrder(id) {
  const o = Admin.orders.find(x => x.id === id);
  if (!o) return;
  showModal(`
    <div class="modal-header"><h2>Order #${o.order_number}</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;font-size:14px">
      <div><span style="color:var(--text3)">Table</span><br><strong>${o.table_number}</strong></div>
      <div><span style="color:var(--text3)">Status</span><br><span class="badge badge-${o.status}">${o.status}</span></div>
      <div><span style="color:var(--text3)">Customer</span><br><strong>${o.customer_name||'Guest'}</strong></div>
      <div><span style="color:var(--text3)">Time</span><br><strong>${new Date(o.created_at).toLocaleString()}</strong></div>
    </div>
    <div style="background:var(--dark3);border-radius:var(--radius);padding:16px;margin-bottom:16px">
      ${o.items?.map(i=>`<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px">
        <span>${i.name} ×${i.qty}</span><span style="color:var(--accent);font-weight:600">${fmt(i.price*i.qty)}</span>
      </div>`).join('')}
      <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:6px;display:flex;justify-content:space-between;font-weight:700;font-size:16px">
        <span>Total</span><span style="color:var(--accent)">${fmt(o.total)}</span>
      </div>
    </div>
    ${o.notes ? `<div style="background:var(--dark3);border-radius:var(--radius);padding:12px;font-size:13px;color:var(--text2)">📝 ${o.notes}</div>` : ''}
  `);
}

async function cancelOrder(id) {
  if (!confirm('Cancel this order?')) return;
  await quickUpdateStatus(id, 'cancelled');
  renderOrders();
}

function exportOrdersCSV() {
  const rows = [['#','Table','Items','Total','Status','Customer','Notes','Date']];
  Admin.orders.forEach(o => rows.push([
    o.order_number, o.table_number,
    o.items?.map(i=>`${i.name}x${i.qty}`).join(';') || '',
    o.total, o.status, o.customer_name||'', o.notes||'',
    new Date(o.created_at).toLocaleString()
  ]));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast('CSV exported', 'success');
}

// ═══════════════════════════════════════════════════
//  MENU PAGE
// ═══════════════════════════════════════════════════
function renderMenuPage() {
  document.getElementById('page').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <input class="search-field" placeholder="Search menu items..." oninput="adminSearchMenu(this.value)" style="width:280px">
      <button class="btn btn-primary" onclick="openItemModal(null)">+ Add Item</button>
    </div>
    <div class="menu-admin-grid" id="menuAdminGrid"></div>
  `;
  renderMenuGrid();
}

function adminSearchMenu(q) {
  Admin.menuSearch = q.toLowerCase();
  renderMenuGrid();
}

function renderMenuGrid() {
  const grid = document.getElementById('menuAdminGrid');
  if (!grid) return;
  const items = Admin.menuSearch
    ? Admin.menu.filter(i => i.name.toLowerCase().includes(Admin.menuSearch) || i.name_ar?.includes(Admin.menuSearch))
    : Admin.menu;
  if (!items.length) { grid.innerHTML = '<p style="color:var(--text3);padding:40px">No items found</p>'; return; }
  grid.innerHTML = items.map(item => `
    <div class="menu-admin-card">
      <div class="menu-admin-img">
        <img src="${item.image_url}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/240x140/1a1a1a/444'" loading="lazy">
        <div style="position:absolute;top:8px;right:8px;display:flex;gap:6px">
          ${item.featured ? '<span class="badge badge-featured" style="font-size:10px">★ Featured</span>' : ''}
          <span class="badge ${item.available?'badge-active':'badge-inactive'}" style="font-size:10px">${item.available?'Active':'Off'}</span>
        </div>
      </div>
      <div class="menu-admin-body">
        <div class="menu-admin-name">${item.name}</div>
        <div class="menu-admin-sub">${item.name_ar || ''} · ${item.categories?.name || ''}</div>
        <div class="menu-admin-price">${fmt(item.price)}</div>
        <div class="menu-admin-actions">
          <button class="btn btn-ghost btn-sm" onclick="openItemModal('${item.id}')">✏️ Edit</button>
          <button class="btn btn-warning btn-sm" onclick="toggleAvailability('${item.id}',${!item.available})">${item.available?'Disable':'Enable'}</button>
          <button class="btn btn-danger btn-sm" onclick="deleteItem('${item.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function toggleAvailability(id, available) {
  try {
    await DB.toggleMenuItemAvailability(id, available);
    const item = Admin.menu.find(i => i.id === id);
    if (item) item.available = available;
    renderMenuGrid();
    toast(`Item ${available ? 'enabled' : 'disabled'}`, 'success');
  } catch { toast('Failed', 'error'); }
}

async function deleteItem(id) {
  if (!confirm('Delete this menu item? This cannot be undone.')) return;
  try {
    await DB.deleteMenuItem(id);
    Admin.menu = Admin.menu.filter(i => i.id !== id);
    renderMenuGrid();
    toast('Item deleted', 'success');
  } catch { toast('Failed to delete', 'error'); }
}

function openItemModal(itemId) {
  const item = itemId ? Admin.menu.find(i => i.id === itemId) : null;
  const cats = Admin.categories;
  showModal(`
    <div class="modal-header">
      <h2>${item ? 'Edit Item' : 'Add Menu Item'}</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-grid">
      <div>
        <div class="form-group">
          <label class="form-label">Name (English)</label>
          <input class="form-control" id="fi_name" value="${item?.name||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Name (Arabic)</label>
          <input class="form-control" id="fi_name_ar" value="${item?.name_ar||''}" dir="rtl">
        </div>
        <div class="form-group">
          <label class="form-label">Price (EGP)</label>
          <input class="form-control" id="fi_price" type="number" step="0.5" value="${item?.price||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-control" id="fi_cat">
            ${cats.map(c=>`<option value="${c.id}" ${item?.category_id===c.id?'selected':''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Calories</label>
          <input class="form-control" id="fi_cal" type="number" value="${item?.calories||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Prep Time (minutes)</label>
          <input class="form-control" id="fi_prep" type="number" value="${item?.prep_time_min||15}">
        </div>
      </div>
      <div>
        <div class="form-group">
          <label class="form-label">Description (English)</label>
          <textarea class="form-control" id="fi_desc" rows="3">${item?.description||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Description (Arabic)</label>
          <textarea class="form-control" id="fi_desc_ar" rows="3" dir="rtl">${item?.description_ar||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Image URL</label>
          <input class="form-control" id="fi_img" placeholder="https://..." value="${item?.image_url||''}" oninput="previewImage(this.value)">
          <img id="fi_img_preview" class="img-preview" src="${item?.image_url||''}" style="${item?.image_url?'display:block':''}">
        </div>
        <div class="toggle-row">
          <span style="font-size:14px">Available</span>
          <label class="toggle-switch"><input type="checkbox" id="fi_available" ${!item||item.available?'checked':''}><span class="toggle-slider"></span></label>
        </div>
        <div class="toggle-row">
          <span style="font-size:14px">Featured / Chef's Pick</span>
          <label class="toggle-switch"><input type="checkbox" id="fi_featured" ${item?.featured?'checked':''}><span class="toggle-slider"></span></label>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-top:24px">
      <button class="btn btn-primary" onclick="saveItem('${itemId||''}')" style="flex:1;padding:13px">
        ${item ? 'Save Changes' : 'Add Item'}
      </button>
      <button class="btn btn-ghost" onclick="closeModal()" style="padding:13px 20px">Cancel</button>
    </div>
  `);
}

function previewImage(url) {
  const prev = document.getElementById('fi_img_preview');
  if (prev) { prev.src = url; prev.style.display = url ? 'block' : 'none'; }
}

async function saveItem(itemId) {
  const data = {
    name: document.getElementById('fi_name').value.trim(),
    name_ar: document.getElementById('fi_name_ar').value.trim(),
    price: parseFloat(document.getElementById('fi_price').value),
    category_id: document.getElementById('fi_cat').value,
    description: document.getElementById('fi_desc').value.trim(),
    description_ar: document.getElementById('fi_desc_ar').value.trim(),
    image_url: document.getElementById('fi_img').value.trim(),
    available: document.getElementById('fi_available').checked,
    featured: document.getElementById('fi_featured').checked,
    calories: parseInt(document.getElementById('fi_cal').value) || null,
    prep_time_min: parseInt(document.getElementById('fi_prep').value) || 15,
  };
  if (!data.name || !data.price) { toast('Name and price are required', 'error'); return; }
  if (itemId) data.id = itemId;
  try {
    const saved = await DB.upsertMenuItem(data);
    const idx = Admin.menu.findIndex(i => i.id === saved.id);
    if (idx >= 0) Admin.menu[idx] = saved; else Admin.menu.push(saved);
    closeModal(); renderMenuGrid();
    toast(itemId ? 'Item updated' : 'Item added', 'success');
  } catch(e) { toast('Failed to save: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════
function renderAnalytics() {
  const orders = Admin.orders;
  const done = orders.filter(o => o.status === 'done');
  const totalRev = done.reduce((a,o) => a+o.total, 0);

  // Revenue by day (last 14 days)
  const dayMap = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    dayMap[d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})] = 0;
  }
  orders.filter(o=>o.status!=='cancelled').forEach(o => {
    const d = new Date(o.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
    if (d in dayMap) dayMap[d] += o.total;
  });

  document.getElementById('page').innerHTML = `
    <div class="stat-grid" style="margin-bottom:24px">
      ${[
        ['💰','Total Revenue (done)',fmt(totalRev)],
        ['📈','Completed Orders',done.length],
        ['❌','Cancelled',orders.filter(o=>o.status==='cancelled').length],
        ['⏱','Avg Order Value',fmt(orders.length?orders.reduce((a,o)=>a+o.total,0)/orders.length:0)],
      ].map(([icon,label,val]) => `<div class="stat-card"><div class="stat-icon">${icon}</div><div class="stat-value">${val}</div><div class="stat-label">${label}</div></div>`).join('')}
    </div>
    <div class="chart-grid">
      <div class="chart-card">
        <h3>Revenue — Last 14 Days</h3>
        <canvas id="revenueChart" height="240"></canvas>
      </div>
      <div class="chart-card">
        <h3>Top Ordered Items</h3>
        <div class="top-items-list" id="analyticsTopItems"></div>
      </div>
    </div>
  `;

  // Revenue chart
  setTimeout(() => {
    const ctx = document.getElementById('revenueChart');
    if (ctx && typeof Chart !== 'undefined') {
      if (Admin.charts.revenue) Admin.charts.revenue.destroy();
      Admin.charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Object.keys(dayMap),
          datasets: [{
            label: 'Revenue (EGP)',
            data: Object.values(dayMap),
            borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.08)',
            borderWidth: 2, fill: true, tension: 0.4, pointRadius: 4,
            pointBackgroundColor: '#FF6B35', pointBorderColor: '#FF6B35'
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#666', font:{size:11} }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#666', font:{size:11}, callback: v => `ج.م ${v}` }, grid: { color: 'rgba(255,255,255,0.04)' } }
          }
        }
      });
    }
    const container = document.getElementById('analyticsTopItems');
    if (container) {
      const counts = {};
      Admin.orders.forEach(o => o.items?.forEach(i => { counts[i.name]=(counts[i.name]||0)+i.qty; }));
      const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
      const max = sorted[0]?.[1] || 1;
      container.innerHTML = sorted.map(([name,qty]) => `
        <div class="top-item-row">
          <span class="top-item-name">${name}</span>
          <div class="top-item-bar-wrap"><div class="top-item-bar" style="width:${Math.round(qty/max*100)}%"></div></div>
          <span class="top-item-count">${qty}</span>
        </div>`).join('') || '<p style="color:var(--text3)">No data yet</p>';
    }
  }, 100);
}

// ═══════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════
function renderSettings() {
  const s = Admin.settings;
  document.getElementById('page').innerHTML = `
    <div class="settings-grid">
      <div class="settings-card">
        <h3>🏪 Restaurant Info</h3>
        ${settingField('Restaurant Name', 'restaurant_name', s.restaurant_name)}
        ${settingField('Restaurant Name (Arabic)', 'restaurant_name_ar', s.restaurant_name_ar)}
        ${settingField('Tagline', 'tagline', s.tagline)}
        ${settingField('WiFi Network', 'wifi_name', s.wifi_name)}
        ${settingField('WiFi Password', 'wifi_pass', s.wifi_pass)}
        ${settingField('Opening Time', 'open_time', s.open_time)}
        ${settingField('Closing Time', 'close_time', s.close_time)}
        <button class="btn btn-primary" onclick="saveSettings()" style="width:100%;margin-top:8px">Save Info</button>
      </div>
      <div class="settings-card">
        <h3>💰 Pricing & Tax</h3>
        ${settingField('VAT Rate (%)', 'tax_rate', s.tax_rate)}
        ${settingField('Service Charge (%)', 'service_charge', s.service_charge)}
        ${settingField('Currency Symbol', 'currency_symbol', s.currency_symbol)}
        <button class="btn btn-primary" onclick="saveSettings()" style="width:100%;margin-top:8px">Save Pricing</button>
        <div style="margin-top:20px">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:14px">🎟 Manage Coupons</h3>
          ${renderCouponsInline()}
        </div>
      </div>
      <div class="settings-card" style="grid-column:1/-1">
        <h3>🎨 Appearance</h3>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div>
            <div class="form-label">Accent Color</div>
            <input type="color" value="${s.accent_color||'#FF6B35'}" id="accentColorPicker" oninput="updateAccentLive(this.value)" style="width:56px;height:40px;border:none;cursor:pointer;border-radius:8px;background:transparent">
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${['#FF6B35','#3b82f6','#22c55e','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899'].map(c=>`<button onclick="updateAccentLive('${c}');document.getElementById('accentColorPicker').value='${c}'" style="width:32px;height:32px;border-radius:50%;background:${c};border:2px solid ${(s.accent_color||'#FF6B35')===c?'#fff':'transparent'};cursor:pointer"></button>`).join('')}
          </div>
          <button class="btn btn-primary btn-sm" onclick="saveAccentColor()">Apply Color</button>
        </div>
      </div>
    </div>
  `;
}

function settingField(label, key, val) {
  return `<div class="form-group">
    <label class="form-label">${label}</label>
    <input class="form-control" id="setting_${key}" value="${val||''}">
  </div>`;
}

function renderCouponsInline() {
  return `<div style="display:flex;gap:8px;margin-bottom:12px">
    <input class="form-control" id="newCouponCode" placeholder="Code e.g. SAVE15" style="flex:1">
    <input class="form-control" id="newCouponPct" type="number" placeholder="%" style="width:70px">
    <button class="btn btn-ghost btn-sm" onclick="addCoupon()">+ Add</button>
  </div>
  <div id="couponList" style="font-size:13px;color:var(--text2)">Loading coupons...</div>`;
}

async function loadCoupons() {
  try {
    const snap = await firebase.firestore().collection('coupons').orderBy('created_at','desc').get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const el = document.getElementById('couponList');
    if (!el) return;
    el.innerHTML = data?.length ? data.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <code style="background:var(--dark3);padding:2px 8px;border-radius:4px;color:var(--accent)">${c.code}</code>
        <span>${c.discount_pct}% off · ${c.uses}/${c.max_uses} uses</span>
        <button class="btn btn-danger btn-xs" onclick="deleteCoupon('${c.id}')">Delete</button>
      </div>`).join('') : '<p style="color:var(--text3)">No coupons</p>';
  } catch {}
}

async function addCoupon() {
  const code = document.getElementById('newCouponCode')?.value.trim().toUpperCase();
  const pct = parseFloat(document.getElementById('newCouponPct')?.value);
  if (!code || !pct) { toast('Fill code and %', 'error'); return; }
  try {
    await firebase.firestore().collection('coupons').add({code, discount_pct:pct, max_uses:1000, uses:0, active:true, created_at: firebase.firestore.FieldValue.serverTimestamp()});
    toast('Coupon added', 'success'); loadCoupons();
  } catch { toast('Failed', 'error'); }
}

async function deleteCoupon(id) {
  if (!confirm('Delete coupon?')) return;
  await firebase.firestore().collection('coupons').doc(id).delete();
  toast('Deleted', 'success'); loadCoupons();
}

async function saveSettings() {
  const keys = ['restaurant_name','restaurant_name_ar','tagline','wifi_name','wifi_pass','open_time','close_time','tax_rate','service_charge','currency_symbol'];
  try {
    await Promise.all(keys.map(async key => {
      const el = document.getElementById('setting_'+key);
      if (el) await DB.updateSetting(key, el.value);
    }));
    toast('Settings saved ✓', 'success');
  } catch { toast('Failed to save', 'error'); }
}

function updateAccentLive(color) {
  document.documentElement.style.setProperty('--accent', color);
}

async function saveAccentColor() {
  const color = document.getElementById('accentColorPicker').value;
  await DB.updateSetting('accent_color', color);
  toast('Color saved', 'success');
}

// ═══════════════════════════════════════════════════
//  MODAL HELPERS
// ═══════════════════════════════════════════════════
function showModal(html) {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">${html}</div>
    </div>`;
  setTimeout(() => { const el = document.getElementById('couponList'); if (el) loadCoupons(); }, 50);
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

// ═══════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════
function toast(msg, type='info', dur=3000) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .4s'; setTimeout(()=>el.remove(),400); }, dur);
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff/60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return Math.floor(h/24) + 'd ago';
}

// ═══════════════════════════════════════════════════
//  TABLES & NFC PAGE
// ═══════════════════════════════════════════════════
async function renderTablesPage() {
  document.getElementById('page').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <p style="font-size:13px;color:var(--text2)">Each NFC chip must be programmed with its table URL. Customers tap → browser opens → table auto-detected.</p>
      </div>
      <button class="btn btn-primary" onclick="openTableModal(null)">+ Add Table</button>
    </div>
    <div id="tablesGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
      <div style="color:var(--text3);padding:40px;text-align:center;grid-column:1/-1">Loading tables...</div>
    </div>`;
  await loadTablesGrid();
}

async function loadTablesGrid() {
  const grid = document.getElementById('tablesGrid');
  if (!grid) return;
  try {
    const [tables, orders] = await Promise.all([
      DB.getTables(),
      DB.getOrders(200)
    ]);

    // Build active order map per table
    const activeOrders = {};
    orders.forEach(o => {
      if (['pending','confirmed','preparing','ready'].includes(o.status)) {
        if (!activeOrders[o.table_number]) activeOrders[o.table_number] = [];
        activeOrders[o.table_number].push(o);
      }
    });

    if (!tables.length) {
      grid.innerHTML = `<div style="color:var(--text3);padding:40px;text-align:center;grid-column:1/-1">
        No tables yet. Click "+ Add Table" to create your first table.</div>`;
      return;
    }

    const siteBase = (Admin.settings.site_url || 'https://YOUR-DOMAIN.com/frontend/index.html');
    grid.innerHTML = tables.map(tbl => {
      const nfcUrl = `${siteBase}?table=${tbl.table_number}`;
      const active = activeOrders[tbl.table_number] || [];
      const statusColor = !tbl.active ? 'var(--text3)' : active.length ? '#f59e0b' : '#22c55e';
      const statusLabel = !tbl.active ? 'Inactive' : active.length ? `Busy (${active.length} order${active.length>1?'s':''})` : 'Free';
      const statusBadge = !tbl.active ? 'badge-inactive' : active.length ? 'badge-confirmed' : 'badge-ready';
      return `
      <div class="table-card" style="border-radius:var(--radius2);overflow:visible">
        <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,107,53,0.1);border:1px solid rgba(255,107,53,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:var(--accent)">${tbl.table_number}</div>
            <div>
              <div style="font-weight:700;font-size:15px">Table ${tbl.table_number}</div>
              <div style="font-size:12px;color:var(--text2)">Capacity: ${tbl.capacity || 4} seats</div>
            </div>
          </div>
          <span class="badge ${statusBadge}">${statusLabel}</span>
        </div>
        ${active.length ? `
        <div style="padding:12px 20px;background:rgba(245,158,11,0.05);border-bottom:1px solid var(--border)">
          ${active.map(o => `
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span style="color:var(--accent);font-weight:600">#${o.order_number}</span>
              <span class="badge badge-${o.status}" style="font-size:10px">${o.status}</span>
              <span style="color:var(--text2)">${fmt(o.total)}</span>
              <select class="status-select" style="font-size:11px;padding:3px 6px" onchange="quickUpdateStatus('${o.id}',this.value)">
                ${['pending','confirmed','preparing','ready','done','cancelled'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>`).join('')}
        </div>` : ''}
        <div style="padding:16px 20px">
          <div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:600;letter-spacing:1px;text-transform:uppercase">NFC URL to program</div>
          <div style="display:flex;gap:8px;align-items:center">
            <code style="flex:1;font-size:11px;background:var(--dark3);padding:8px 10px;border-radius:8px;color:var(--text2);word-break:break-all;display:block">${nfcUrl}</code>
            <button class="btn btn-ghost btn-sm" onclick="copyNFCUrl('${nfcUrl}',this)" style="flex-shrink:0;padding:8px 12px;font-size:11px">Copy</button>
          </div>
        </div>
        <div style="padding:0 20px 16px;display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="openTableModal('${tbl.id}','${tbl.table_number}','${tbl.capacity||4}','${tbl.active}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTable('${tbl.id}')">🗑️ Delete</button>
          ${!tbl.active ? `<button class="btn btn-success btn-sm" onclick="toggleTable('${tbl.id}',true)">Enable</button>` : `<button class="btn btn-warning btn-sm" onclick="toggleTable('${tbl.id}',false)">Disable</button>`}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    console.error(e);
    grid.innerHTML = `<div style="color:var(--danger);padding:40px;text-align:center;grid-column:1/-1">Failed to load tables: ${e.message}</div>`;
  }
}

function copyNFCUrl(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.color = '#22c55e';
    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 2000);
  }).catch(() => {
    prompt('Copy this NFC URL:', url);
  });
}

function openTableModal(id, num='', cap=4, active=true) {
  showModal(`
    <div class="modal-header">
      <h2>${id ? 'Edit Table' : 'Add Table'}</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Table Number</label>
      <input class="form-control" id="tm_num" type="number" min="1" max="100" value="${num}" placeholder="e.g. 5" ${id ? 'readonly style="opacity:0.6"' : ''}>
    </div>
    <div class="form-group">
      <label class="form-label">Capacity (seats)</label>
      <input class="form-control" id="tm_cap" type="number" min="1" max="20" value="${cap}">
    </div>
    <div class="toggle-row">
      <span style="font-size:14px">Table Active</span>
      <label class="toggle-switch"><input type="checkbox" id="tm_active" ${active==='false'?'':'checked'}><span class="toggle-slider"></span></label>
    </div>
    <div style="display:flex;gap:12px;margin-top:24px">
      <button class="btn btn-primary" onclick="saveTable('${id||''}')" style="flex:1;padding:13px">${id ? 'Save Changes' : 'Add Table'}</button>
      <button class="btn btn-ghost" onclick="closeModal()" style="padding:13px 20px">Cancel</button>
    </div>
  `);
}

async function saveTable(id) {
  const num = parseInt(document.getElementById('tm_num').value);
  const cap = parseInt(document.getElementById('tm_cap').value) || 4;
  const active = document.getElementById('tm_active').checked;
  if (!num || num < 1) { toast('Enter a valid table number', 'error'); return; }
  const payload = { table_number: num, capacity: cap, active };
  if (id) payload.id = id;
  try {
    await DB.upsertTable(payload);
    closeModal();
    toast(id ? 'Table updated' : 'Table added', 'success');
    await loadTablesGrid();
  } catch(e) { toast('Failed: ' + e.message, 'error'); }
}

async function deleteTable(id) {
  if (!confirm('Delete this table?')) return;
  try {
    await DB.deleteTable(id);
    toast('Table deleted', 'success');
    await loadTablesGrid();
  } catch(e) { toast('Failed: ' + e.message, 'error'); }
}

async function toggleTable(id, active) {
  try {
    await firebase.firestore().collection('tables').doc(id).update({ active });
    toast(`Table ${active ? 'enabled' : 'disabled'}`, 'success');
    await loadTablesGrid();
  } catch(e) { toast('Failed', 'error'); }
}

// ═══════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  // Allow Enter on login
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});
