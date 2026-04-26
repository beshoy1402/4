/* ═══════════════════════════════════════════════════
   FLAVOR HOUSE — Customer App
   GSAP + Three.js + Supabase realtime
═══════════════════════════════════════════════════ */
'use strict';

// ── State ─────────────────────────────────────────
const App = {
  lang: 'en',
  tableNumber: null,
  settings: {},
  menu: [],
  categories: [],
  cart: [],
  coupon: null,
  filteredMenu: [],
  activeCategory: null,
  searchQuery: '',
  currentOrderId: null,
  orderChannel: null,
};

// ── Translations ───────────────────────────────────
const i18n = {
  en: {
    yourOrder:'Your Order', emptyCart:'Nothing here yet', browseMenu:'Browse Menu',
    subtotal:'Subtotal', tax:'VAT (14%)', service:'Service (10%)', discount:'Discount',
    grandTotal:'Grand Total', couponCode:'Coupon code', apply:'Apply',
    notes:'Special requests', checkout:'Proceed to Checkout', orderNow:'Order Now',
    tableDetected:'You\'re at Table', trackOrder:'Track Order', searchPlaceholder:'Search dishes...',
    addedToCart:'Added to cart!', couponApplied:'Coupon applied!', couponInvalid:'Invalid coupon',
    chefPicks:'Chef\'s Picks', mostLoved:'Most Loved', fullMenu:'Full Menu',
    craving:'What are you craving today?', orderPlaced:'Order Placed! 🎉',
    orderConfirm:'Your order has been sent to the kitchen.',
    tableLabel:'Table Number', nameLabel:'Your Name (optional)',
    confirmOrder:'Confirm Order', cancel:'Cancel',
    trackTitle:'Real-time', trackStatus:'Order Status',
    pending:'Received', confirmed:'Confirmed', preparing:'Preparing',
    ready:'Ready!', done:'Served ✓',
    cal:'kcal', min:'min', available:'Available', unavailable:'Unavailable',
    featured:'Featured', popular:'Popular',
    langBtn:'عربي', adminLink:'Admin',
    footer:'Crafted with passion. Served with love.',
    menuLabel:'Full Menu', menuTitle:'What are you\ncraving today?',
  },
  ar: {
    yourOrder:'طلبك', emptyCart:'السلة فارغة', browseMenu:'تصفح القائمة',
    subtotal:'المجموع الجزئي', tax:'ضريبة القيمة (14%)', service:'رسوم الخدمة (10%)', discount:'خصم',
    grandTotal:'الإجمالي', couponCode:'كود الخصم', apply:'تطبيق',
    notes:'ملاحظات خاصة', checkout:'تأكيد الطلب', orderNow:'اطلب الآن',
    tableDetected:'أنت على طاولة', trackOrder:'تتبع الطلب', searchPlaceholder:'ابحث عن أطباق...',
    addedToCart:'تمت الإضافة!', couponApplied:'تم تطبيق الكوبون!', couponInvalid:'كوبون غير صالح',
    chefPicks:'اختيارات الشيف', mostLoved:'الأكثر شعبية', fullMenu:'القائمة الكاملة',
    craving:'ماذا تريد اليوم؟', orderPlaced:'تم الطلب! 🎉',
    orderConfirm:'تم إرسال طلبك إلى المطبخ.',
    tableLabel:'رقم الطاولة', nameLabel:'اسمك (اختياري)',
    confirmOrder:'تأكيد الطلب', cancel:'إلغاء',
    trackTitle:'لحظي', trackStatus:'حالة الطلب',
    pending:'تم الاستلام', confirmed:'مؤكد', preparing:'يُحضَّر',
    ready:'جاهز!', done:'تم التقديم ✓',
    cal:'سعرة', min:'دقيقة', available:'متوفر', unavailable:'غير متوفر',
    featured:'مميز', popular:'مشهور',
    langBtn:'English', adminLink:'الإدارة',
    footer:'نُعدّ بشغف. نُقدّم بحب.',
    menuLabel:'القائمة الكاملة', menuTitle:'ماذا تريد اليوم؟',
  }
};
const t = (key) => (i18n[App.lang][key] || key);
const isAr = () => App.lang === 'ar';

// ── Format ─────────────────────────────────────────
const fmt = (n) => `${App.settings.currency_symbol || 'ج.م'} ${Math.round(n).toLocaleString()}`;

// ═══════════════════════════════════════════════════
//  THREE.JS HERO
// ═══════════════════════════════════════════════════
function initThreeHero() {
  const canvas = document.getElementById('three-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Floating particles
  const particleCount = 180;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    const t = Math.random();
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 0.42 + t * 0.3;
    colors[i * 3 + 2] = 0.21;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particleMat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.6, sizeAttenuation: true });
  scene.add(new THREE.Points(particleGeo, particleMat));

  // Floating torus rings
  const rings = [];
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xFF6B35, wireframe: true, transparent: true, opacity: 0.15 });
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.TorusGeometry(2 + i * 1.5, 0.03, 8, 80);
    const mesh = new THREE.Mesh(geo, ringMat.clone());
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    scene.add(mesh);
    rings.push(mesh);
  }

  // Central sphere
  const sphereGeo = new THREE.SphereGeometry(1.2, 32, 32);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0xFF6B35, wireframe: true, transparent: true, opacity: 0.08
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphere);

  // Mouse parallax
  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Resize
  window.addEventListener('resize', () => {
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
    camera.updateProjectionMatrix();
  });
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

  // Animate
  const clock = new THREE.Clock();
  function animate() {
    if (!document.getElementById('hero')) return;
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    rings.forEach((ring, i) => {
      ring.rotation.x += 0.003 * (i % 2 === 0 ? 1 : -1);
      ring.rotation.y += 0.002;
      ring.rotation.z += 0.001;
    });
    sphere.rotation.y += 0.004;
    sphere.rotation.x = Math.sin(t * 0.3) * 0.1;
    // Particles drift
    const pos = particleGeo.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 1] += 0.004;
      if (pos[i * 3 + 1] > 10) pos[i * 3 + 1] = -10;
    }
    particleGeo.attributes.position.needsUpdate = true;
    // Camera parallax
    camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  }
  animate();
}

// ═══════════════════════════════════════════════════
//  GSAP ANIMATIONS
// ═══════════════════════════════════════════════════
function initGSAP() {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  // Hero entrance
  const heroTl = gsap.timeline({ delay: 0.3 });
  heroTl
    .to('.hero-tag', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
    .to('.hero-title', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, '-=0.4')
    .to('.hero-sub', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
    .to('.hero-actions', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.4')
    .to('.hero-stats', { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.2');

  // Section reveals
  gsap.utils.toArray('.section-header').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 80%' },
      y: 40, opacity: 0, duration: 0.8, ease: 'power3.out'
    });
  });

  // Featured cards parallax
  ScrollTrigger.create({
    trigger: '#featured-section',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      gsap.to('.featured-scroll', { x: -self.progress * 60, ease: 'none', duration: 0 });
    }
  });

  // Navbar parallax bg
  ScrollTrigger.create({
    trigger: 'body',
    start: 'top top',
    onUpdate: (self) => {
      const navbar = document.getElementById('navbar');
      if (window.scrollY > 60) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }
  });
}

function animateMenuCards() {
  if (typeof gsap === 'undefined') return;
  gsap.fromTo('.menu-card', { opacity: 0, y: 30, scale: 0.97 }, {
    opacity: 1, y: 0, scale: 1,
    duration: 0.5, stagger: 0.06, ease: 'power3.out'
  });
}

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
async function init() {
  // Table detection from URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('table')) {
    App.tableNumber = parseInt(params.get('table'));
    showTableBanner(App.tableNumber);
  } else {
    // Simulate NFC table detection after 1.5s
    setTimeout(() => simulateNFC(), 1500);
  }

  initThreeHero();
  initGSAP();

  try {
    const [settings, categories, menu] = await Promise.all([
      DB.getSettings(),
      DB.getCategories(),
      DB.getMenuItems()
    ]);
    App.settings = settings;
    App.categories = categories.filter(c => c.name !== 'All');
    App.menu = menu;
    App.filteredMenu = menu;
    applySettings();
    renderCategories();
    renderFeatured();
    renderMenuGrid();
    subscribeToMenuChanges();
  } catch (err) {
    console.error('Init error:', err);
    toast('Connection error. Retrying...', 'error');
    setTimeout(init, 3000);
  }
}

function applySettings() {
  const s = App.settings;
  if (s.accent_color) document.documentElement.style.setProperty('--accent', s.accent_color);
  const el = id => document.getElementById(id);
  if (el('wifiName')) el('wifiName').textContent = s.wifi_name || 'FH_Guest';
  if (el('wifiPass')) el('wifiPass').textContent = s.wifi_pass || 'flavorhouse2024';
  if (el('footerTagline')) el('footerTagline').textContent = s.tagline || t('footer');
}

function simulateNFC() {
  // In production: NFC tag URL has ?table=X
  // Here we demo table 5
  App.tableNumber = 5;
  showTableBanner(5);
}

// ═══════════════════════════════════════════════════
//  LANGUAGE
// ═══════════════════════════════════════════════════
function toggleLang() {
  App.lang = App.lang === 'en' ? 'ar' : 'en';
  document.documentElement.setAttribute('dir', isAr() ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', App.lang);
  document.getElementById('langBtn').textContent = t('langBtn');
  renderCategories();
  renderFeatured();
  renderMenuGrid();
  renderCart();
  updateNavText();
}

function updateNavText() {
  const el = id => document.getElementById(id);
}

// ═══════════════════════════════════════════════════
//  TABLE BANNER
// ═══════════════════════════════════════════════════
function showTableBanner(num) {
  const banner = document.getElementById('table-banner');
  const text = document.getElementById('table-banner-text');
  text.textContent = `${t('tableDetected')} ${num}`;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 5000);
}
function closeBanner() { document.getElementById('table-banner').classList.remove('show'); }

// ═══════════════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════════════
function renderCategories() {
  const bar = document.getElementById('cat-bar');
  const allPill = `<button class="cat-pill${!App.activeCategory ? ' active' : ''}" onclick="filterByCategory(null)">
    ✨ ${isAr() ? 'الكل' : 'All'}
  </button>`;
  const pills = App.categories.map(c => `
    <button class="cat-pill${App.activeCategory === c.id ? ' active' : ''}" onclick="filterByCategory('${c.id}')">
      ${c.icon} ${isAr() ? c.name_ar : c.name}
    </button>
  `).join('');
  bar.innerHTML = allPill + pills;
}

function filterByCategory(catId) {
  App.activeCategory = catId;
  applyFilters();
  renderCategories();
}

function filterMenu() {
  App.searchQuery = document.getElementById('search-input').value.toLowerCase();
  applyFilters();
}

function applyFilters() {
  let items = App.menu;
  if (App.activeCategory) items = items.filter(i => i.category_id === App.activeCategory);
  if (App.searchQuery) {
    items = items.filter(i =>
      i.name.toLowerCase().includes(App.searchQuery) ||
      i.name_ar?.includes(App.searchQuery) ||
      i.description?.toLowerCase().includes(App.searchQuery) ||
      i.tags?.some(tag => tag.includes(App.searchQuery))
    );
  }
  App.filteredMenu = items;
  renderMenuGrid();
}

// ═══════════════════════════════════════════════════
//  FEATURED
// ═══════════════════════════════════════════════════
function renderFeatured() {
  const container = document.getElementById('featured-scroll');
  const featured = App.menu.filter(i => i.featured && i.available);
  if (!featured.length) { document.getElementById('featured-section').style.display = 'none'; return; }
  container.innerHTML = featured.map(item => `
    <div class="featured-card" onclick="scrollToMenu()">
      <img src="${item.image_url}" alt="${isAr() ? item.name_ar : item.name}"
        onerror="this.src='https://via.placeholder.com/280x360/1a1a1a/444?text=🍽️'" loading="lazy">
      <div class="featured-card-info">
        <div class="featured-card-name">${isAr() ? item.name_ar : item.name}</div>
        <div class="featured-card-price">${fmt(item.price)}</div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════
//  MENU GRID
// ═══════════════════════════════════════════════════
function renderMenuGrid() {
  const grid = document.getElementById('menu-grid');
  const items = App.filteredMenu;

  if (!items.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text2)">
      <div style="font-size:48px;margin-bottom:16px">🔍</div>
      <div style="font-size:18px">No dishes found</div>
    </div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const inCart = App.cart.find(c => c.id === item.id);
    const name = isAr() ? item.name_ar : item.name;
    const desc = isAr() ? item.description_ar : item.description;
    const catName = item.categories ? (isAr() ? item.categories.name_ar : item.categories.name) : '';
    return `
    <div class="menu-card" id="card-${item.id}">
      <div class="menu-card-img">
        <img src="${item.image_url}" alt="${name}"
          onerror="this.src='https://via.placeholder.com/400x200/1a1a1a/444?text=🍽️'" loading="lazy">
        <div class="menu-card-overlay"></div>
        <div class="menu-card-badges">
          ${item.featured ? `<span class="badge badge-featured">⭐ ${t('featured')}</span>` : ''}
          ${!item.available ? `<span class="badge badge-unavailable">${t('unavailable')}</span>` : ''}
        </div>
      </div>
      <div class="menu-card-body">
        <div class="menu-card-cat">${catName}</div>
        <div class="menu-card-name">${name}</div>
        <div class="menu-card-desc">${desc || ''}</div>
        <div class="menu-card-meta">
          ${item.calories ? `<span class="menu-card-meta-item">🔥 ${item.calories} ${t('cal')}</span>` : ''}
          ${item.prep_time_min ? `<span class="menu-card-meta-item">⏱ ${item.prep_time_min} ${t('min')}</span>` : ''}
        </div>
        <div class="menu-card-footer">
          <div class="menu-card-price">
            ${fmt(item.price)}
          </div>
          ${item.available ? (inCart ? `
            <div class="qty-controls">
              <button class="qty-btn" onclick="changeCartQty('${item.id}',-1)">−</button>
              <span class="qty-num">${inCart.qty}</span>
              <button class="qty-btn" onclick="changeCartQty('${item.id}',1)">+</button>
            </div>
          ` : `
            <button class="add-btn" onclick="addToCart('${item.id}')">+</button>
          `) : ''}
        </div>
      </div>
    </div>`;
  }).join('');
  animateMenuCards();
}

// ═══════════════════════════════════════════════════
//  CART
// ═══════════════════════════════════════════════════
function addToCart(itemId) {
  const item = App.menu.find(i => i.id === itemId);
  if (!item || !item.available) return;
  const existing = App.cart.find(c => c.id === itemId);
  if (existing) existing.qty++;
  else App.cart.push({ ...item, qty: 1 });
  renderCart();
  renderMenuGrid();
  updateCartBadge();
  toast(t('addedToCart'), 'success');
  // Animate add
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(`#card-${itemId}`, { scale: 1 }, { scale: 1.03, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.inOut' });
  }
}

function changeCartQty(itemId, delta) {
  const idx = App.cart.findIndex(c => c.id === itemId);
  if (idx === -1) return;
  App.cart[idx].qty += delta;
  if (App.cart[idx].qty <= 0) App.cart.splice(idx, 1);
  renderCart();
  renderMenuGrid();
  updateCartBadge();
}

function removeFromCart(itemId) {
  App.cart = App.cart.filter(c => c.id !== itemId);
  renderCart();
  renderMenuGrid();
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const total = App.cart.reduce((a, i) => a + i.qty, 0);
  badge.textContent = total;
  badge.classList.toggle('hidden', total === 0);
  if (total > 0 && typeof gsap !== 'undefined') {
    gsap.fromTo(badge, { scale: 1.5 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
  }
}

function cartSubtotal() { return App.cart.reduce((a, i) => a + i.price * i.qty, 0); }
function cartTotal() {
  const sub = cartSubtotal();
  const tax = sub * 0.14;
  const svc = sub * 0.10;
  const disc = App.coupon ? sub * App.coupon.discount_pct / 100 : 0;
  return { sub, tax, svc, disc, total: sub + tax + svc - disc };
}

function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  const summaryEl = document.getElementById('cartSummary');

  if (!App.cart.length) {
    itemsEl.innerHTML = `<div class="cart-empty">
      <div class="cart-empty-icon">🛒</div>
      <div class="cart-empty-text">${t('emptyCart')}</div>
      <button class="btn btn-ghost" onclick="closeCart();scrollToMenu()">${t('browseMenu')}</button>
    </div>`;
    footer.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = App.cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image_url}"
        onerror="this.src='https://via.placeholder.com/70x60/1a1a1a/444'" alt="${isAr() ? item.name_ar : item.name}">
      <div class="cart-item-info">
        <div class="cart-item-name">${isAr() ? item.name_ar : item.name}</div>
        <div class="cart-item-price">${fmt(item.price)}</div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn" onclick="changeCartQty('${item.id}',-1)">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn" onclick="changeCartQty('${item.id}',1)">+</button>
        </div>
      </div>
      <span class="cart-item-del" onclick="removeFromCart('${item.id}')">✕</span>
    </div>
  `).join('');

  footer.style.display = 'block';
  const { sub, tax, svc, disc, total } = cartTotal();
  summaryEl.innerHTML = `
    <div class="cart-sum-row"><span>${t('subtotal')}</span><span>${fmt(sub)}</span></div>
    <div class="cart-sum-row"><span>${t('tax')}</span><span>${fmt(tax)}</span></div>
    <div class="cart-sum-row"><span>${t('service')}</span><span>${fmt(svc)}</span></div>
    ${disc > 0 ? `<div class="cart-sum-row" style="color:#22c55e"><span>${t('discount')} (${App.coupon.discount_pct}%)</span><span>-${fmt(disc)}</span></div>` : ''}
    <div class="cart-sum-row total"><span>${t('grandTotal')}</span><span class="val">${fmt(total)}</span></div>
  `;
}

function openCart() {
  renderCart();
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-drawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-drawer').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Coupon ─────────────────────────────────────────
async function applyCoupon() {
  const code = document.getElementById('couponInput').value.trim();
  if (!code) return;
  try {
    const coupon = await DB.validateCoupon(code);
    if (coupon) {
      App.coupon = coupon;
      toast(t('couponApplied'), 'success');
      renderCart();
    } else {
      toast(t('couponInvalid'), 'error');
    }
  } catch { toast(t('couponInvalid'), 'error'); }
}

// ═══════════════════════════════════════════════════
//  CHECKOUT
// ═══════════════════════════════════════════════════
function openCheckout() {
  const notes = document.getElementById('orderNotes').value;
  const { total } = cartTotal();
  const root = document.getElementById('modal-root');
  // If table came from NFC URL, lock it — customer cannot change it
  const tableFromNFC = new URLSearchParams(window.location.search).get('table');
  const tableLocked = !!tableFromNFC;

  // Load InstaPay link from settings
  const instapayLink = App.settings.instapay_link || '';

  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this)closeCheckoutModal()">
    <div class="modal">
      <h2>${isAr() ? 'تأكيد طلبك' : 'Confirm Your Order'}</h2>
      <div class="form-group">
        <label class="form-label">${t('tableLabel')}</label>
        <input class="form-control" id="checkoutTable" type="number" min="1" max="20"
          value="${App.tableNumber || ''}" placeholder="e.g. 5"
          ${tableLocked ? 'readonly style="opacity:0.6;cursor:not-allowed"' : ''}>
        ${tableLocked ? `<div style="font-size:12px;color:var(--accent);margin-top:4px">📍 Auto-detected from your table</div>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">${t('nameLabel')}</label>
        <input class="form-control" id="checkoutName" placeholder="${isAr() ? 'اختياري' : 'Optional'}">
      </div>

      <!-- Payment Method -->
      <div class="form-group">
        <label class="form-label">${isAr() ? 'طريقة الدفع' : 'Payment Method'}</label>
        <div id="paymentMethods" style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
          <!-- Cash -->
          <label id="pm-cash" onclick="selectPayment('cash')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--radius);border:2px solid var(--accent);cursor:pointer;transition:all 0.2s;background:rgba(255,107,53,0.08)">
            <span style="font-size:22px">💵</span>
            <div>
              <div style="font-weight:600;font-size:14px">${isAr() ? 'كاش عند الاستلام' : 'Cash on Arrival'}</div>
              <div style="font-size:12px;color:var(--text2)">${isAr() ? 'ادفع نقداً عند وصول الطلب' : 'Pay cash when your order arrives'}</div>
            </div>
            <span id="pm-check-cash" style="margin-left:auto;color:var(--accent);font-size:18px">✓</span>
          </label>
          <!-- Card -->
          <label id="pm-card" onclick="selectPayment('card')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--radius);border:2px solid var(--border2);cursor:pointer;transition:all 0.2s">
            <span style="font-size:22px">💳</span>
            <div>
              <div style="font-weight:600;font-size:14px">${isAr() ? 'بطاقة عند الاستلام' : 'Card on Arrival'}</div>
              <div style="font-size:12px;color:var(--text2)">${isAr() ? 'ادفع بالبطاقة عند وصول الطلب' : 'Pay by card when your order arrives'}</div>
            </div>
            <span id="pm-check-card" style="margin-left:auto;color:var(--accent);font-size:18px;display:none">✓</span>
          </label>
          <!-- InstaPay -->
          <label id="pm-instapay" onclick="selectPayment('instapay')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--radius);border:2px solid var(--border2);cursor:pointer;transition:all 0.2s">
            <span style="font-size:22px">📱</span>
            <div>
              <div style="font-weight:600;font-size:14px">${isAr() ? 'إنستاباي مصر' : 'InstaPay Egypt'}</div>
              <div style="font-size:12px;color:var(--text2)">${isAr() ? 'ارسل المبلغ وأرفق لقطة الشاشة' : 'Transfer the amount and upload screenshot'}</div>
            </div>
            <span id="pm-check-instapay" style="margin-left:auto;color:var(--accent);font-size:18px;display:none">✓</span>
          </label>
        </div>
      </div>

      <!-- InstaPay details (shown only when instapay selected) -->
      <div id="instapay-section" style="display:none;margin-bottom:16px;padding:16px;background:rgba(255,107,53,0.06);border:1px solid rgba(255,107,53,0.2);border-radius:var(--radius)">
        ${instapayLink ? `
        <div style="font-size:13px;color:var(--text2);margin-bottom:10px">${isAr() ? '١. اضغط الرابط أدناه للدفع:' : '1. Click the link below to pay:'}</div>
        <a href="${instapayLink}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:var(--accent);color:#fff;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:14px">
          📲 ${isAr() ? 'افتح رابط الدفع' : 'Open Payment Link'} ↗
        </a>` : `<div style="font-size:13px;color:var(--text2);margin-bottom:14px">📲 ${isAr() ? 'أرسل المبلغ عبر إنستاباي ثم ارفق الإيصال:' : 'Transfer the amount via InstaPay, then upload receipt:'}</div>`}
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px">${isAr() ? (instapayLink ? '٢. ارفق لقطة تأكيد الدفع:' : 'ارفق لقطة تأكيد الدفع:') : (instapayLink ? '2. Upload your payment confirmation screenshot:' : 'Upload your payment confirmation screenshot:')}</div>
        <label style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:2px dashed var(--border2);border-radius:var(--radius);cursor:pointer;transition:border-color 0.2s" id="screenshot-drop-zone" ondragover="event.preventDefault();this.style.borderColor='var(--accent)'" ondragleave="this.style.borderColor='var(--border2)'" ondrop="handleScreenshotDrop(event)">
          <input type="file" id="instapayScreenshot" accept="image/*" style="display:none" onchange="previewScreenshot(this)">
          <div id="screenshot-preview-wrap" style="display:none;width:100%">
            <img id="screenshot-preview-img" style="width:100%;max-height:180px;object-fit:contain;border-radius:8px">
            <div style="text-align:center;margin-top:8px;font-size:12px;color:var(--success)">✓ ${isAr() ? 'تم تحميل الصورة' : 'Screenshot uploaded'}</div>
          </div>
          <div id="screenshot-placeholder" style="text-align:center">
            <div style="font-size:28px;margin-bottom:4px">📷</div>
            <div style="font-size:13px;color:var(--text2)">${isAr() ? 'اضغط لرفع لقطة الشاشة' : 'Tap to upload screenshot'}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">PNG, JPG</div>
          </div>
          <button type="button" onclick="document.getElementById('instapayScreenshot').click()" style="padding:8px 18px;border-radius:50px;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:13px;cursor:pointer">${isAr() ? 'اختر صورة' : 'Choose Image'}</button>
        </label>
      </div>

      <!-- Order summary -->
      <div style="background:var(--surface);border-radius:var(--radius);padding:16px;margin-bottom:20px;font-size:14px">
        ${App.cart.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span>${isAr() ? i.name_ar : i.name} ×${i.qty}</span>
          <span style="color:var(--accent);font-weight:600">${fmt(i.price * i.qty)}</span>
        </div>`).join('')}
        <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px;display:flex;justify-content:space-between;font-weight:700;font-size:16px">
          <span>${t('grandTotal')}</span>
          <span style="color:var(--accent)">${fmt(total)}</span>
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-primary" onclick="confirmOrder()" style="flex:1;padding:14px">${t('confirmOrder')}</button>
        <button class="btn btn-ghost" onclick="closeCheckoutModal()" style="padding:14px 20px">${t('cancel')}</button>
      </div>
    </div>
  </div>`;

  // Initialize payment selection state
  App._selectedPayment = 'cash';
}

function closeCheckoutModal() {
  document.getElementById('modal-root').innerHTML = '';
  App._selectedPayment = 'cash';
  App._screenshotBase64 = null;
}

function selectPayment(method) {
  App._selectedPayment = method;
  const methods = ['cash','card','instapay'];
  methods.forEach(m => {
    const el = document.getElementById('pm-' + m);
    const check = document.getElementById('pm-check-' + m);
    if (el) {
      if (m === method) {
        el.style.border = '2px solid var(--accent)';
        el.style.background = 'rgba(255,107,53,0.08)';
        if (check) check.style.display = '';
      } else {
        el.style.border = '2px solid var(--border2)';
        el.style.background = 'transparent';
        if (check) check.style.display = 'none';
      }
    }
  });
  const instasec = document.getElementById('instapay-section');
  if (instasec) instasec.style.display = method === 'instapay' ? 'block' : 'none';
}

function previewScreenshot(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    App._screenshotBase64 = e.target.result;
    const preview = document.getElementById('screenshot-preview-img');
    const previewWrap = document.getElementById('screenshot-preview-wrap');
    const placeholder = document.getElementById('screenshot-placeholder');
    if (preview) preview.src = e.target.result;
    if (previewWrap) previewWrap.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function handleScreenshotDrop(event) {
  event.preventDefault();
  document.getElementById('screenshot-drop-zone').style.borderColor = 'var(--border2)';
  const file = event.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const input = document.getElementById('instapayScreenshot');
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  previewScreenshot(input);
}

async function confirmOrder() {
  const tableInput = document.getElementById('checkoutTable');
  const nameInput = document.getElementById('checkoutName');
  const table = parseInt(tableInput?.value);
  if (!table || table < 1) {
    toast(isAr() ? 'أدخل رقم الطاولة' : 'Enter a valid table number', 'error');
    return;
  }

  const { sub, tax, svc, disc, total } = cartTotal();
  const notes = document.getElementById('orderNotes')?.value || '';

  // Validate instapay screenshot
  const paymentMethod = App._selectedPayment || 'cash';
  if (paymentMethod === 'instapay' && !App._screenshotBase64) {
    toast(isAr() ? 'يرجى رفع لقطة شاشة الدفع عبر إنستاباي' : 'Please upload your InstaPay payment screenshot', 'error');
    return;
  }

  // Build order — only include optional columns if they exist in DB
  const orderData = {
    table_number: table,
    items: App.cart.map(i => ({
      id: i.id, name: i.name, name_ar: i.name_ar,
      price: i.price, qty: i.qty, subtotal: i.price * i.qty
    })),
    total: parseFloat(total.toFixed(2)),
    status: 'pending',
    payment_method: paymentMethod,
  };
  // Safely add optional columns (added via patch SQL)
  try { orderData.subtotal       = parseFloat(sub.toFixed(2)); } catch(e) {}
  try { orderData.tax            = parseFloat(tax.toFixed(2)); } catch(e) {}
  try { orderData.service_charge = parseFloat(svc.toFixed(2)); } catch(e) {}
  try { orderData.discount       = parseFloat(disc.toFixed(2)); } catch(e) {}
  try { orderData.notes          = notes || null; } catch(e) {}
  try { orderData.coupon_code    = App.coupon?.code || null; } catch(e) {}
  try { orderData.customer_name  = nameInput?.value?.trim() || null; } catch(e) {}
  // Attach instapay screenshot if provided
  if (paymentMethod === 'instapay' && App._screenshotBase64) {
    try { orderData.instapay_screenshot = App._screenshotBase64; } catch(e) {}
  }

  try {
    const order = await DB.insertOrder(orderData);
    if (App.coupon) await DB.incrementCouponUse(App.coupon.id);
    App.currentOrderId = order.id;
    App.tableNumber = table;
    App.cart = [];
    App.coupon = null;
    App._selectedPayment = 'cash';
    App._screenshotBase64 = null;
    updateCartBadge();
    closeCart();
    document.getElementById('modal-root').innerHTML = '';
    showOrderSuccess(order);
    subscribeToOrderUpdates(order.id);
  } catch (err) {
    console.error('Order insert error:', err);
    const msg = err?.message || 'Unknown error';
    toast((isAr() ? 'خطأ: ' : 'DB Error: ') + msg, 'error', 6000);
  }
}

function showOrderSuccess(order) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
  <div class="modal-overlay">
    <div class="modal" style="text-align:center;max-width:420px">
      <div style="font-size:72px;margin-bottom:16px;animation:float 2s ease-in-out infinite">✅</div>
      <h2 style="margin-bottom:8px">${t('orderPlaced')}</h2>
      <p style="color:var(--text2);margin-bottom:8px">${t('orderConfirm')}</p>
      <div style="background:var(--surface);border-radius:var(--radius);padding:12px 20px;margin:20px 0;display:inline-block">
        <div style="font-size:12px;color:var(--text3);margin-bottom:4px">${isAr() ? 'رقم الطلب' : 'ORDER'}</div>
        <div style="font-size:28px;font-weight:800;color:var(--accent)">#${order.order_number}</div>
      </div>
      <p style="color:var(--text3);font-size:13px;margin-bottom:24px">${isAr() ? 'الطاولة' : 'Table'} ${order.table_number}</p>
      <button class="btn btn-primary" onclick="document.getElementById('modal-root').innerHTML='';showTrackingForOrder('${order.id}')" style="width:100%;margin-bottom:10px">${t('trackOrder')}</button>
      <button class="btn btn-ghost" onclick="document.getElementById('modal-root').innerHTML=''" style="width:100%">${isAr() ? 'العودة للقائمة' : 'Back to Menu'}</button>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════
//  ORDER TRACKING
// ═══════════════════════════════════════════════════
const STATUS_STEPS = ['pending','confirmed','preparing','ready','done'];

function showTracking() {
  scrollToTracking();
}

function showTrackingForOrder(orderId) {
  const section = document.getElementById('tracking-section');
  section.classList.remove('hidden');
  scrollToTracking();
  loadOrderStatus(orderId);
}

async function trackOrder() {
  const val = document.getElementById('track-input').value.trim();
  if (!val) return;
  try {
    const order = await DB.getOrderById(val);
    renderTrackingCard(order);
    subscribeToOrderUpdates(val);
  } catch {
    toast(isAr() ? 'لم يتم العثور على الطلب' : 'Order not found', 'error');
  }
}

async function loadOrderStatus(orderId) {
  try {
    const order = await DB.getOrderById(orderId);
    renderTrackingCard(order);
  } catch (e) { console.error(e); }
}

function renderTrackingCard(order) {
  const card = document.getElementById('tracking-card');
  const currentIdx = STATUS_STEPS.indexOf(order.status);
  const labels = [t('pending'), t('confirmed'), t('preparing'), t('ready'), t('done')];
  const icons = ['📥', '✅', '👨‍🍳', '🔔', '🍽️'];

  const steps = STATUS_STEPS.map((step, i) => {
    const done = i < currentIdx;
    const active = i === currentIdx;
    const cls = done ? 'done' : active ? 'active' : '';
    return `
      ${i > 0 ? `<div class="tracking-line ${done ? 'done' : ''}"></div>` : ''}
      <div class="tracking-step ${cls}">
        <div class="tracking-step-circle">${icons[i]}</div>
        <div class="tracking-step-label">${labels[i]}</div>
      </div>`;
  }).join('');

  card.innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin-bottom:6px">${isAr() ? 'رقم الطلب' : 'Order'}</div>
    <div style="font-size:32px;font-weight:800;color:var(--accent);margin-bottom:4px">#${order.order_number}</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:28px">${isAr() ? 'طاولة' : 'Table'} ${order.table_number}</div>
    <div class="tracking-steps">${steps}</div>
    <div style="margin-top:24px;font-size:14px;color:var(--text2)">
      ${order.items.map(i => `${isAr() ? i.name_ar : i.name} ×${i.qty}`).join(' · ')}
    </div>
    <div style="margin-top:12px;font-size:18px;font-weight:700;color:var(--accent)">${fmt(order.total)}</div>
  `;
}

function subscribeToOrderUpdates(orderId) {
  if (App.orderChannel) DB.unsubscribe(App.orderChannel);
  // Firebase: subscribe to specific order document
  const unsub = firebase.firestore().collection('orders').doc(orderId)
    .onSnapshot(snap => {
      if (!snap.exists) return;
      const order = { id: snap.id, ...snap.data() };
      renderTrackingCard(order);
      if (order.status === 'ready') toast(isAr() ? 'طلبك جاهز! 🔔' : 'Your order is ready! 🔔', 'success');
    });
  App.orderChannel = { unsubscribe: unsub };
}

function subscribeToMenuChanges() {
  firebase.firestore().collection('menu_items').onSnapshot(() => {
    DB.getMenuItems().then(menu => {
      App.menu = menu;
      applyFilters();
    });
  });
}

// ═══════════════════════════════════════════════════
//  SCROLL HELPERS
// ═══════════════════════════════════════════════════
function scrollToTop() {
  if (typeof gsap !== 'undefined') gsap.to(window, { scrollTo: 0, duration: 0.8, ease: 'power3.inOut' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}
function scrollToMenu() {
  const el = document.getElementById('menu-section');
  if (typeof gsap !== 'undefined') gsap.to(window, { scrollTo: { y: el, offsetY: 80 }, duration: 0.8, ease: 'power3.inOut' });
  else el.scrollIntoView({ behavior: 'smooth' });
}
function scrollToFeatured() {
  const el = document.getElementById('featured-section');
  if (typeof gsap !== 'undefined') gsap.to(window, { scrollTo: { y: el, offsetY: 80 }, duration: 0.8, ease: 'power3.inOut' });
  else el.scrollIntoView({ behavior: 'smooth' });
}
function scrollToTracking() {
  const el = document.getElementById('tracking-section');
  el.classList.remove('hidden');
  if (typeof gsap !== 'undefined') gsap.to(window, { scrollTo: { y: el, offsetY: 80 }, duration: 0.8, ease: 'power3.inOut' });
  else el.scrollIntoView({ behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════
function toast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; setTimeout(() => el.remove(), 400); }, duration);
}

// ═══════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);
