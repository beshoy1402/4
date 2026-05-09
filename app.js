/* ═══════════════════════════════════════════════════
   FLAVOR HOUSE — Customer App v2
   New: AI recommendations, loyalty, feedback, share card,
   photo scan, dietary filter, prep timer, voice ordering,
   cart upsell, dynamic pricing, split bill
═══════════════════════════════════════════════════ */
'use strict';

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
  dietaryProfile: JSON.parse(localStorage.getItem('fh_dietary') || '{}'),
  pricingRules: [],
  activeDiscount: null,
  loyalty: null,
  _selectedPayment: 'cash',
  _screenshotBase64: null,
  _aiRecommendations: [],
  _upsellItem: null,
  _voiceListening: false,
};

// ── i18n (keep existing, add new keys) ─────────────
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
    aiMoodPlaceholder:'e.g. something spicy and light...',
    aiThinking:'Finding perfect dishes...',
    aiFor:'Recommended for you',
    loyaltyPunches:'Punches',
    loyaltyUntilFree:'until free meal',
    loyaltyFreeEarned:'Free meal earned!',
    dietaryTitle:'Dietary Preferences',
    shareTitle:'Share your meal',
    shareDesc:'Share on Instagram & get 10% off next visit',
    shareBtn:'Share & Get 10% Off',
    rateTitle:'How was your experience?',
    rateSkip:'Skip',
    rateSubmit:'Submit',
    upsellTitle:'You might also like',
    voiceHint:'Tap to speak your order',
    happyHour:'Happy Hour',
    scanDish:'Scan a dish',
    onlyLeft:'left',
    readyIn:'Ready in ~',
    preparingFor:'Preparing your order',
    phoneLabel:'Phone (for loyalty rewards)',
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
    aiMoodPlaceholder:'مثلاً: شيء خفيف ومشبع...',
    aiThinking:'جاري البحث عن أفضل الأطباق...',
    aiFor:'موصى به لك',
    loyaltyPunches:'طوابع',
    loyaltyUntilFree:'حتى الوجبة المجانية',
    loyaltyFreeEarned:'حصلت على وجبة مجانية!',
    dietaryTitle:'التفضيلات الغذائية',
    shareTitle:'شارك وجبتك',
    shareDesc:'شارك على إنستغرام واحصل على خصم 10% في زيارتك القادمة',
    shareBtn:'شارك واحصل على 10% خصم',
    rateTitle:'كيف كانت تجربتك؟',
    rateSkip:'تخطي',
    rateSubmit:'إرسال',
    upsellTitle:'قد يعجبك أيضاً',
    voiceHint:'اضغط للطلب بالصوت',
    happyHour:'ساعة سعيدة',
    scanDish:'امسح صورة الطبق',
    onlyLeft:'متبقي',
    readyIn:'جاهز خلال ~',
    preparingFor:'يتم تجهيز طلبك',
    phoneLabel:'رقم الهاتف (لمكافآت الولاء)',
  }
};
const t = (key) => (i18n[App.lang][key] || key);
const isAr = () => App.lang === 'ar';
const fmt = (n) => `${App.settings.currency_symbol || 'ج.م'} ${Math.round(n).toLocaleString()}`;

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
async function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('table')) {
    App.tableNumber = parseInt(params.get('table'));
    showTableBanner(App.tableNumber);
  } else {
    setTimeout(() => simulateNFC(), 1500);
  }

  initThreeHero();
  initGSAP();

  try {
    const [settings, categories, menu, rules] = await Promise.all([
      DB.getSettings(),
      DB.getCategories(),
      DB.getMenuItems(),
      DB.getPricingRules().catch(() => []),
    ]);
    App.settings = settings;
    App.categories = categories.filter(c => c.name !== 'All');
    App.menu = menu;
    App.filteredMenu = menu;
    App.pricingRules = rules;
    App.activeDiscount = DB.getActiveDiscount(rules);

    applySettings();
    renderCategories();
    renderFeatured();
    renderMenuGrid();
    renderDietaryBadges();
    renderHappyHourBanner();
    injectAIAdvisor();
    injectVoiceButton();
    injectPhotoScanButton();
    subscribeToMenuChanges();
    checkScheduledOrders();
  } catch (err) {
    console.error('Init error:', err);
    toast('Connection error. Retrying...', 'error');
    setTimeout(init, 3000);
  }
}

function applySettings() {
  const s = App.settings;
  const el = id => document.getElementById(id);

  // ── Accent color ──
  if (s.accent_color) document.documentElement.style.setProperty('--accent', s.accent_color);

  // ── Background / theme ──
  if (s.bg_color) document.documentElement.style.setProperty('--dark', s.bg_color);

  // ── Card border radius ──
  if (s.card_radius) {
    document.documentElement.style.setProperty('--radius', s.card_radius);
    document.documentElement.style.setProperty('--radius2', `calc(${s.card_radius} + 8px)`);
  }

  // ── Hero font ──
  if (s.hero_font) {
    document.querySelectorAll('.hero-title, .nav-logo, .footer-logo, .section-title').forEach(e => {
      e.style.fontFamily = `'${s.hero_font}', serif`;
    });
  }

  // ── WiFi ──
  if (el('wifiName')) el('wifiName').textContent = s.wifi_name || 'FH_Guest';
  if (el('wifiPass')) el('wifiPass').textContent = s.wifi_pass || 'flavorhouse2024';

  // ── Footer tagline ──
  if (el('footerTagline')) el('footerTagline').textContent = s.tagline || t('footer');

  // ── Hero text ──
  if (el('heroTitle1') && s.hero_title1) el('heroTitle1').textContent = s.hero_title1;
  if (el('heroTitle2') && s.hero_title2) el('heroTitle2').textContent = s.hero_title2;
  if (el('heroSubtitle') && s.hero_subtitle) el('heroSubtitle').textContent = s.hero_subtitle;

  // ── Hero stats ──
  if (el('heroStat1Num')   && s.stat1_num)   el('heroStat1Num').textContent   = s.stat1_num;
  if (el('heroStat1Label') && s.stat1_label) el('heroStat1Label').textContent = s.stat1_label;
  if (el('heroStat2Num')   && s.stat2_num)   el('heroStat2Num').textContent   = s.stat2_num;
  if (el('heroStat2Label') && s.stat2_label) el('heroStat2Label').textContent = s.stat2_label;
  if (el('heroStat3Num')   && s.stat3_num)   el('heroStat3Num').textContent   = s.stat3_num;
  if (el('heroStat3Label') && s.stat3_label) el('heroStat3Label').textContent = s.stat3_label;

  // ── Menu section labels ──
  if (el('menuLabel') && s.menu_section_label) el('menuLabel').textContent = isAr() ? (s.menu_section_label_ar || s.menu_section_label) : s.menu_section_label;
  if (el('menuTitle') && s.menu_section_title) el('menuTitle').textContent = s.menu_section_title;

  // ── Restaurant name in nav + footer ──
  const rName = s.restaurant_name || 'Flavor House';
  document.querySelectorAll('.nav-logo span.brand-name, .footer-logo span.brand-name').forEach(e => e.textContent = rName);
}

function simulateNFC() { App.tableNumber = 5; showTableBanner(5); }

// ═══════════════════════════════════════════════════
//  HAPPY HOUR BANNER
// ═══════════════════════════════════════════════════
function renderHappyHourBanner() {
  if (!App.activeDiscount) return;
  const d = App.activeDiscount;
  const banner = document.createElement('div');
  banner.id = 'happy-hour-banner';
  banner.style.cssText = `position:fixed;top:70px;left:0;right:0;z-index:89;background:var(--accent);color:#fff;text-align:center;padding:8px 16px;font-size:13px;font-weight:600;`;
  banner.textContent = `🎉 ${t('happyHour')}: ${d.label} — ${d.discount_pct}% off until ${Math.floor(d.end_hour)}:${String(Math.round((d.end_hour % 1) * 60)).padStart(2,'0')}`;
  document.body.prepend(banner);
}

// ═══════════════════════════════════════════════════
//  DIETARY FILTER
// ═══════════════════════════════════════════════════
const DIETARY_OPTIONS = [
  { id:'vegan', label:'🌱 Vegan', label_ar:'نباتي صرف' },
  { id:'vegetarian', label:'🥗 Vegetarian', label_ar:'نباتي' },
  { id:'gluten_free', label:'🌾 Gluten-Free', label_ar:'خالي من الجلوتين' },
  { id:'halal', label:'☪️ Halal only', label_ar:'حلال فقط' },
  { id:'nut_free', label:'🥜 Nut-Free', label_ar:'خالي من المكسرات' },
  { id:'dairy_free', label:'🥛 Dairy-Free', label_ar:'خالي من الألبان' },
];

function renderDietaryBadges() {
  // Inject dietary filter toggle near search
  const search = document.querySelector('.search-wrap');
  if (!search) return;
  const wrap = document.createElement('div');
  wrap.id = 'dietary-wrap';
  wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;justify-content:center';
  wrap.innerHTML = `
    <span style="font-size:12px;color:var(--text3);font-weight:600;letter-spacing:.5px">DIET:</span>
    ${DIETARY_OPTIONS.map(d => `
      <button id="diet-${d.id}" onclick="toggleDietary('${d.id}')"
        style="padding:5px 12px;border-radius:50px;font-size:12px;cursor:pointer;border:1px solid var(--border);background:${App.dietaryProfile[d.id] ? 'var(--accent)' : 'var(--surface)'};color:${App.dietaryProfile[d.id] ? '#fff' : 'var(--text2)'};transition:all .2s"
      >${isAr() ? d.label_ar : d.label}</button>
    `).join('')}
  `;
  search.after(wrap);
}

function toggleDietary(id) {
  App.dietaryProfile[id] = !App.dietaryProfile[id];
  localStorage.setItem('fh_dietary', JSON.stringify(App.dietaryProfile));
  const btn = document.getElementById('diet-' + id);
  if (btn) {
    btn.style.background = App.dietaryProfile[id] ? 'var(--accent)' : 'var(--surface)';
    btn.style.color = App.dietaryProfile[id] ? '#fff' : 'var(--text2)';
  }
  applyFilters();
}

function matchesDietary(item) {
  const active = Object.keys(App.dietaryProfile).filter(k => App.dietaryProfile[k]);
  if (!active.length) return true;
  const tags = (item.tags || []).map(t => t.toLowerCase());
  return active.every(d => tags.includes(d.replace('_','-')) || tags.includes(d));
}

// ═══════════════════════════════════════════════════
//  AI ADVISOR
// ═══════════════════════════════════════════════════
function injectAIAdvisor() {
  if (!window.ANTHROPIC_KEY) return;
  const menuSection = document.getElementById('menu-section');
  if (!menuSection) return;
  const wrap = document.createElement('div');
  wrap.id = 'ai-advisor';
  wrap.style.cssText = 'max-width:520px;margin:0 auto 40px;';
  wrap.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(255,107,53,.12),rgba(255,107,53,.04));border:1px solid rgba(255,107,53,.25);border-radius:20px;padding:20px 24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="font-size:22px">🧠</span>
        <div>
          <div style="font-size:14px;font-weight:700">AI Meal Advisor</div>
          <div style="font-size:12px;color:var(--text2)">Tell me what you feel like eating</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <input id="aiMoodInput" placeholder="${t('aiMoodPlaceholder')}"
          style="flex:1;padding:11px 16px;border-radius:50px;background:rgba(255,255,255,.06);border:1px solid rgba(255,107,53,.25);color:var(--text);font-size:14px;outline:none"
          onkeydown="if(event.key==='Enter')aiGetRecommendations()">
        <button onclick="aiGetRecommendations()"
          style="padding:11px 18px;border-radius:50px;background:var(--accent);color:#fff;border:none;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap">
          ✨ Ask
        </button>
      </div>
      <div id="aiResults" style="margin-top:14px"></div>
    </div>`;
  const sectionHeader = menuSection.querySelector('.section-header');
  if (sectionHeader) sectionHeader.after(wrap); else menuSection.prepend(wrap);
}

async function aiGetRecommendations() {
  const input = document.getElementById('aiMoodInput');
  if (!input || !input.value.trim()) return;
  const resultsEl = document.getElementById('aiResults');
  resultsEl.innerHTML = `<div style="font-size:13px;color:var(--text2);text-align:center;padding:8px">${t('aiThinking')}</div>`;
  try {
    const recs = await AI.recommend(input.value.trim(), App.menu, App.lang);
    App._aiRecommendations = recs;
    if (!recs.length) { resultsEl.innerHTML = `<div style="font-size:13px;color:var(--text3);text-align:center;padding:8px">No matches found. Try different words.</div>`; return; }
    resultsEl.innerHTML = `<div style="font-size:11px;color:var(--accent);font-weight:600;letter-spacing:1px;margin-bottom:10px">${t('aiFor').toUpperCase()}</div>` +
      recs.map(r => {
        const item = App.menu.find(i => i.id === r.id || i.name === r.name);
        if (!item) return '';
        const inCart = App.cart.find(c => c.id === item.id);
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <img src="${item.image_url}" style="width:52px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0" onerror="this.src='https://via.placeholder.com/52x44/1a1a1a/444'">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700">${item.name}</div>
            <div style="font-size:12px;color:var(--text2)">${r.reason}</div>
          </div>
          <div style="flex-shrink:0;text-align:right">
            <div style="font-size:14px;font-weight:800;color:var(--accent)">${fmt(item.price)}</div>
            ${item.available && !inCart ? `<button onclick="addToCart('${item.id}')" style="margin-top:4px;padding:5px 12px;border-radius:50px;background:var(--accent);color:#fff;border:none;font-size:12px;cursor:pointer">+ Add</button>` : ''}
          </div>
        </div>`;
      }).join('');
  } catch(e) { resultsEl.innerHTML = `<div style="font-size:13px;color:var(--text3)">AI unavailable — check ANTHROPIC_KEY in db.js</div>`; }
}

// ═══════════════════════════════════════════════════
//  VOICE ORDERING
// ═══════════════════════════════════════════════════
function injectVoiceButton() {
  const cartTitle = document.querySelector('.cart-title');
  if (!cartTitle) return;
  const btn = document.createElement('button');
  btn.id = 'voiceBtn';
  btn.title = t('voiceHint');
  btn.style.cssText = 'width:36px;height:36px;border-radius:50%;background:var(--surface2);border:1px solid var(--border2);color:var(--text2);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;margin-left:8px';
  btn.innerHTML = '🎤';
  btn.onclick = toggleVoiceOrder;
  cartTitle.parentNode.insertBefore(btn, cartTitle.nextSibling);
}

function toggleVoiceOrder() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Voice not supported in this browser', 'error'); return; }
  if (App._voiceListening) return;
  const rec = new SR();
  rec.lang = isAr() ? 'ar-EG' : 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  App._voiceListening = true;
  const btn = document.getElementById('voiceBtn');
  if (btn) { btn.innerHTML = '🔴'; btn.style.borderColor = 'var(--danger)'; }
  toast(isAr() ? 'استمع... تحدث الآن' : 'Listening... speak now', 'info', 4000);
  rec.onresult = async (e) => {
    const text = e.results[0][0].transcript;
    App._voiceListening = false;
    if (btn) { btn.innerHTML = '🎤'; btn.style.borderColor = 'var(--border2)'; }
    toast(`Heard: "${text}"`, 'info', 3000);
    // Parse via AI if available, else simple keyword match
    if (window.ANTHROPIC_KEY) {
      try {
        const menuNames = App.menu.filter(i=>i.available).map(i=>`[${i.id}] ${i.name}`).join('\n');
        const system = `Parse voice order for restaurant. Return ONLY JSON: {"items":[{"id":"...","qty":1}]}. Match to menu items by name.`;
        const res = await AI.callClaude(system, `Voice: "${text}"\nMenu:\n${menuNames}`, 200);
        const clean = res.replace(/```json|```/g,'').trim();
        const parsed = JSON.parse(clean);
        parsed.items?.forEach(({id, qty}) => {
          const item = App.menu.find(i => i.id === id);
          if (!item) return;
          const ex = App.cart.find(c => c.id === id);
          if (ex) ex.qty += qty; else App.cart.push({...item, qty});
        });
        renderCart(); updateCartBadge();
        toast(isAr() ? 'تمت إضافة الطلب!' : 'Order added from voice!', 'success');
      } catch { voiceFallback(text); }
    } else { voiceFallback(text); }
  };
  rec.onerror = () => {
    App._voiceListening = false;
    if (btn) { btn.innerHTML = '🎤'; btn.style.borderColor = 'var(--border2)'; }
    toast('Voice error', 'error');
  };
  rec.start();
}

function voiceFallback(text) {
  // Simple keyword match
  const lower = text.toLowerCase();
  let found = false;
  App.menu.filter(i=>i.available).forEach(item => {
    if (lower.includes(item.name.toLowerCase())) {
      addToCart(item.id); found = true;
    }
  });
  if (!found) toast(isAr() ? 'لم يتم التعرف على الطبق' : 'Could not match dish — try typing', 'error');
}

// ═══════════════════════════════════════════════════
//  PHOTO SCAN (Dish identification)
// ═══════════════════════════════════════════════════
function injectPhotoScanButton() {
  if (!window.ANTHROPIC_KEY) return;
  const searchWrap = document.querySelector('.search-wrap');
  if (!searchWrap) return;
  const btn = document.createElement('button');
  btn.id = 'photoScanBtn';
  btn.style.cssText = 'position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:20px;cursor:pointer;color:var(--text2);transition:color .2s';
  btn.innerHTML = '📷';
  btn.title = t('scanDish');
  btn.onclick = openPhotoScan;
  searchWrap.style.position = 'relative';
  searchWrap.appendChild(btn);
}

function openPhotoScan() {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this)closeCheckoutModal()">
    <div class="modal" style="max-width:400px;text-align:center">
      <h2 style="margin-bottom:8px">📷 ${t('scanDish')}</h2>
      <p style="font-size:13px;color:var(--text2);margin-bottom:20px">${isAr() ? 'التقط صورة لأي طبق وسنتعرف عليه' : 'Take a photo of any dish and we\'ll identify it'}</p>
      <label style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:50px;background:var(--accent);color:#fff;cursor:pointer;font-size:14px;font-weight:600">
        <input type="file" accept="image/*" capture="environment" id="dishPhotoInput" style="display:none" onchange="processDishPhoto(this)">
        📷 ${isAr() ? 'التقط صورة' : 'Take Photo'}
      </label>
      <div style="margin:12px 0;font-size:12px;color:var(--text3)">— or —</div>
      <label style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:50px;background:var(--surface2);border:1px solid var(--border2);color:var(--text2);cursor:pointer;font-size:13px">
        <input type="file" accept="image/*" id="dishPhotoUpload" style="display:none" onchange="processDishPhoto(this)">
        🖼️ ${isAr() ? 'رفع صورة' : 'Upload from gallery'}
      </label>
      <div id="scanResult" style="margin-top:16px"></div>
      <button onclick="closeCheckoutModal()" style="margin-top:16px;padding:10px 20px;border-radius:50px;background:var(--surface2);border:1px solid var(--border2);color:var(--text2);cursor:pointer;font-size:13px">Cancel</button>
    </div>
  </div>`;
}

async function processDishPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const resultEl = document.getElementById('scanResult');
  if (resultEl) resultEl.innerHTML = `<div style="font-size:13px;color:var(--text2)">🔍 Identifying dish...</div>`;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const result = await AI.identifyDish(e.target.result, App.menu);
      if (!result || !result.matched_name) {
        if (resultEl) resultEl.innerHTML = `<div style="font-size:13px;color:var(--text3)">Couldn't identify the dish. Try browsing the menu.</div>`;
        return;
      }
      const item = App.menu.find(i => i.name.toLowerCase() === result.matched_name.toLowerCase() || i.name === result.matched_name);
      if (!item || !item.available) {
        if (resultEl) resultEl.innerHTML = `<div style="font-size:13px;color:var(--text3)">${result.message || 'Dish not on our menu right now'}</div>`;
        return;
      }
      if (resultEl) resultEl.innerHTML = `
        <div style="background:var(--dark3);border-radius:14px;padding:14px;text-align:left">
          <div style="font-size:14px;font-weight:700;margin-bottom:4px">${item.name}</div>
          <div style="font-size:13px;color:var(--text2);margin-bottom:12px">${result.message || 'Found it!'} ${fmt(item.price)}</div>
          <button onclick="addToCart('${item.id}');closeCheckoutModal()" style="padding:10px 20px;border-radius:50px;background:var(--accent);color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;width:100%">
            + Add to Order
          </button>
        </div>`;
    } catch(e) {
      if (resultEl) resultEl.innerHTML = `<div style="font-size:13px;color:var(--text3)">AI unavailable</div>`;
    }
  };
  reader.readAsDataURL(input.files[0]);
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
  const allPill = `<button class="cat-pill${!App.activeCategory ? ' active' : ''}" onclick="filterByCategory(null)">✨ ${isAr() ? 'الكل' : 'All'}</button>`;
  const pills = App.categories.map(c => `
    <button class="cat-pill${App.activeCategory === c.id ? ' active' : ''}" onclick="filterByCategory('${c.id}')">
      ${c.icon} ${isAr() ? c.name_ar : c.name}
    </button>`).join('');
  bar.innerHTML = allPill + pills;
}

function filterByCategory(catId) { App.activeCategory = catId; applyFilters(); renderCategories(); }
function filterMenu() { App.searchQuery = document.getElementById('search-input').value.toLowerCase(); applyFilters(); }

function applyFilters() {
  let items = App.menu;
  if (App.activeCategory) items = items.filter(i => i.category_id === App.activeCategory);
  if (App.searchQuery) items = items.filter(i =>
    i.name.toLowerCase().includes(App.searchQuery) || i.name_ar?.includes(App.searchQuery) ||
    i.description?.toLowerCase().includes(App.searchQuery));
  // Dietary filter
  const hasActive = Object.values(App.dietaryProfile).some(Boolean);
  if (hasActive) {
    items = items.map(i => ({ ...i, _dietaryMismatch: !matchesDietary(i) }));
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
        <div class="featured-card-price">${fmt(getDisplayPrice(item))}</div>
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════
//  DYNAMIC PRICING HELPER
// ═══════════════════════════════════════════════════
function getDisplayPrice(item) {
  if (!App.activeDiscount) return item.price;
  return item.price * (1 - App.activeDiscount.discount_pct / 100);
}

// ═══════════════════════════════════════════════════
//  MENU GRID
// ═══════════════════════════════════════════════════
function renderMenuGrid() {
  const grid = document.getElementById('menu-grid');
  const items = App.filteredMenu;
  if (!items.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text2)"><div style="font-size:48px;margin-bottom:16px">🔍</div><div>No dishes found</div></div>`;
    return;
  }
  grid.innerHTML = items.map(item => {
    const inCart = App.cart.find(c => c.id === item.id);
    const name = isAr() ? item.name_ar : item.name;
    const desc = isAr() ? item.description_ar : item.description;
    const catName = item.categories ? (isAr() ? item.categories.name_ar : item.categories.name) : '';
    const displayPrice = getDisplayPrice(item);
    const isDimmed = item._dietaryMismatch;
    const stockLow = item.stock_count !== null && item.stock_count !== undefined && item.stock_count <= 5 && item.stock_count > 0;

    return `
    <div class="menu-card" id="card-${item.id}" style="${isDimmed ? 'opacity:.45;filter:grayscale(.5)' : ''}">
      <div class="menu-card-img">
        <img src="${item.image_url}" alt="${name}" onerror="this.src='https://via.placeholder.com/400x200/1a1a1a/444?text=🍽️'" loading="lazy">
        <div class="menu-card-overlay"></div>
        <div class="menu-card-badges">
          ${item.featured ? `<span class="badge badge-featured">⭐ ${t('featured')}</span>` : ''}
          ${!item.available ? `<span class="badge badge-unavailable">${t('unavailable')}</span>` : ''}
          ${stockLow ? `<span class="badge" style="background:rgba(239,68,68,.85);color:#fff">⚡ ${item.stock_count} ${t('onlyLeft')}</span>` : ''}
          ${App.activeDiscount ? `<span class="badge" style="background:rgba(34,197,94,.9);color:#fff">-${App.activeDiscount.discount_pct}%</span>` : ''}
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
            ${App.activeDiscount ? `<span style="text-decoration:line-through;color:var(--text3);font-size:14px;font-weight:400">${fmt(item.price)}</span><br>` : ''}
            ${fmt(displayPrice)}
          </div>
          ${item.available && !isDimmed ? (inCart ? `
            <div class="qty-controls">
              <button class="qty-btn" onclick="changeCartQty('${item.id}',-1)">−</button>
              <span class="qty-num">${inCart.qty}</span>
              <button class="qty-btn" onclick="changeCartQty('${item.id}',1)">+</button>
            </div>
          ` : `<button class="add-btn" onclick="addToCart('${item.id}')">+</button>`) : ''}
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
  const displayPrice = getDisplayPrice(item);
  if (existing) existing.qty++;
  else App.cart.push({ ...item, price: displayPrice, originalPrice: item.price, qty: 1 });
  renderCart(); renderMenuGrid(); updateCartBadge();
  toast(t('addedToCart'), 'success');
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(`#card-${itemId}`, { scale: 1 }, { scale: 1.03, duration: .15, yoyo: true, repeat: 1, ease: 'power2.inOut' });
  }
  // Trigger upsell after 3 items
  if (App.cart.length >= 2 && window.ANTHROPIC_KEY && !App._upsellItem) {
    triggerUpsell();
  }
}

async function triggerUpsell() {
  try {
    const suggestion = await AI.upsell(App.cart, App.menu, App.lang);
    if (!suggestion || !suggestion.id) return;
    const item = App.menu.find(i => i.id === suggestion.id);
    if (!item || !item.available) return;
    App._upsellItem = item;
    // Show upsell in cart
    renderCart();
  } catch {}
}

function changeCartQty(itemId, delta) {
  const idx = App.cart.findIndex(c => c.id === itemId);
  if (idx === -1) return;
  App.cart[idx].qty += delta;
  if (App.cart[idx].qty <= 0) App.cart.splice(idx, 1);
  renderCart(); renderMenuGrid(); updateCartBadge();
}

function removeFromCart(itemId) {
  App.cart = App.cart.filter(c => c.id !== itemId);
  renderCart(); renderMenuGrid(); updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const total = App.cart.reduce((a, i) => a + i.qty, 0);
  badge.textContent = total;
  badge.classList.toggle('hidden', total === 0);
  if (total > 0 && typeof gsap !== 'undefined')
    gsap.fromTo(badge, { scale: 1.5 }, { scale: 1, duration: .3, ease: 'back.out(2)' });
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
    App._upsellItem = null;
    return;
  }
  itemsEl.innerHTML = App.cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image_url}" onerror="this.src='https://via.placeholder.com/70x60/1a1a1a/444'" alt="${isAr() ? item.name_ar : item.name}">
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
    </div>`).join('') +
    // AI upsell
    (App._upsellItem ? `
    <div style="padding:12px 14px;border-radius:14px;background:rgba(255,107,53,.06);border:1px solid rgba(255,107,53,.2);margin-top:10px">
      <div style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.5px;margin-bottom:8px">✨ ${t('upsellTitle').toUpperCase()}</div>
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${App._upsellItem.image_url}" style="width:44px;height:38px;border-radius:8px;object-fit:cover" onerror="this.src='https://via.placeholder.com/44x38/1a1a1a/444'">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${App._upsellItem.name}</div>
          <div style="font-size:12px;color:var(--accent);font-weight:700">${fmt(App._upsellItem.price)}</div>
        </div>
        <button onclick="addToCart('${App._upsellItem.id}');App._upsellItem=null;renderCart()" style="padding:6px 14px;border-radius:50px;background:var(--accent);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer">+ Add</button>
        <button onclick="App._upsellItem=null;renderCart()" style="background:none;border:none;color:var(--text3);font-size:16px;cursor:pointer;padding:4px">✕</button>
      </div>
    </div>` : '');

  footer.style.display = 'block';
  const { sub, tax, svc, disc, total } = cartTotal();
  summaryEl.innerHTML = `
    <div class="cart-sum-row"><span>${t('subtotal')}</span><span>${fmt(sub)}</span></div>
    <div class="cart-sum-row"><span>${t('tax')}</span><span>${fmt(tax)}</span></div>
    <div class="cart-sum-row"><span>${t('service')}</span><span>${fmt(svc)}</span></div>
    ${disc > 0 ? `<div class="cart-sum-row" style="color:#22c55e"><span>${t('discount')}</span><span>-${fmt(disc)}</span></div>` : ''}
    <div class="cart-sum-row total"><span>${t('grandTotal')}</span><span class="val">${fmt(total)}</span></div>`;
}

function openCart() { renderCart(); document.getElementById('cart-overlay').classList.add('open'); document.getElementById('cart-drawer').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { document.getElementById('cart-overlay').classList.remove('open'); document.getElementById('cart-drawer').classList.remove('open'); document.body.style.overflow = ''; }

async function applyCoupon() {
  const code = document.getElementById('couponInput').value.trim();
  if (!code) return;
  try {
    const coupon = await DB.validateCoupon(code);
    if (coupon) { App.coupon = coupon; toast(t('couponApplied'), 'success'); renderCart(); }
    else toast(t('couponInvalid'), 'error');
  } catch { toast(t('couponInvalid'), 'error'); }
}

// ═══════════════════════════════════════════════════
//  CHECKOUT
// ═══════════════════════════════════════════════════
function openCheckout() {
  const { total } = cartTotal();
  const tableFromNFC = new URLSearchParams(window.location.search).get('table');
  const tableLocked = !!tableFromNFC;
  const instapayLink = App.settings.instapay_link || '';
  const root = document.getElementById('modal-root');
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this)closeCheckoutModal()" style="align-items:flex-start;padding:20px 0;overflow-y:auto">
    <div class="modal" style="max-height:none;overflow:visible;margin:auto">
      <h2>${isAr() ? 'تأكيد طلبك' : 'Confirm Your Order'}</h2>
      <div class="form-group">
        <label class="form-label">${t('tableLabel')}</label>
        <input class="form-control" id="checkoutTable" type="number" min="1" max="20" value="${App.tableNumber || ''}" placeholder="e.g. 5" ${tableLocked ? 'readonly style="opacity:0.6"' : ''}>
        ${tableLocked ? `<div style="font-size:12px;color:var(--accent);margin-top:4px">📍 Auto-detected from your table</div>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">${t('nameLabel')}</label>
        <input class="form-control" id="checkoutName" placeholder="${isAr() ? 'اختياري' : 'Optional'}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('phoneLabel')}</label>
        <input class="form-control" id="checkoutPhone" type="tel" placeholder="01xxxxxxxxx" oninput="loadLoyaltyPreview(this.value)">
        <div id="loyaltyPreview" style="margin-top:8px"></div>
      </div>
      <div class="form-group">
        <label class="form-label">${isAr() ? 'طريقة الدفع' : 'Payment Method'}</label>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
          <label id="pm-cash" onclick="selectPayment('cash')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--radius);border:2px solid var(--accent);cursor:pointer;background:rgba(255,107,53,0.08)">
            <span style="font-size:22px">💵</span>
            <div><div style="font-weight:600;font-size:14px">${isAr() ? 'كاش عند الاستلام' : 'Cash on Arrival'}</div></div>
            <span id="pm-check-cash" style="margin-left:auto;color:var(--accent);font-size:18px">✓</span>
          </label>
          <label id="pm-card" onclick="selectPayment('card')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--radius);border:2px solid var(--border2);cursor:pointer">
            <span style="font-size:22px">💳</span>
            <div><div style="font-weight:600;font-size:14px">${isAr() ? 'بطاقة' : 'Card on Arrival'}</div></div>
            <span id="pm-check-card" style="margin-left:auto;color:var(--accent);font-size:18px;display:none">✓</span>
          </label>
          <label id="pm-instapay" onclick="selectPayment('instapay')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--radius);border:2px solid var(--border2);cursor:pointer">
            <span style="font-size:22px">📱</span>
            <div><div style="font-weight:600;font-size:14px">InstaPay Egypt</div></div>
            <span id="pm-check-instapay" style="margin-left:auto;color:var(--accent);font-size:18px;display:none">✓</span>
          </label>
        </div>
      </div>
      <div id="instapay-section" style="display:none;margin-bottom:16px;padding:16px;background:rgba(255,107,53,0.06);border:1px solid rgba(255,107,53,0.2);border-radius:var(--radius)">
        ${instapayLink ? `<a href="${instapayLink}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:var(--accent);color:#fff;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:14px">📲 Open Payment Link ↗</a>` : ''}
        <label style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:2px dashed var(--border2);border-radius:var(--radius);cursor:pointer">
          <input type="file" id="instapayScreenshot" accept="image/*" style="display:none" onchange="previewScreenshot(this)">
          <div id="screenshot-preview-wrap" style="display:none;width:100%">
            <img id="screenshot-preview-img" style="width:100%;max-height:180px;object-fit:contain;border-radius:8px">
          </div>
          <div id="screenshot-placeholder" style="text-align:center">
            <div style="font-size:28px;margin-bottom:4px">📷</div>
            <div style="font-size:13px;color:var(--text2)">Tap to upload screenshot</div>
          </div>
          <button type="button" onclick="document.getElementById('instapayScreenshot').click()" style="padding:8px 18px;border-radius:50px;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:13px;cursor:pointer">Choose Image</button>
        </label>
      </div>
      <div style="background:var(--surface);border-radius:var(--radius);padding:16px;margin-bottom:20px;font-size:14px">
        ${App.cart.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>${isAr()?i.name_ar:i.name} ×${i.qty}</span><span style="color:var(--accent);font-weight:600">${fmt(i.price*i.qty)}</span></div>`).join('')}
        <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px;display:flex;justify-content:space-between;font-weight:700;font-size:16px">
          <span>${t('grandTotal')}</span><span style="color:var(--accent)">${fmt(total)}</span>
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-primary" onclick="confirmOrder()" style="flex:1;padding:14px">${t('confirmOrder')}</button>
        <button class="btn btn-ghost" onclick="closeCheckoutModal()" style="padding:14px 20px">${t('cancel')}</button>
      </div>
    </div>
  </div>`;
  App._selectedPayment = 'cash';
}

function closeCheckoutModal() { document.getElementById('modal-root').innerHTML = ''; App._selectedPayment = 'cash'; App._screenshotBase64 = null; }
function selectPayment(method) {
  App._selectedPayment = method;
  ['cash','card','instapay'].forEach(m => {
    const el = document.getElementById('pm-'+m);
    const check = document.getElementById('pm-check-'+m);
    if (el) { el.style.border = m===method ? '2px solid var(--accent)' : '2px solid var(--border2)'; el.style.background = m===method ? 'rgba(255,107,53,.08)' : 'transparent'; }
    if (check) check.style.display = m===method ? '' : 'none';
  });
  const s = document.getElementById('instapay-section');
  if (s) s.style.display = method === 'instapay' ? 'block' : 'none';
}

function previewScreenshot(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    App._screenshotBase64 = e.target.result;
    const img = document.getElementById('screenshot-preview-img');
    const wrap = document.getElementById('screenshot-preview-wrap');
    const ph = document.getElementById('screenshot-placeholder');
    if (img) img.src = e.target.result;
    if (wrap) wrap.style.display = 'block';
    if (ph) ph.style.display = 'none';
  };
  reader.readAsDataURL(input.files[0]);
}

async function loadLoyaltyPreview(phone) {
  if (phone.length < 10) return;
  const el = document.getElementById('loyaltyPreview');
  if (!el) return;
  try {
    const loyalty = await DB.getLoyalty(phone);
    if (loyalty) {
      const punches = loyalty.punch_count || 0;
      const dots = Array.from({length:10}, (_,i) => `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${i<punches?'var(--accent)':'var(--dark3)'};border:1px solid var(--border2);margin:2px"></span>`).join('');
      el.innerHTML = `<div style="background:rgba(255,107,53,.08);border:1px solid rgba(255,107,53,.2);border-radius:12px;padding:10px 14px">
        <div style="font-size:12px;color:var(--accent);font-weight:700;margin-bottom:8px">⭐ Loyalty Card</div>
        <div style="margin-bottom:6px">${dots}</div>
        <div style="font-size:12px;color:var(--text2)">${punches}/10 ${t('loyaltyPunches')} · ${loyalty.reward_coupon ? `<span style="color:var(--green);font-weight:600">🎉 ${t('loyaltyFreeEarned')} Code: ${loyalty.reward_coupon}</span>` : `${10-punches} ${t('loyaltyUntilFree')}`}</div>
      </div>`;
    }
  } catch {}
}

async function confirmOrder() {
  const tableInput = document.getElementById('checkoutTable');
  const table = parseInt(tableInput?.value);
  if (!table || table < 1) { toast(isAr() ? 'أدخل رقم الطاولة' : 'Enter table number', 'error'); return; }
  if (App._selectedPayment === 'instapay' && !App._screenshotBase64) { toast(isAr() ? 'يرجى رفع لقطة شاشة إنستاباي' : 'Upload InstaPay screenshot', 'error'); return; }
  const { sub, tax, svc, disc, total } = cartTotal();
  const phone = document.getElementById('checkoutPhone')?.value?.trim() || null;
  const orderData = {
    table_number: table,
    items: App.cart.map(i => ({id:i.id,name:i.name,name_ar:i.name_ar,price:i.price,qty:i.qty,subtotal:i.price*i.qty})),
    total: parseFloat(total.toFixed(2)),
    subtotal: parseFloat(sub.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    service_charge: parseFloat(svc.toFixed(2)),
    discount: parseFloat(disc.toFixed(2)),
    status: 'pending',
    payment_method: App._selectedPayment,
    customer_name: document.getElementById('checkoutName')?.value?.trim() || null,
    customer_phone: phone,
    notes: document.getElementById('orderNotes')?.value || null,
    coupon_code: App.coupon?.code || null,
    ...(App._selectedPayment === 'instapay' && App._screenshotBase64 ? { instapay_screenshot: App._screenshotBase64 } : {}),
    ...(App.activeDiscount ? { happy_hour: App.activeDiscount.label } : {}),
  };
  try {
    const order = await DB.insertOrder(orderData);
    if (App.coupon) await DB.incrementCouponUse(App.coupon.id);
    App.currentOrderId = order.id;
    App.tableNumber = table;
    App.cart = []; App.coupon = null; App._selectedPayment = 'cash'; App._screenshotBase64 = null; App._upsellItem = null;
    updateCartBadge(); closeCart();
    document.getElementById('modal-root').innerHTML = '';
    showOrderSuccess(order);
    subscribeToOrderUpdates(order.id);
  } catch(err) {
    toast((isAr() ? 'خطأ: ' : 'Error: ') + (err?.message || 'Unknown'), 'error', 6000);
  }
}

// ═══════════════════════════════════════════════════
//  ORDER SUCCESS + SHARE CARD
// ═══════════════════════════════════════════════════
function showOrderSuccess(order) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
  <div class="modal-overlay">
    <div class="modal" style="text-align:center;max-width:420px">
      <div style="font-size:72px;margin-bottom:16px;animation:float 2s ease-in-out infinite">✅</div>
      <h2 style="margin-bottom:8px">${t('orderPlaced')}</h2>
      <p style="color:var(--text2);margin-bottom:8px">${t('orderConfirm')}</p>
      <div style="background:var(--surface);border-radius:var(--radius);padding:12px 20px;margin:20px 0;display:inline-block">
        <div style="font-size:12px;color:var(--text3);margin-bottom:4px">${isAr()?'رقم الطلب':'ORDER'}</div>
        <div style="font-size:28px;font-weight:800;color:var(--accent)">#${order.order_number}</div>
      </div>
      <p style="color:var(--text3);font-size:13px;margin-bottom:24px">${isAr()?'الطاولة':'Table'} ${order.table_number}</p>
      <button class="btn btn-primary" onclick="document.getElementById('modal-root').innerHTML='';showTrackingForOrder('${order.id}')" style="width:100%;margin-bottom:10px">${t('trackOrder')}</button>
      <button class="btn btn-ghost" onclick="openShareCard('${order.id}',${order.order_number})" style="width:100%;margin-bottom:10px">📸 ${t('shareTitle')}</button>
      <button class="btn btn-ghost" onclick="document.getElementById('modal-root').innerHTML=''" style="width:100%">${isAr()?'العودة للقائمة':'Back to Menu'}</button>
    </div>
  </div>`;
}

async function openShareCard(orderId, orderNum) {
  document.getElementById('modal-root').innerHTML = '';
  const restName = App.settings.restaurant_name || 'Flavor House';
  const itemNames = App.menu.slice(0,1).map(i=>i.name).join(', ') || 'Amazing food';
  // Generate a share coupon
  let couponCode = '';
  try { couponCode = await DB.generateOneShotCoupon(10, 30, 'SHARE'); } catch {}
  const root = document.getElementById('modal-root');
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this)closeCheckoutModal()">
    <div class="modal" style="text-align:center;max-width:420px">
      <h2 style="margin-bottom:8px">📸 ${t('shareTitle')}</h2>
      <p style="font-size:13px;color:var(--text2);margin-bottom:20px">${t('shareDesc')}</p>
      <canvas id="shareCanvas" width="400" height="400" style="border-radius:16px;max-width:100%;border:1px solid var(--border)"></canvas>
      ${couponCode ? `<div style="margin:14px 0;padding:12px 20px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);border-radius:12px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">${isAr()?'كود الخصم الخاص بك':'Your discount code'}</div>
        <div style="font-size:20px;font-weight:800;color:var(--green);letter-spacing:2px">${couponCode}</div>
        <div style="font-size:11px;color:var(--text3)">10% off · valid 30 days</div>
      </div>` : ''}
      <button onclick="doShare('${restName}','${couponCode}')" style="width:100%;padding:14px;border-radius:50px;background:var(--accent);color:#fff;border:none;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px">
        📲 ${t('shareBtn')}
      </button>
      <button onclick="closeCheckoutModal()" style="padding:10px 20px;border-radius:50px;background:var(--surface2);border:1px solid var(--border2);color:var(--text2);cursor:pointer;font-size:13px">Cancel</button>
    </div>
  </div>`;
  // Draw canvas share card
  setTimeout(() => drawShareCanvas(restName, orderNum, couponCode), 100);
}

function drawShareCanvas(restName, orderNum, couponCode) {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 400, H = 400;
  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  // Accent border
  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, W-16, H-16);
  // Restaurant name
  ctx.fillStyle = '#FF6B35';
  ctx.font = 'bold 32px serif';
  ctx.textAlign = 'center';
  ctx.fillText(restName, W/2, 80);
  // Divider
  ctx.strokeStyle = 'rgba(255,107,53,.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40, 100); ctx.lineTo(W-40, 100); ctx.stroke();
  // Order info
  ctx.fillStyle = '#f0f0f0';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('I just placed an order! 🍽️', W/2, 150);
  ctx.fillStyle = '#aaa';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Order #${orderNum}`, W/2, 180);
  // Big emoji
  ctx.font = '80px sans-serif';
  ctx.fillText('🍽️', W/2, 280);
  // Coupon
  if (couponCode) {
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`Use code: ${couponCode} for 10% off`, W/2, 340);
  }
  ctx.fillStyle = '#555';
  ctx.font = '12px sans-serif';
  ctx.fillText('Crafted with passion. Served with love.', W/2, 380);
}

async function doShare(restName, couponCode) {
  const canvas = document.getElementById('shareCanvas');
  const text = `Just ordered at ${restName}! 🍽️ Amazing food${couponCode ? ` — use code ${couponCode} for 10% off your first visit!` : ''} #FlavorHouse #FoodLovers`;
  if (navigator.share && canvas) {
    try {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const file = new File([blob], 'flavorhouse.png', { type: 'image/png' });
      await navigator.share({ title: `Dining at ${restName}`, text, files: [file] });
      closeCheckoutModal();
      toast('Thanks for sharing! 🎉', 'success');
      return;
    } catch {}
  }
  // Fallback: download image
  if (canvas) {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'flavorhouse-meal.png';
    a.click();
    toast('Image saved! Share it on Instagram 📸', 'success');
  }
  closeCheckoutModal();
}

// ═══════════════════════════════════════════════════
//  ORDER TRACKING + PREP TIMER
// ═══════════════════════════════════════════════════
const STATUS_STEPS = ['pending','confirmed','preparing','ready','done'];

function showTracking() { scrollToTracking(); }
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
  } catch { toast(isAr() ? 'لم يتم العثور على الطلب' : 'Order not found', 'error'); }
}

async function loadOrderStatus(orderId) {
  try { const order = await DB.getOrderById(orderId); renderTrackingCard(order); } catch {}
}

function renderTrackingCard(order) {
  const card = document.getElementById('tracking-card');
  const currentIdx = STATUS_STEPS.indexOf(order.status);
  const labels = [t('pending'),t('confirmed'),t('preparing'),t('ready'),t('done')];
  const icons = ['📥','✅','👨‍🍳','🔔','🍽️'];

  // Prep timer
  let timerHtml = '';
  if (order.status === 'preparing' && order.prep_started_at) {
    const startTs = order.prep_started_at?.toDate ? order.prep_started_at.toDate() : new Date(order.prep_started_at);
    const elapsed = Math.floor((Date.now() - startTs.getTime()) / 60000);
    const avgPrepTime = order.items?.[0]?.prep_time_min || 15;
    const remaining = Math.max(0, avgPrepTime - elapsed);
    const pct = Math.min(100, Math.round(elapsed / avgPrepTime * 100));
    timerHtml = `
    <div style="background:rgba(255,107,53,.06);border:1px solid rgba(255,107,53,.2);border-radius:14px;padding:16px;margin:20px 0;text-align:left">
      <div style="font-size:12px;color:var(--accent);font-weight:700;margin-bottom:8px">⏱ ${t('preparingFor')}</div>
      <div style="font-size:22px;font-weight:800;margin-bottom:10px">${remaining > 0 ? `${t('readyIn')}${remaining} ${t('min')}` : '🔔 Almost ready!'}</div>
      <div style="height:6px;background:var(--dark3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:3px;transition:width 1s linear"></div>
      </div>
    </div>`;
  }

  const steps = STATUS_STEPS.map((step, i) => {
    const done = i < currentIdx, active = i === currentIdx;
    return `${i > 0 ? `<div class="tracking-line ${done ? 'done' : ''}"></div>` : ''}
    <div class="tracking-step ${done?'done':active?'active':''}">
      <div class="tracking-step-circle">${icons[i]}</div>
      <div class="tracking-step-label">${labels[i]}</div>
    </div>`;
  }).join('');

  card.innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin-bottom:6px">${isAr()?'رقم الطلب':'Order'}</div>
    <div style="font-size:32px;font-weight:800;color:var(--accent);margin-bottom:4px">#${order.order_number}</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:28px">${isAr()?'طاولة':'Table'} ${order.table_number}</div>
    ${timerHtml}
    <div class="tracking-steps">${steps}</div>
    <div style="margin-top:24px;font-size:14px;color:var(--text2)">${order.items?.map(i=>`${isAr()?i.name_ar:i.name} ×${i.qty}`).join(' · ')}</div>
    <div style="margin-top:12px;font-size:18px;font-weight:700;color:var(--accent)">${fmt(order.total)}</div>`;
}

function subscribeToOrderUpdates(orderId) {
  if (App.orderChannel) DB.unsubscribe(App.orderChannel);
  const unsub = firebase.firestore().collection('orders').doc(orderId)
    .onSnapshot(snap => {
      if (!snap.exists) return;
      const order = { id: snap.id, ...snap.data() };
      renderTrackingCard(order);
      if (order.status === 'ready') {
        toast(isAr() ? 'طلبك جاهز! 🔔' : 'Your order is ready! 🔔', 'success');
        showFeedbackPrompt(order);
      }
    });
  App.orderChannel = { unsubscribe: unsub };
}

// ═══════════════════════════════════════════════════
//  POST-MEAL FEEDBACK
// ═══════════════════════════════════════════════════
function showFeedbackPrompt(order) {
  // Show after 30s delay (order arrives, customer eats)
  setTimeout(() => {
    const root = document.getElementById('modal-root');
    if (root.innerHTML) return; // another modal open
    root.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeFeedback()">
      <div class="modal" style="text-align:center;max-width:380px">
        <h2 style="margin-bottom:8px">🍽️ ${t('rateTitle')}</h2>
        <p style="font-size:13px;color:var(--text2);margin-bottom:24px">Order #${order.order_number}</p>
        <div style="display:flex;justify-content:center;gap:20px;margin-bottom:20px">
          <button onclick="submitFeedback('${order.id}',${order.table_number},1)" style="font-size:44px;background:none;border:none;cursor:pointer;transition:transform .2s" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">😐</button>
          <button onclick="submitFeedback('${order.id}',${order.table_number},2)" style="font-size:44px;background:none;border:none;cursor:pointer;transition:transform .2s" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">😊</button>
          <button onclick="submitFeedback('${order.id}',${order.table_number},3)" style="font-size:44px;background:none;border:none;cursor:pointer;transition:transform .2s" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">🤩</button>
        </div>
        <button onclick="closeFeedback()" style="padding:8px 20px;border-radius:50px;background:var(--surface2);border:1px solid var(--border2);color:var(--text3);font-size:12px;cursor:pointer">${t('rateSkip')}</button>
      </div>
    </div>`;
  }, 30000);
}

async function submitFeedback(orderId, tableNumber, emoji) {
  const order = { items: App.menu.slice(0,1) }; // simplified
  if (emoji >= 2) {
    // Happy → show comment + offer Google Maps
    document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay">
      <div class="modal" style="text-align:center;max-width:380px">
        <div style="font-size:52px;margin-bottom:12px">${emoji === 3 ? '🤩' : '😊'}</div>
        <h2 style="margin-bottom:8px">${isAr() ? 'شكراً لك!' : 'Thanks!'}</h2>
        <p style="font-size:13px;color:var(--text2);margin-bottom:20px">${isAr() ? 'سعداء بإعجابك!' : 'We\'re glad you enjoyed it!'}</p>
        ${emoji === 3 ? `<button onclick="openGoogleMaps()" style="width:100%;padding:13px;border-radius:50px;background:#4285F4;color:#fff;border:none;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:10px">⭐ Leave a Google Review</button>` : ''}
        <button onclick="closeFeedback()" style="padding:10px 20px;border-radius:50px;background:var(--surface2);border:1px solid var(--border2);color:var(--text2);cursor:pointer;font-size:13px">Close</button>
      </div>
    </div>`;
  } else {
    // Unhappy → private feedback
    document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeFeedback()">
      <div class="modal" style="max-width:380px">
        <h2 style="margin-bottom:8px">😐 ${isAr() ? 'نعتذر عن ذلك' : 'We\'re sorry to hear that'}</h2>
        <p style="font-size:13px;color:var(--text2);margin-bottom:16px">${isAr() ? 'أخبرنا ما الذي يمكن تحسينه' : 'Tell us what we can improve'}</p>
        <textarea id="feedbackComment" style="width:100%;padding:12px;background:var(--dark3);border:1px solid var(--border2);border-radius:12px;color:var(--text);font-size:14px;resize:none;outline:none" rows="3" placeholder="${isAr() ? 'ملاحظاتك...' : 'Your feedback...'}"></textarea>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button onclick="saveFeedbackComment('${orderId}',${tableNumber},${emoji})" style="flex:1;padding:12px;border-radius:50px;background:var(--accent);color:#fff;border:none;font-size:14px;font-weight:600;cursor:pointer">${t('rateSubmit')}</button>
          <button onclick="closeFeedback()" style="padding:12px 20px;border-radius:50px;background:var(--surface2);border:1px solid var(--border2);color:var(--text2);cursor:pointer">Skip</button>
        </div>
      </div>
    </div>`;
  }
  try { await DB.submitFeedback(orderId, tableNumber, emoji, '', []); } catch {}
}

async function saveFeedbackComment(orderId, tableNumber, emoji) {
  const comment = document.getElementById('feedbackComment')?.value || '';
  try { await DB.submitFeedback(orderId, tableNumber, emoji, comment, []); } catch {}
  closeFeedback();
  toast(isAr() ? 'شكراً لملاحظاتك' : 'Thanks for your feedback', 'success');
}

function closeFeedback() { document.getElementById('modal-root').innerHTML = ''; }
function openGoogleMaps() {
  const name = encodeURIComponent(App.settings.restaurant_name || 'Flavor House');
  window.open(`https://www.google.com/search?q=${name}+review`, '_blank');
  closeFeedback();
}

// ═══════════════════════════════════════════════════
//  SCHEDULED ORDER CHECK
// ═══════════════════════════════════════════════════
async function checkScheduledOrders() {
  // Auto-activate scheduled orders whose time has come
  try {
    const scheduled = await DB.getScheduledOrders();
    const now = new Date();
    for (const order of scheduled) {
      if (!order.scheduled_for) continue;
      const scheduledFor = order.scheduled_for?.toDate ? order.scheduled_for.toDate() : new Date(order.scheduled_for);
      const diffMin = (scheduledFor.getTime() - now.getTime()) / 60000;
      if (diffMin <= 15 && diffMin >= -5) {
        await DB.updateOrderStatus(order.id, 'pending');
      }
    }
  } catch {}
}

// ═══════════════════════════════════════════════════
//  THREE.JS + GSAP (unchanged from original)
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
  const particleCount = 180;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i*3]=(Math.random()-.5)*20; positions[i*3+1]=(Math.random()-.5)*20; positions[i*3+2]=(Math.random()-.5)*10;
    const tt=Math.random(); colors[i*3]=1; colors[i*3+1]=0.42+tt*.3; colors[i*3+2]=0.21;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particleMat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(particleGeo, particleMat));
  const rings = [];
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xFF6B35, wireframe: true, transparent: true, opacity: 0.15 });
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.TorusGeometry(2+i*1.5, 0.03, 8, 80);
    const mesh = new THREE.Mesh(geo, ringMat.clone());
    mesh.rotation.x = Math.random()*Math.PI; mesh.rotation.y = Math.random()*Math.PI;
    scene.add(mesh); rings.push(mesh);
  }
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.2,32,32), new THREE.MeshBasicMaterial({color:0xFF6B35,wireframe:true,transparent:true,opacity:.08}));
  scene.add(sphere);
  let mouseX=0, mouseY=0;
  document.addEventListener('mousemove', e => { mouseX=(e.clientX/window.innerWidth-.5)*2; mouseY=(e.clientY/window.innerHeight-.5)*2; });
  window.addEventListener('resize', () => { renderer.setSize(canvas.offsetWidth,canvas.offsetHeight); camera.aspect=canvas.offsetWidth/canvas.offsetHeight; camera.updateProjectionMatrix(); });
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
  const clock = new THREE.Clock();
  function animate() {
    if (!document.getElementById('hero')) return;
    requestAnimationFrame(animate);
    const tt = clock.getElapsedTime();
    rings.forEach((r,i)=>{ r.rotation.x+=0.003*(i%2===0?1:-1); r.rotation.y+=0.002; r.rotation.z+=0.001; });
    sphere.rotation.y+=0.004; sphere.rotation.x=Math.sin(tt*.3)*.1;
    const pos = particleGeo.attributes.position.array;
    for (let i=0;i<particleCount;i++) { pos[i*3+1]+=0.004; if(pos[i*3+1]>10)pos[i*3+1]=-10; }
    particleGeo.attributes.position.needsUpdate=true;
    camera.position.x+=(mouseX*.8-camera.position.x)*.05; camera.position.y+=(-mouseY*.5-camera.position.y)*.05;
    camera.lookAt(scene.position); renderer.render(scene,camera);
  }
  animate();
}

function initGSAP() {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  const heroTl = gsap.timeline({ delay: 0.3 });
  heroTl.to('.hero-tag',{opacity:1,y:0,duration:.7,ease:'power3.out'})
    .to('.hero-title',{opacity:1,y:0,duration:.9,ease:'power3.out'},'-=0.4')
    .to('.hero-sub',{opacity:1,y:0,duration:.7,ease:'power3.out'},'-=0.5')
    .to('.hero-actions',{opacity:1,y:0,duration:.7,ease:'power3.out'},'-=0.4')
    .to('.hero-stats',{opacity:1,duration:.8,ease:'power2.out'},'-=0.2');
  ScrollTrigger.create({ trigger:'body', start:'top top', onUpdate:() => {
    const navbar = document.getElementById('navbar');
    if(window.scrollY>60) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled');
  }});
}

function animateMenuCards() {
  if (typeof gsap === 'undefined') return;
  gsap.fromTo('.menu-card',{opacity:0,y:30,scale:.97},{opacity:1,y:0,scale:1,duration:.5,stagger:.06,ease:'power3.out'});
}

// ── Scroll helpers ─────────────────────────────────
function scrollToTop() { if(typeof gsap!=='undefined') gsap.to(window,{scrollTo:0,duration:.8,ease:'power3.inOut'}); else window.scrollTo({top:0,behavior:'smooth'}); }
function scrollToMenu() { const el=document.getElementById('menu-section'); if(typeof gsap!=='undefined') gsap.to(window,{scrollTo:{y:el,offsetY:80},duration:.8,ease:'power3.inOut'}); else el.scrollIntoView({behavior:'smooth'}); }
function scrollToFeatured() { const el=document.getElementById('featured-section'); if(typeof gsap!=='undefined') gsap.to(window,{scrollTo:{y:el,offsetY:80},duration:.8,ease:'power3.inOut'}); else el.scrollIntoView({behavior:'smooth'}); }
function scrollToTracking() { const el=document.getElementById('tracking-section'); el.classList.remove('hidden'); if(typeof gsap!=='undefined') gsap.to(window,{scrollTo:{y:el,offsetY:80},duration:.8,ease:'power3.inOut'}); else el.scrollIntoView({behavior:'smooth'}); }

// ── Toast ──────────────────────────────────────────
function toast(msg, type='info', duration=3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`; el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .4s'; setTimeout(()=>el.remove(),400); }, duration);
}

// ── Subscribe to menu changes ──────────────────────
function subscribeToMenuChanges() {
  firebase.firestore().collection('menu_items').onSnapshot(() => {
    DB.getMenuItems().then(menu => { App.menu = menu; applyFilters(); });
  });
}

// ── Boot ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
