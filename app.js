/* ===== SUPABASE ===== */
const SUPABASE_URL = 'https://dfdnozkhetgznfmpwymf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HnpamAjDyIR0vjzKXvgXXw_JPqITVP7';
let sbClient = null;

function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
}

async function signUp(email, password) {
  if (!sbClient) { showToast('Supabase не подключён'); return; }
  showAuthError('');
  const { data, error } = await sbClient.auth.signUp({ email, password });
  if (error) { showAuthError('❌ ' + error.message); return; }
  showToast('✉️ Проверьте почту для подтверждения!');
  return data;
}

async function signIn(email, password) {
  if (!sbClient) { showToast('Supabase не подключён'); return; }
  showAuthError('');
  const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
  if (error) {
    const m = error.message;
    if (/not confirmed/i.test(m)) {
      showAuthError('📧 Email не подтверждён — проверьте почту и перейдите по ссылке.');
    } else if (/invalid/i.test(m) || /credentials/i.test(m)) {
      showAuthError('❌ Неверный email или пароль.');
    } else {
      showAuthError('❌ ' + m);
    }
    return;
  }
  localStorage.setItem('sb_session', JSON.stringify(data.session));
  updateAuthUI(data.user);
  showAuthSuccess(data.user.email);
  await loadFromCloud();
  return data;
}

async function signOut() {
  if (!sbClient) return;
  await sbClient.auth.signOut();
  localStorage.removeItem('sb_session');
  updateAuthUI(null);
  showToast('👋 Вы вышли из аккаунта');
}

async function handleSignIn() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;
  if (!email || !password) { showToast('Введите email и пароль'); return; }
  await signIn(email, password);
}

async function handleSignUp() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;
  if (!email || !password) { showToast('Введите email и пароль'); return; }
  await signUp(email, password);
}

async function handleSignOut() {
  await signOut();
}

function updateAuthUI(user) {
  const formWrap = document.getElementById('auth-form-wrap');
  const userInfo = document.getElementById('auth-user-info');
  const emailDisplay = document.getElementById('auth-user-email-display');
  if (user) {
    if (formWrap) formWrap.hidden = true;
    if (userInfo) userInfo.hidden = false;
    if (emailDisplay) emailDisplay.textContent = '✅ ' + user.email;
  } else {
    if (formWrap) formWrap.hidden = false;
    if (userInfo) userInfo.hidden = true;
    if (emailDisplay) emailDisplay.textContent = '';
  }
}

function showAuthSuccess(email) {
  setTimeout(() => alert(
    '🎉 Добро пожаловать!\n\nВы успешно авторизованы как:\n' + email + '\n\nВаш прогресс синхронизирован с облаком ☁️'
  ), 100);
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  if (!msg) { el.hidden = true; return; }
  el.textContent = msg;
  el.hidden = false;
}

async function restoreSession() {
  if (!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  if (session?.user) {
    localStorage.setItem('sb_session', JSON.stringify(session));
    updateAuthUI(session.user);
    await loadFromCloud();
  }
}

/* ===== CLOUD SYNC ===== */
function setSyncIndicator(state) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  if (state === 'hidden') {
    el.hidden = true;
    el.className = 'sync-pill';
    return;
  }
  el.hidden = false;
  if (state === 'syncing') {
    el.className = 'sync-pill syncing';
    el.textContent = '☁️ Синхронизация...';
  } else if (state === 'done') {
    el.className = 'sync-pill';
    el.textContent = '✅ Сохранено';
  } else if (state === 'error') {
    el.className = 'sync-pill error';
    el.textContent = '❌ Ошибка синхронизации';
  }
}

async function syncToCloud() {
  if (!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session?.user) return;

  setSyncIndicator('syncing');
  const state = {
    entries: getDayLog(currentDate),
    water: getWater(currentDate),
  };
  const { error } = await sbClient
    .from('user_data')
    .upsert(
      { user_id: session.user.id, date: currentDate, state },
      { onConflict: 'user_id,date' }
    );
  if (error) {
    console.error('Cloud sync error:', error);
    setSyncIndicator('error');
    setTimeout(() => setSyncIndicator('hidden'), 2500);
  } else {
    setSyncIndicator('done');
    setTimeout(() => setSyncIndicator('hidden'), 1500);
  }
}

async function loadFromCloud() {
  if (!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session?.user) return;
  const uid = session.user.id;

  const [diaryRes, profileRes] = await Promise.all([
    sbClient.from('user_data').select('state').eq('user_id', uid).eq('date', currentDate).single(),
    sbClient.from('user_profiles').select('*').eq('user_id', uid).single(),
  ]);

  if (!diaryRes.error && diaryRes.data?.state) {
    const { entries, water } = diaryRes.data.state;
    if (Array.isArray(entries)) setDayLog(currentDate, entries);
    if (typeof water === 'number') setWater(currentDate, water);
    showToast('☁️ Данные загружены из облака');
  }

  if (!profileRes.error && profileRes.data) {
    const { user_id, ...profileFields } = profileRes.data;
    setProfile({ ...getProfile(), ...profileFields });
  }

  renderDiary();
}

/* ===== STATE ===== */
let currentTab = 'diary';
let currentDate = todayStr();
let selectedFood = null;
let modalTab = 'search';
let profileGoal = 'maintain';
let chartWeek = null;
let chartPie = null;
let chartCalorie = null;
let chartMacro = null;
let qrScanner = null;

/* ===== UTILS ===== */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(str) {
  const [y,m,d] = str.split('-').map(Number);
  const date = new Date(y, m-1, d);
  const opts = { weekday:'long', day:'numeric', month:'long' };
  const s = date.toLocaleDateString('ru-RU', opts);
  if (str === todayStr()) return 'Сегодня';
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const ys = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  if (str === ys) return 'Вчера';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shiftDate(str, delta) {
  const [y,m,d] = str.split('-').map(Number);
  const date = new Date(y, m-1, d+delta);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function round1(v) { return Math.round(v * 10) / 10; }

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

/* ===== STORAGE ===== */
function getDayLog(date) {
  return JSON.parse(localStorage.getItem('bju_log_' + date) || '[]');
}

function setDayLog(date, entries) {
  localStorage.setItem('bju_log_' + date, JSON.stringify(entries));
}

function getProfile() {
  return JSON.parse(localStorage.getItem('bju_profile') || '{}');
}

function setProfile(p) {
  localStorage.setItem('bju_profile', JSON.stringify(p));
}

function getTargets() {
  const p = getProfile();
  return {
    proteins: p.targetP || 150,
    fats: p.targetF || 65,
    carbs: p.targetC || 200,
    calories: p.targetK || 2000,
  };
}

/* ===== WATER ===== */
const WATER_GOAL = 2000;

function getWater(date) {
  return parseInt(localStorage.getItem('bju_water_' + date) || '0', 10);
}

function setWater(date, ml) {
  localStorage.setItem('bju_water_' + date, String(ml));
}

function renderWater() {
  const ml   = getWater(currentDate);
  const pct  = Math.min(ml / WATER_GOAL, 1);
  const top  = (1 - pct) * 100;
  const mlEl  = document.getElementById('water-ml');
  const wave  = document.getElementById('water-wave');
  const wave2 = document.getElementById('water-wave2');
  if (mlEl)  mlEl.textContent    = ml;
  if (wave)  wave.style.top      = top + '%';
  if (wave2) wave2.style.top     = Math.min(top + 3, 100) + '%';
}

function changeWater(delta) {
  const prev = getWater(currentDate);
  const ml = Math.max(0, Math.min(WATER_GOAL, prev + delta));
  setWater(currentDate, ml);
  if (delta > 0) localStorage.setItem('last_water_time', Date.now().toString());
  renderWater();
  if (delta > 0 && ml >= WATER_GOAL) {
    showToast('💧 Цель по воде достигнута!');
    if (prev < WATER_GOAL) launchConfetti();
  }
  syncToCloud();
}

/* ===== MACRO CALCULATIONS ===== */
function calcEntry(food, weight) {
  const w = weight / 100;
  return {
    proteins: round1(food.proteins * w),
    fats: round1(food.fats * w),
    carbs: round1(food.carbs * w),
    calories: Math.round(food.calories * w),
  };
}

function sumLog(entries) {
  return entries.reduce((acc, e) => ({
    proteins: round1(acc.proteins + e.proteins),
    fats: round1(acc.fats + e.fats),
    carbs: round1(acc.carbs + e.carbs),
    calories: acc.calories + e.calories,
  }), { proteins: 0, fats: 0, carbs: 0, calories: 0 });
}

/* ===== TABS ===== */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  document.getElementById('nav-' + tab).classList.add('active');

  if (tab === 'diary') renderDiary();
  if (tab === 'profile') renderProfile();
  if (tab === 'nutri') renderNutri();
  if (tab === 'analytics') renderAnalytics();
  if (tab === 'social') renderSocial();
}

/* ===== DIARY PAGE ===== */
function renderDiary() {
  const dateEl = document.getElementById('date-display');
  if (dateEl) dateEl.textContent = formatDate(currentDate);

  let entries = [];
  try { entries = getDayLog(currentDate); } catch(e) { entries = []; }
  const totals = sumLog(entries);
  const targets = getTargets();
  checkCalorieGoal(totals, targets);

  // Rings — each guarded inside renderRing
  renderRing('ring-p', 'protein', totals.proteins, targets.proteins, 'Б');
  renderRing('ring-f', 'fat',     totals.fats,     targets.fats,     'Ж');
  renderRing('ring-c', 'carb',    totals.carbs,     targets.carbs,    'У');
  renderRing('ring-k', 'kcal',    totals.calories,  targets.calories, 'ккал');

  // Totals card
  const tp = document.getElementById('total-p'); if (tp) tp.textContent = totals.proteins + 'г';
  const tf = document.getElementById('total-f'); if (tf) tf.textContent = totals.fats + 'г';
  const tc = document.getElementById('total-c'); if (tc) tc.textContent = totals.carbs + 'г';
  const tk = document.getElementById('total-k'); if (tk) tk.textContent = totals.calories;

  // Food list
  const listEl = document.getElementById('food-list');
  if (!listEl) return;

  renderWater();
  analyzeNutrition();

  if (entries.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <p>Нет записей за этот день.<br>Нажмите «+ Добавить продукт»</p>
      </div>`;
  } else {
    listEl.innerHTML = entries.map((e, i) => {
      const name     = e.name     || 'Без названия';
      const weight   = e.weight   != null ? e.weight   : '?';
      const proteins = e.proteins != null ? e.proteins : 0;
      const fats     = e.fats     != null ? e.fats     : 0;
      const carbs    = e.carbs    != null ? e.carbs    : 0;
      const calories = e.calories != null ? e.calories : 0;
      return `
      <div class="food-entry">
        <div class="food-entry-info">
          <div class="food-entry-name">${name}</div>
          <div class="food-entry-weight">${weight} г</div>
          <div class="food-entry-macros">
            <span class="macro-pill p">Б ${proteins}г</span>
            <span class="macro-pill f">Ж ${fats}г</span>
            <span class="macro-pill c">У ${carbs}г</span>
            <span class="macro-pill k">${calories} ккал</span>
          </div>
        </div>
        <button class="food-entry-delete" onclick="deleteEntry(${i})" aria-label="Удалить">✕</button>
      </div>`;
    }).join('');
  }
}

function renderRing(id, type, val, target, label) {
  const el = document.getElementById(id);
  if (!el) return;
  const card = el.closest('.ring-card');
  const pct = target > 0 ? Math.min(Math.round((val / target) * 100), 100) : 0;
  const circ = 2 * Math.PI * 30;
  const offset = circ - (pct / 100) * circ;

  const fill = el.querySelector('.ring-fill');
  if (fill) {
    fill.style.strokeDasharray = String(circ);
    fill.style.strokeDashoffset = String(offset);
  }

  const pctSpan = el.querySelector('.ring-pct');
  if (pctSpan) pctSpan.textContent = pct + '%';

  if (card) {
    const valEl = card.querySelector('.ring-val');
    if (valEl) valEl.textContent = round1(val) + (label === 'ккал' ? '' : 'г');
  }
}

function deleteEntry(index) {
  const entries = getDayLog(currentDate);
  entries.splice(index, 1);
  setDayLog(currentDate, entries);
  renderDiary();
  showToast('Запись удалена');
  syncToCloud();
}

/* ===== MODAL ===== */
function openModal() {
  selectedFood = null;
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('open');
  const si = document.getElementById('search-input');
  if (si) { si.value = ''; }
  const wi = document.getElementById('weight-input');
  if (wi) wi.value = '100';
  const fr = document.getElementById('food-results');
  if (fr) fr.innerHTML = '';
  updatePreview();
  switchModalTab('search');
  if (si) si.focus();
}

function closeModal() {
  stopScanner();
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

function switchModalTab(tab) {
  if (modalTab === 'scan' && tab !== 'scan') stopScanner();
  modalTab = tab;

  document.querySelectorAll('.modal-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  const activeTabBtn = document.getElementById('mtab-' + tab);
  if (activeTabBtn) {
    activeTabBtn.classList.add('active');
    activeTabBtn.setAttribute('aria-selected', 'true');
  }

  ['modal-search-panel', 'modal-scan-panel', 'modal-manual-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('hidden', '');
  });
  const activePanel = document.getElementById('modal-' + tab + '-panel');
  if (activePanel) activePanel.removeAttribute('hidden');
}

function handleSearch() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const results = document.getElementById('food-results');
  if (!q) { results.innerHTML = ''; return; }

  const matches = FOODS_DB.filter(f =>
    f.name.toLowerCase().includes(q) ||
    (CATEGORY_NAMES[f.category] || '').toLowerCase().includes(q)
  ).slice(0, 20);

  if (matches.length === 0) {
    results.innerHTML = `<div style="text-align:center;color:var(--text2);padding:20px;font-size:13px;">Ничего не найдено. Попробуйте «ручной ввод».</div>`;
    return;
  }

  results.innerHTML = matches.map(f => `
    <div class="food-result-item ${selectedFood && selectedFood.id === f.id ? 'selected' : ''}"
         onclick="selectFood(${f.id})">
      <div class="food-result-name">${f.name}</div>
      <div class="food-result-macros">
        <span class="rp">Б ${f.proteins}г</span>
        <span class="rf">Ж ${f.fats}г</span>
        <span class="rc">У ${f.carbs}г</span>
        <span>${f.calories} ккал</span>
        <span style="float:right;color:var(--text2)">${CATEGORY_NAMES[f.category] || ''}</span>
      </div>
    </div>`).join('');
}

function selectFood(id) {
  selectedFood = FOODS_DB.find(f => f.id === id);
  handleSearch();
  updatePreview();
  document.getElementById('weight-input').focus();
  document.getElementById('weight-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updatePreview() {
  const w = parseFloat(document.getElementById('weight-input').value) || 0;
  const food = selectedFood;
  if (!food || w <= 0) {
    ['prev-p','prev-f','prev-c','prev-k'].forEach((id, i) => {
      document.getElementById(id).textContent = ['—','—','—','—'][i];
    });
    return;
  }
  const m = calcEntry(food, w);
  document.getElementById('prev-p').textContent = m.proteins + 'г';
  document.getElementById('prev-f').textContent = m.fats + 'г';
  document.getElementById('prev-c').textContent = m.carbs + 'г';
  document.getElementById('prev-k').textContent = m.calories;
}

function setWeightPreset(w) {
  document.getElementById('weight-input').value = w;
  updatePreview();
}

function addFoodFromSearch() {
  if (!selectedFood) { showToast('Выберите продукт из списка'); return; }
  const w = parseFloat(document.getElementById('weight-input').value);
  if (!w || w <= 0) { showToast('Укажите вес'); return; }
  const m = calcEntry(selectedFood, w);
  const entry = { name: selectedFood.name, weight: w, ...m };
  const entries = getDayLog(currentDate);
  entries.push(entry);
  setDayLog(currentDate, entries);
  closeModal();
  renderDiary();
  showToast('✓ ' + selectedFood.name + ' добавлен');
  syncToCloud();
}

function addFoodManual() {
  const name = document.getElementById('manual-name').value.trim();
  const weight = parseFloat(document.getElementById('manual-weight').value);
  const p100 = parseFloat(document.getElementById('manual-p').value) || 0;
  const f100 = parseFloat(document.getElementById('manual-f').value) || 0;
  const c100 = parseFloat(document.getElementById('manual-c').value) || 0;
  const k100 = parseFloat(document.getElementById('manual-k').value) || (p100*4 + f100*9 + c100*4);

  if (!name) { showToast('Введите название'); return; }
  if (!weight || weight <= 0) { showToast('Укажите вес'); return; }

  const fakeFood = { proteins: p100, fats: f100, carbs: c100, calories: k100 };
  const m = calcEntry(fakeFood, weight);
  const entry = { name, weight, ...m };
  const entries = getDayLog(currentDate);
  entries.push(entry);
  setDayLog(currentDate, entries);
  closeModal();
  renderDiary();
  showToast('✓ ' + name + ' добавлен');
  syncToCloud();
}

/* ===== PROFILE PAGE ===== */
function updateBMI() {
  const weight = parseFloat(document.getElementById('prof-weight')?.value) || 0;
  const height = parseInt(document.getElementById('prof-height')?.value)   || 0;
  const el = document.getElementById('prof-bmi-display');
  if (el && weight > 0 && height > 0) {
    el.textContent = (weight / ((height / 100) ** 2)).toFixed(1);
  }
  recalcTargets();
}

function recalcTargets() {
  const weight   = parseFloat(document.getElementById('prof-weight')?.value)   || 0;
  const height   = parseInt(document.getElementById('prof-height')?.value)     || 0;
  const age      = parseInt(document.getElementById('prof-age')?.value)        || 0;
  const gender   = document.getElementById('prof-gender')?.value   || 'male';
  const activity = parseFloat(document.getElementById('prof-activity')?.value) || 1.2;
  if (!weight || !height || !age) return;

  const bmr  = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const adj  = { cut: -500, maintain: 0, bulk: 300 };
  const tdee = Math.round(bmr * activity + (adj[profileGoal] || 0));

  setVal('prof-targetP', Math.round(tdee * 0.30 / 4));
  setVal('prof-targetF', Math.round(tdee * 0.30 / 9));
  setVal('prof-targetC', Math.round(tdee * 0.40 / 4));
  setVal('prof-targetK', tdee);
}

function renderProfile() {
  const p = getProfile();
  profileGoal = p.goal || 'maintain';

  setVal('prof-name',     p.name     || '');
  setVal('prof-age',      p.age      || '');
  setVal('prof-weight',   p.weight   || '');
  setVal('prof-height',   p.height   || '');
  setVal('prof-gender',   p.gender   || 'male');
  setVal('prof-activity', p.activity || '1.2');
  setVal('prof-targetP',  p.targetP  || 150);
  setVal('prof-targetF',  p.targetF  || 65);
  setVal('prof-targetC',  p.targetC  || 200);
  setVal('prof-targetK',  p.targetK  || 2000);

  // Goal buttons
  document.querySelectorAll('.goal-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.goal === profileGoal);
  });

  // Stats
  const streak = (JSON.parse(localStorage.getItem('bju_streak') || 'null') || {}).count || 0;
  const sv = document.getElementById('streak-val');   if (sv) sv.textContent = streak;
  const sl = document.getElementById('streak-label'); if (sl) sl.textContent = streak === 1 ? 'день подряд' : (streak < 5 ? 'дня подряд' : 'дней подряд');

  const days = countLoggedDays();
  const sd = document.getElementById('stat-days');    if (sd) sd.textContent = days;
  const sa = document.getElementById('stat-avgkcal'); if (sa) sa.textContent = calcAvgKcal();

  renderWeekChart();
}

function calcStreak() {
  let streak = 0;
  let d = todayStr();
  while (true) {
    const log = getDayLog(d);
    if (log.length === 0) break;
    streak++;
    d = shiftDate(d, -1);
  }
  return streak;
}

function countLoggedDays() {
  let count = 0;
  for (let i = 0; i < 30; i++) {
    const d = shiftDate(todayStr(), -i);
    if (getDayLog(d).length > 0) count++;
  }
  return count;
}

function calcAvgKcal() {
  let total = 0, days = 0;
  for (let i = 0; i < 7; i++) {
    const d = shiftDate(todayStr(), -i);
    const log = getDayLog(d);
    if (log.length > 0) { total += sumLog(log).calories; days++; }
  }
  return days > 0 ? Math.round(total / days) : 0;
}

function saveProfile() {
  recalcTargets();
  const p = {
    name:     document.getElementById('prof-name').value.trim(),
    age:      parseInt(document.getElementById('prof-age').value)      || 0,
    weight:   parseFloat(document.getElementById('prof-weight').value) || 0,
    height:   parseInt(document.getElementById('prof-height').value)   || 0,
    gender:   document.getElementById('prof-gender')?.value   || 'male',
    activity: parseFloat(document.getElementById('prof-activity')?.value) || 1.2,
    goal:     profileGoal,
    targetP:  parseFloat(document.getElementById('prof-targetP').value) || 150,
    targetF:  parseFloat(document.getElementById('prof-targetF').value) || 65,
    targetC:  parseFloat(document.getElementById('prof-targetC').value) || 200,
    targetK:  parseFloat(document.getElementById('prof-targetK').value) || 2000,
  };
  setProfile(p);
  syncProfileToCloud(p);
  showToast('✓ Профиль сохранён');
  renderDiary();
}

async function syncProfileToCloud(profile) {
  if (!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session?.user) return;
  await sbClient.from('user_profiles').upsert(
    { user_id: session.user.id, email: session.user.email, ...profile },
    { onConflict: 'user_id' }
  );
}

async function syncStreakToCloud(streakCount) {
  if (!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session?.user) return;
  await sbClient.from('user_profiles').upsert(
    { user_id: session.user.id, email: session.user.email, streak: streakCount },
    { onConflict: 'user_id' }
  );
}

function setGoal(goal) {
  profileGoal = goal;
  document.querySelectorAll('.goal-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.goal === goal);
  });
  recalcTargets();
}

function renderWeekChart() {
  const labels = [];
  const dataP = [], dataF = [], dataC = [], dataK = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDate(todayStr(), -i);
    const [,m,day] = d.split('-');
    labels.push(day + '.' + m);
    const totals = sumLog(getDayLog(d));
    dataP.push(totals.proteins);
    dataF.push(totals.fats);
    dataC.push(totals.carbs);
    dataK.push(totals.calories);
  }

  const hasData = dataK.some(v => v > 0);
  const wrapEl = document.getElementById('week-chart-wrap');

  if (!hasData) {
    wrapEl.innerHTML = `<div class="no-chart-data"><div class="nc-icon">📊</div><span>Добавьте продукты, чтобы увидеть статистику</span></div>`;
    return;
  }

  wrapEl.innerHTML = '<canvas id="weekChart"></canvas>';
  const ctx = document.getElementById('weekChart').getContext('2d');
  if (chartWeek) chartWeek.destroy();
  chartWeek = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Белки', data: dataP, backgroundColor: 'rgba(76,175,130,0.7)', borderRadius: 4 },
        { label: 'Жиры', data: dataF, backgroundColor: 'rgba(255,140,66,0.7)', borderRadius: 4 },
        { label: 'Углеводы', data: dataC, backgroundColor: 'rgba(79,195,247,0.7)', borderRadius: 4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8888AA', font: { size: 11 }, boxWidth: 12 } } },
      scales: {
        x: { stacked: true, ticks: { color: '#8888AA', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { stacked: true, ticks: { color: '#8888AA', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

/* ===== SMART ADVISOR ===== */
function analyzeNutrition() {
  const entries = getDayLog(currentDate);
  const totals  = sumLog(entries);
  const targets = getTargets();
  const water   = getWater(currentDate);
  const hour    = new Date().getHours();

  const pRatio = targets.proteins > 0 ? totals.proteins / targets.proteins : 0;
  const cRatio = targets.carbs    > 0 ? totals.carbs    / targets.carbs    : 0;
  const fRatio = targets.fats     > 0 ? totals.fats     / targets.fats     : 0;
  const wRatio = water / WATER_GOAL;

  let advice = 'Отличный темп! Показатели в норме, продолжай в том же духе 🚀';

  if (entries.length === 0) {
    advice = '🍽️ Добавь первый приём пищи, чтобы получить персональный совет.';
  } else if (wRatio < 0.5) {
    advice = '💧 Твой организм просит пить! Выпей стакан воды прямо сейчас.';
  } else if (pRatio < 0.5 && hour >= 12) {
    advice = '💪 Недобор белка! Отличным перекусом станет творог или пара вареных яиц.';
  } else if (cRatio > 0.9) {
    advice = '🍞 Углеводы на пределе. Дальше лучше сделать упор на овощи и легкий белок.';
  } else if (
    pRatio >= 0.8 && pRatio <= 1.2 &&
    cRatio >= 0.5 && cRatio <= 1.0 &&
    fRatio >= 0.5 && fRatio <= 1.2 &&
    wRatio >= 0.5
  ) {
    advice = '✨ Ты в отличной форме! БЖУ в идеальном балансе, так держать!';
  }

  const el = document.getElementById('sa-text');
  if (el) el.textContent = advice;
}

/* ===== NUTRITIONIST PAGE ===== */
const DAILY_TIPS = [
  'Пейте не менее 8 стаканов воды в день. Обезвоживание часто маскируется под голод.',
  'Старайтесь есть медленно: мозгу нужно ~20 минут, чтобы получить сигнал о насыщении.',
  'Белок — главный союзник в похудении: он увеличивает сытость и разгоняет метаболизм.',
  'Радуга на тарелке — залог микронутриентов. Чем разнообразнее цвета, тем лучше.',
  'Жиры не враг! Авокадо, орехи и рыба содержат полезные омега-3 и 9.',
  'Клетчатка из овощей и бобовых питает полезные бактерии кишечника.',
  'Сон влияет на гормоны голода: недосыпание повышает аппетит на 20%.',
  'Не пропускайте завтрак: это «запускает» метаболизм на весь день.',
  'Сложные углеводы (гречка, бурый рис) дают долгую энергию без скачков сахара.',
  'Магний снижает тягу к сладкому — ешьте орехи, тыквенные семечки, шпинат.',
  'Цинк из мяса и тыквенных семечек поддерживает иммунитет и гормональный фон.',
  'После тренировки съешьте белок в течение 30–60 минут для лучшего восстановления.',
  'Омега-3 из лосося и льняного масла снижает воспаление в организме.',
  'Контролируйте порции с помощью «тарелки здоровья»: ½ овощи, ¼ белок, ¼ углеводы.',
];

function renderNutri() {
  // Daily tip
  const tipIdx = new Date().getDate() % DAILY_TIPS.length;
  document.getElementById('daily-tip-text').textContent = DAILY_TIPS[tipIdx];

  // Generate advice
  const adviceContainer = document.getElementById('advice-container');
  const cards = generateAdvice();

  if (cards.length === 0) {
    adviceContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🥗</div>
        <p>Добавьте записи о питании за несколько дней,<br>чтобы получить персональные советы.</p>
      </div>`;
    return;
  }

  adviceContainer.innerHTML = cards.map(c => `
    <div class="advice-card ${c.type}">
      <div class="advice-icon">${c.icon}</div>
      <div class="advice-content">
        <div class="advice-title">${c.title}</div>
        <div class="advice-text">${c.text}</div>
        ${c.foods && c.foods.length ? `<div class="advice-foods">${c.foods.map(f => `<span class="advice-food-tag">${f}</span>`).join('')}</div>` : ''}
      </div>
    </div>`).join('');
}

function get7DayAvg() {
  let data = [], days = 0;
  for (let i = 0; i < 7; i++) {
    const d = shiftDate(todayStr(), -i);
    const log = getDayLog(d);
    if (log.length > 0) {
      data.push(sumLog(log));
      days++;
    }
  }
  if (days === 0) return null;
  const avg = data.reduce((a, b) => ({
    proteins: a.proteins + b.proteins,
    fats: a.fats + b.fats,
    carbs: a.carbs + b.carbs,
    calories: a.calories + b.calories,
  }), { proteins: 0, fats: 0, carbs: 0, calories: 0 });
  return {
    proteins: round1(avg.proteins / days),
    fats: round1(avg.fats / days),
    carbs: round1(avg.carbs / days),
    calories: Math.round(avg.calories / days),
    days,
  };
}

function getLoggedCategories() {
  const cats = new Set();
  for (let i = 0; i < 7; i++) {
    const d = shiftDate(todayStr(), -i);
    const log = getDayLog(d);
    log.forEach(e => {
      const food = FOODS_DB.find(f => f.name === e.name);
      if (food) cats.add(food.category);
    });
  }
  return cats;
}

function generateAdvice() {
  const avg = get7DayAvg();
  if (!avg || avg.days < 1) return [];

  const targets = getTargets();
  const cards = [];
  const cats = getLoggedCategories();

  // Protein check
  const pRatio = avg.proteins / targets.proteins;
  if (pRatio < 0.75) {
    cards.push({
      type: 'warning', icon: '💪',
      title: 'Не хватает белка',
      text: `Средний показатель — ${avg.proteins}г белка в день (цель: ${targets.proteins}г). Белок необходим для восстановления мышц и поддержания сытости.`,
      foods: ['Куриная грудка', 'Творог 0%', 'Яйца', 'Тунец', 'Чечевица']
    });
  } else if (pRatio >= 0.9 && pRatio <= 1.15) {
    cards.push({
      type: 'positive', icon: '✅',
      title: 'Отличный уровень белка!',
      text: `Вы потребляете в среднем ${avg.proteins}г белка — это близко к цели (${targets.proteins}г). Так держать!`,
      foods: []
    });
  }

  // Calorie check
  const kRatio = avg.calories / targets.calories;
  if (kRatio > 1.2) {
    cards.push({
      type: 'danger', icon: '🔥',
      title: 'Превышение калорийности',
      text: `Вы потребляете ~${avg.calories} ккал/день при цели ${targets.calories} ккал. Профицит ${Math.round(avg.calories - targets.calories)} ккал может привести к набору веса.`,
      foods: ['Уменьшите порции', 'Замените крупы на овощи', 'Пейте воду до еды']
    });
  } else if (kRatio < 0.7) {
    cards.push({
      type: 'warning', icon: '⚡',
      title: 'Слишком мало калорий',
      text: `Среднее потребление ~${avg.calories} ккал — ниже нормы (${targets.calories} ккал). Резкий дефицит замедляет метаболизм и снижает энергию.`,
      foods: []
    });
  }

  // Fat check
  if (avg.calories > 0) {
    const fatPct = (avg.fats * 9 / avg.calories) * 100;
    if (fatPct > 40) {
      cards.push({
        type: 'warning', icon: '🧈',
        title: 'Много жиров в рационе',
        text: `Жиры составляют ${Math.round(fatPct)}% суточных калорий (норма ≤ 35%). Обратите внимание на источники жиров.`,
        foods: []
      });
    }
  }

  // Vegetables check
  if (!cats.has('vegetables')) {
    cards.push({
      type: 'warning', icon: '🥦',
      title: 'Мало овощей',
      text: 'За последние дни в рационе почти нет овощей. Овощи содержат клетчатку, витамины и минералы, необходимые для здоровья.',
      foods: ['Брокколи', 'Шпинат', 'Перец болгарский', 'Цукини', 'Морковь']
    });
  }

  // Fish check
  if (!cats.has('fish')) {
    cards.push({
      type: 'tip', icon: '🐟',
      title: 'Добавьте рыбу в рацион',
      text: 'Рыба и морепродукты богаты омега-3 жирными кислотами, которые снижают воспаление и поддерживают работу сердца.',
      foods: ['Лосось', 'Скумбрия', 'Тунец', 'Минтай', 'Треска']
    });
  }

  // No variety
  if (cats.size < 3 && avg.days >= 3) {
    cards.push({
      type: 'tip', icon: '🌈',
      title: 'Разнообразьте рацион',
      text: 'Чем разнообразнее питание, тем шире спектр витаминов и минералов. Попробуйте добавить новые категории продуктов.',
      foods: []
    });
  }

  // Carbs ok
  const cRatio = avg.carbs / targets.carbs;
  if (cRatio > 1.3) {
    cards.push({
      type: 'warning', icon: '🍞',
      title: 'Много углеводов',
      text: `Среднее потребление углеводов — ${avg.carbs}г (цель: ${targets.carbs}г). Старайтесь выбирать медленные углеводы.`,
      foods: ['Гречка', 'Бурый рис', 'Овсянка', 'Киноа']
    });
  }

  return cards;
}

const NUTRI_ANSWERS = [
  { keys: ['белок', 'протеин', 'мышц', 'мышцы'], answer: 'Для роста мышц рекомендуется 1.6–2.2г белка на кг веса. Лучшие источники: куриная грудка, творог, яйца, рыба, бобовые. Распределяйте белок равномерно по приёмам пищи (20–40г за раз).' },
  { keys: ['похуд', 'сжеч', 'жир', 'дефицит'], answer: 'Для похудения создайте дефицит калорий 10–20% от нормы. Увеличьте белок до 2г/кг, добавьте клетчатку (овощи), пейте больше воды. Не снижайте калории резко — это замедляет метаболизм.' },
  { keys: ['набор', 'масса', 'профицит'], answer: 'Для набора массы нужен профицит ~300–500 ккал. Белок 1.8–2г/кг, углеводы — основной источник энергии. Тренируйтесь с отягощениями 3–4 раза в неделю.' },
  { keys: ['омега', 'рыбий жир', 'жирные кислоты'], answer: 'Омега-3 — незаменимые жирные кислоты, снижают воспаление, улучшают работу мозга. Лучшие источники: лосось, скумбрия, сельдь, льняное и рыбий жир. Норма: 1–3г в день.' },
  { keys: ['витамин', 'минерал', 'дефицит'], answer: 'Частые дефициты: железо (мясо, шпинат), магний (орехи, тыквенные семечки), витамин D (жирная рыба, яйца), B12 (мясо, молочные). Разнообразный рацион — лучшая профилактика.' },
  { keys: ['клетчатк', 'кишечник', 'пищеварение'], answer: 'Клетчатка нормализует пищеварение, снижает холестерин, кормит полезные бактерии. Норма: 25–38г в день. Источники: бобовые, цельнозерновые, овощи, фрукты.' },
  { keys: ['вода', 'пить', 'гидратация'], answer: 'Норма воды: ~30–35 мл на кг веса (+ 500 мл при физических нагрузках). Начинайте утро со стакана воды. Чай и кофе тоже считаются, но без фанатизма.' },
  { keys: ['завтрак', 'утр'], answer: 'Идеальный завтрак содержит белок + сложные углеводы: овсянка с яйцами, творог с ягодами, омлет с овощами. Завтрак запускает метаболизм и снижает тягу к перекусам.' },
  { keys: ['сахар', 'сладкое', 'тяга'], answer: 'Тяга к сладкому часто = нехватка магния или хрома. Замените простые сахара на сложные: гречку, бурый рис, фрукты. Горький шоколад 70%+ снижает тягу к сладкому.' },
  { keys: ['спорт', 'трениров', 'питание до', 'питание после'], answer: 'До тренировки (за 1–2ч): сложные углеводы + немного белка. После тренировки (до 1ч): белок (20–40г) + простые углеводы. Это ускоряет восстановление мышц.' },
];

function askNutritionist() {
  const q = document.getElementById('nutri-question').value.toLowerCase().trim();
  const answerEl = document.getElementById('nutri-answer');

  if (!q) { showToast('Введите вопрос'); return; }

  let found = null;
  for (const item of NUTRI_ANSWERS) {
    if (item.keys.some(k => q.includes(k))) { found = item.answer; break; }
  }

  if (!found) {
    found = 'Рекомендую обратиться к сертифицированному нутрициологу для персональной консультации. Но в целом: разнообразное питание, достаточно белка, овощи каждый день, ограничьте сахар и обработанные продукты — это основа здорового рациона.';
  }

  answerEl.textContent = '🤖 ' + found;
  answerEl.classList.add('show');
}

/* ===== BARCODE SCANNER ===== */
function setScanStatus(msg, type) {
  const el = document.getElementById('scan-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'scan-status' + (type ? ' ' + type : '');
}

function _getScanEls() {
  return {
    container: document.getElementById('reader-container'),
    startBtn:  document.getElementById('scan-start-btn'),
    stopBtn:   document.getElementById('scan-stop-btn'),
  };
}

function startScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    setScanStatus('Библиотека сканера не загружена. Проверьте интернет.', 'error');
    return;
  }
  const { container, startBtn, stopBtn } = _getScanEls();
  if (!qrScanner) qrScanner = new Html5Qrcode('reader');
  if (container) container.classList.add('active');
  if (startBtn)  startBtn.classList.add('hidden');
  if (stopBtn)   stopBtn.classList.add('visible');
  setScanStatus('Наведите камеру на штрихкод…', 'scanning');
  qrScanner.start(
    { facingMode: 'environment' },
    {
      fps: 10,
      qrbox: { width: 260, height: 120 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
      ],
    },
    (barcode) => { alert('Штрихкод прочитан: ' + barcode); stopScanner(); fetchProductByBarcode(barcode); },
    () => {}
  ).catch(() => {
    setScanStatus('Нет доступа к камере. Разрешите доступ в настройках браузера.', 'error');
    if (startBtn)  startBtn.classList.remove('hidden');
    if (stopBtn)   stopBtn.classList.remove('visible');
    if (container) container.classList.remove('active');
  });
}

function stopScanner() {
  const { container, startBtn, stopBtn } = _getScanEls();
  if (qrScanner && qrScanner.getState() === Html5QrcodeScannerState.SCANNING) {
    qrScanner.stop().then(() => { qrScanner.clear(); qrScanner = null; }).catch(() => {});
  }
  if (container) container.classList.remove('active');
  if (startBtn)  startBtn.classList.remove('hidden');
  if (stopBtn)   stopBtn.classList.remove('visible');
}

async function fetchProductByBarcode(barcode) {
  setScanStatus('🔍 Штрихкод ' + barcode + ' — загружаю данные…', 'scanning');
  try {
    const resp = await fetch(
      'https://world.openfoodfacts.org/api/v0/product/' + encodeURIComponent(barcode) + '.json'
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 1 || !data.product) {
      alert('Ошибка: Продукт не найден в базе или нет сети');
      setScanStatus('❌ Продукт не найден в базе. Введите данные вручную.', 'error');
      switchModalTab('manual');
      return;
    }
    const p = data.product;
    const n = p.nutriments || {};
    const name     = (p.product_name_ru || p.product_name || '').trim() || 'Продукт ' + barcode;
    const proteins = round1(parseFloat(n['proteins_100g']      || n['protein_100g']     || 0));
    const fats     = round1(parseFloat(n['fat_100g']           || n['total-fat_100g']   || 0));
    const carbs    = round1(parseFloat(n['carbohydrates_100g'] || n['carbohydrate_100g']|| 0));
    const kcal     = Math.round(parseFloat(n['energy-kcal_100g'] || 0) || parseFloat(n['energy_100g'] || 0) / 4.184);
    switchModalTab('manual');
    setScanStatus('✅ Найдено: ' + name, 'success');
    setVal('manual-name',   name);
    setVal('manual-p',      proteins);
    setVal('manual-f',      fats);
    setVal('manual-c',      carbs);
    setVal('manual-k',      kcal || '');
    const wEl = document.getElementById('manual-weight');
    if (wEl) { wEl.value = ''; wEl.focus(); }
    showToast('✓ ' + name + ' — введите вес порции');
  } catch (err) {
    alert('Ошибка: Продукт не найден в базе или нет сети');
    setScanStatus('❌ Ошибка сети. Проверьте соединение или введите данные вручную.', 'error');
  }
}

/* ===== ANALYTICS PAGE ===== */
function ensureAnalyticsData() {
  const pastDates = Array.from({ length: 7 }, (_, i) => shiftDate(todayStr(), -(i + 1)));
  if (pastDates.some(d => getDayLog(d).length > 0)) return;

  const mockDays = [
    [
      { name: 'Овсянка', weight: 300, proteins: 10, fats: 5, carbs: 45, calories: 264 },
      { name: 'Куриная грудка', weight: 200, proteins: 47, fats: 4, carbs: 1, calories: 220 },
      { name: 'Гречка варёная', weight: 250, proteins: 11, fats: 3, carbs: 63, calories: 330 },
      { name: 'Творог 5%', weight: 200, proteins: 34, fats: 10, carbs: 4, calories: 242 },
    ],
    [
      { name: 'Яйца куриные', weight: 150, proteins: 19, fats: 16, carbs: 1, calories: 236 },
      { name: 'Рис белый', weight: 200, proteins: 5, fats: 1, carbs: 56, calories: 260 },
      { name: 'Лосось', weight: 180, proteins: 36, fats: 23, carbs: 0, calories: 374 },
      { name: 'Греческий йогурт', weight: 250, proteins: 25, fats: 1, carbs: 10, calories: 148 },
    ],
    [
      { name: 'Овсянка', weight: 280, proteins: 9, fats: 5, carbs: 42, calories: 246 },
      { name: 'Тунец консервированный', weight: 185, proteins: 44, fats: 2, carbs: 0, calories: 194 },
      { name: 'Картофель варёный', weight: 300, proteins: 6, fats: 1, carbs: 54, calories: 243 },
      { name: 'Куриная грудка', weight: 150, proteins: 35, fats: 3, carbs: 1, calories: 165 },
      { name: 'Банан', weight: 150, proteins: 2, fats: 0, carbs: 35, calories: 134 },
    ],
    [
      { name: 'Творог 5%', weight: 250, proteins: 43, fats: 13, carbs: 5, calories: 303 },
      { name: 'Гречка варёная', weight: 300, proteins: 14, fats: 3, carbs: 75, calories: 396 },
      { name: 'Куриная грудка', weight: 200, proteins: 47, fats: 4, carbs: 1, calories: 220 },
      { name: 'Яблоко', weight: 180, proteins: 1, fats: 0, carbs: 19, calories: 86 },
    ],
    [
      { name: 'Яйца куриные', weight: 120, proteins: 15, fats: 13, carbs: 1, calories: 188 },
      { name: 'Рис белый', weight: 250, proteins: 7, fats: 1, carbs: 70, calories: 325 },
      { name: 'Лосось', weight: 200, proteins: 40, fats: 26, carbs: 0, calories: 416 },
      { name: 'Брокколи', weight: 200, proteins: 6, fats: 1, carbs: 14, calories: 68 },
      { name: 'Банан', weight: 120, proteins: 1, fats: 0, carbs: 28, calories: 107 },
    ],
    [
      { name: 'Овсянка', weight: 320, proteins: 10, fats: 6, carbs: 48, calories: 282 },
      { name: 'Куриная грудка', weight: 180, proteins: 42, fats: 3, carbs: 1, calories: 198 },
      { name: 'Картофель варёный', weight: 250, proteins: 5, fats: 1, carbs: 45, calories: 203 },
      { name: 'Творог 5%', weight: 200, proteins: 34, fats: 10, carbs: 4, calories: 242 },
      { name: 'Яблоко', weight: 150, proteins: 1, fats: 0, carbs: 16, calories: 72 },
    ],
    [
      { name: 'Яйца куриные', weight: 180, proteins: 23, fats: 20, carbs: 1, calories: 283 },
      { name: 'Гречка варёная', weight: 300, proteins: 14, fats: 3, carbs: 75, calories: 396 },
      { name: 'Куриная грудка', weight: 200, proteins: 47, fats: 4, carbs: 1, calories: 220 },
      { name: 'Греческий йогурт', weight: 200, proteins: 20, fats: 1, carbs: 8, calories: 118 },
    ],
  ];

  pastDates.forEach((date, i) => setDayLog(date, mockDays[i] || mockDays[0]));
}

function renderAnalytics() {
  ensureAnalyticsData();

  const labels = [], kcalData = [], protData = [], fatData = [], carbData = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDate(todayStr(), -i);
    const [, m, day] = d.split('-');
    labels.push(day + '.' + m);
    const t = sumLog(getDayLog(d));
    kcalData.push(t.calories);
    protData.push(t.proteins);
    fatData.push(t.fats);
    carbData.push(t.carbs);
  }

  const filled = kcalData.filter(v => v > 0);
  const avg = filled.length ? Math.round(filled.reduce((a, b) => a + b, 0) / filled.length) : 0;
  const max = filled.length ? Math.max(...filled) : 0;
  const min = filled.length ? Math.min(...filled) : 0;

  const avgEl = document.getElementById('an-avg'); if (avgEl) avgEl.textContent = avg || '—';
  const maxEl = document.getElementById('an-max'); if (maxEl) maxEl.textContent = max || '—';
  const minEl = document.getElementById('an-min'); if (minEl) minEl.textContent = min || '—';

  _renderCalorieChart(labels, kcalData, getTargets().calories);
  _renderMacroChart(labels, protData, fatData, carbData);
}

function _chartOptions(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#8080A8', font: { size: 11 }, boxWidth: 12, padding: 14 },
      },
      tooltip: {
        backgroundColor: 'rgba(12,12,26,0.92)',
        borderColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        titleColor: '#EEEEFF',
        bodyColor: '#8080A8',
        padding: 10,
        callbacks: { label: ctx => ' ' + ctx.parsed.y + ' ' + unit },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#8080A8', font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#8080A8', font: { size: 10 } },
        border: { display: false },
      },
    },
  };
}

function _renderCalorieChart(labels, data, goalKcal) {
  const canvas = document.getElementById('calorieChart');
  if (!canvas) return;
  if (chartCalorie) { chartCalorie.destroy(); chartCalorie = null; }
  chartCalorie = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Калории',
          data,
          backgroundColor: 'rgba(192,122,255,0.22)',
          borderColor: 'rgba(192,122,255,0.9)',
          borderWidth: 2,
          borderRadius: 10,
          borderSkipped: false,
        },
        {
          type: 'line',
          label: 'Цель',
          data: Array(labels.length).fill(goalKcal),
          borderColor: 'rgba(61,255,160,0.55)',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: _chartOptions('ккал'),
  });
}

function _renderMacroChart(labels, prot, fat, carb) {
  const canvas = document.getElementById('macroChart');
  if (!canvas) return;
  if (chartMacro) { chartMacro.destroy(); chartMacro = null; }
  chartMacro = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Белки', data: prot, backgroundColor: 'rgba(61,255,160,0.22)', borderColor: 'rgba(61,255,160,0.85)', borderWidth: 2, borderRadius: 6, borderSkipped: false },
        { label: 'Жиры',  data: fat,  backgroundColor: 'rgba(255,155,92,0.22)',  borderColor: 'rgba(255,155,92,0.85)',  borderWidth: 2, borderRadius: 6, borderSkipped: false },
        { label: 'Углеводы', data: carb, backgroundColor: 'rgba(69,207,255,0.22)', borderColor: 'rgba(69,207,255,0.85)', borderWidth: 2, borderRadius: 6, borderSkipped: false },
      ],
    },
    options: _chartOptions('г'),
  });
}

/* ===== STREAKS & GAMIFICATION ===== */
function updateStreak() {
  const today = todayStr();
  const stored = JSON.parse(localStorage.getItem('bju_streak') || 'null');

  if (!stored) {
    localStorage.setItem('bju_streak', JSON.stringify({ count: 1, lastDate: today }));
    return { count: 1, increased: false };
  }
  if (stored.lastDate === today) {
    return { count: stored.count, increased: false };
  }

  const yesterday = shiftDate(today, -1);
  const increased = stored.lastDate === yesterday;
  const count = increased ? stored.count + 1 : 1;
  localStorage.setItem('bju_streak', JSON.stringify({ count, lastDate: today }));
  return { count, increased };
}

function launchConfetti() {
  if (typeof confetti !== 'function') return;
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors: ['#3DFFA0', '#00D4FF', '#C07AFF', '#FF9B5C', '#FFFFFF'],
  });
}

/* ===== PWA ===== */
let _installPrompt = null;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  const btn = document.getElementById('btn-install');
  if (btn) btn.hidden = false;
});

window.addEventListener('appinstalled', () => {
  _installPrompt = null;
  const btn = document.getElementById('btn-install');
  if (btn) btn.hidden = true;
  showToast('📱 NutriTrack установлен!');
});

function installApp() {
  if (isIOS()) {
    const hint = document.getElementById('ios-hint');
    if (hint) hint.hidden = !hint.hidden;
    return;
  }
  if (!_installPrompt) return;
  _installPrompt.prompt();
  _installPrompt.userChoice.then(() => { _installPrompt = null; });
}

/* ===== THEME ===== */
function applyTheme(theme) {
  document.documentElement.classList.toggle('dark-theme', theme === 'dark');
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#03030A' : '#EEF1FA');
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark-theme');
  const next = isDark ? 'light' : 'dark';
  localStorage.setItem('bju_theme', next);
  applyTheme(next);
}

/* ===== NOTIFICATIONS ===== */
function enableNotifications() {
  if (!('Notification' in window)) { showToast('Уведомления не поддерживаются'); return; }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      localStorage.setItem('notif_enabled', '1');
      showToast('🔔 Уведомления включены!');
      scheduleWaterCheck();
    } else {
      showToast('Разрешение не получено');
    }
  });
}

function sendNotification(title, body, tag) {
  if (Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag });
  } else {
    new Notification(title, { body, icon: './icon-192.svg', tag });
  }
}

function checkWaterReminder() {
  if (Notification.permission !== 'granted') return;
  const hour = new Date().getHours();
  if (hour < 8 || hour >= 22) return;
  const last = parseInt(localStorage.getItem('last_water_time') || '0', 10);
  if (last && Date.now() - last > 3 * 60 * 60 * 1000) {
    sendNotification('Пора пить воду! 💧', 'Не забывайте соблюдать водный баланс', 'water-reminder');
  }
}

function checkCalorieGoal(totals, targets) {
  if (Notification.permission !== 'granted') return;
  if (totals.calories < targets.calories) return;
  const key = 'notif_goal_' + currentDate;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  sendNotification('Цель достигнута! 🔥', 'Отличная работа сегодня! Вы выполнили дневную норму калорий', 'calorie-goal');
}

function scheduleWaterCheck() {
  setInterval(checkWaterReminder, 30 * 60 * 1000);
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  restoreSession();

  if (isIOS() && !window.navigator.standalone) {
    const btn = document.getElementById('btn-install');
    if (btn) { btn.hidden = false; btn.textContent = '📲 Как установить'; }
  }

  if (Notification.permission === 'granted') scheduleWaterCheck();

  const saved = localStorage.getItem('bju_theme');
  applyTheme(saved === 'light' ? 'light' : 'dark');

  const { count, increased } = updateStreak();
  const badgeEl = document.getElementById('streak-badge-val');
  if (badgeEl) badgeEl.textContent = count;
  if (increased) launchConfetti();
  syncStreakToCloud(count);

  switchTab('diary');

  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
});

/* ===== SOCIAL HUB ===== */

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function updateSocialUI(session) {
  const ar = document.getElementById('social-auth-required');
  const sc = document.getElementById('social-content');
  if (!ar || !sc) return;
  if (session?.user) {
    ar.style.display = 'none';
    sc.style.display = 'block';
  } else {
    ar.style.display = 'flex';
    sc.style.display = 'none';
  }
}

async function renderSocial() {
  updateSocialUI(null);
  if (!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  updateSocialUI(session);
  if (session?.user) await loadSocialData(session.user);
}

async function sendFriendRequest() {
  if (!sbClient) { showToast('Нет подключения'); return; }
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session?.user) { showToast('Войдите в аккаунт'); return; }

  const email = (document.getElementById('friend-email-input')?.value || '').trim().toLowerCase();
  if (!email) { showToast('Введите email друга'); return; }
  if (email === session.user.email.toLowerCase()) { showToast('Вы не можете добавить самого себя'); return; }

  const { data, error } = await sbClient.from('profiles').select('*').ilike('email', email.trim());
  if (error) { alert(error.message); return; }
  if (!data || data.length === 0) { alert('❌ Пользователь не найден'); return; }

  const { data: existing } = await sbClient
    .from('friendships')
    .select('id,status')
    .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${data[0].id}),and(sender_id.eq.${data[0].id},receiver_id.eq.${session.user.id})`)
    .maybeSingle();

  if (existing) {
    showToast(existing.status === 'accepted' ? '✅ Уже в друзьях' : '⏳ Заявка уже отправлена');
    return;
  }

  const { error: insertErr } = await sbClient.from('friendships').insert({
    sender_id: session.user.id,
    receiver_id: data[0].id,
    status: 'pending',
  });

  if (insertErr) { alert('❌ ' + insertErr.message); return; }
  const inp = document.getElementById('friend-email-input');
  if (inp) inp.value = '';
  alert('✅ Заявка отправлена!');
}

async function acceptFriendRequest(requestId) {
  if (!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session?.user) return;
  const { error } = await sbClient
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId);
  if (error) { showToast('❌ Ошибка'); return; }
  showToast('✅ Заявка принята!');
  await loadSocialData(session.user);
}

async function declineFriendRequest(requestId) {
  if (!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session?.user) return;
  await sbClient.from('friendships').update({ status: 'declined' }).eq('id', requestId);
  showToast('Заявка отклонена');
  await loadSocialData(session.user);
}

async function loadSocialData(user) {
  const requestsEl = document.getElementById('social-requests');
  const friendsEl = document.getElementById('social-friends');
  if (requestsEl) requestsEl.innerHTML = '<div class="social-loading">⏳</div>';
  if (friendsEl) friendsEl.innerHTML = '<div class="social-loading">⏳</div>';

  const { data: incoming } = await sbClient
    .from('friendships')
    .select('*')
    .eq('receiver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const senderIds = (incoming || []).map(r => r.sender_id);
  const { data: senderProfiles } = senderIds.length > 0
    ? await sbClient.from('user_profiles').select('user_id,name,email').in('user_id', senderIds)
    : { data: [] };
  const senderMap = {};
  (senderProfiles || []).forEach(p => { senderMap[p.user_id] = p; });

  if (requestsEl) {
    if (!incoming || incoming.length === 0) {
      requestsEl.innerHTML = '<div class="social-empty">Нет входящих заявок</div>';
    } else {
      requestsEl.innerHTML = incoming.map(r => {
        const sender = senderMap[r.sender_id] || {};
        const displayName = sender.name || sender.email || r.sender_id;
        const displayEmail = sender.email || '';
        return `
        <div class="social-req-card">
          <div class="src-avatar">${escapeHtml(displayName.charAt(0).toUpperCase())}</div>
          <div class="src-info">
            <div class="src-name">${escapeHtml(displayName)}</div>
            <div class="src-email">${escapeHtml(displayEmail)}</div>
          </div>
          <div class="src-btns">
            <button class="src-btn src-accept" onclick="acceptFriendRequest(${r.id})">✅</button>
            <button class="src-btn src-decline" onclick="declineFriendRequest(${r.id})">✕</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  const { data: accepted } = await sbClient
    .from('friendships')
    .select('*')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

  if (!friendsEl) return;
  if (!accepted || accepted.length === 0) {
    friendsEl.innerHTML = '<div class="social-empty">Пока нет друзей — добавьте их по email!</div>';
    return;
  }

  const friendIds = accepted
    .map(r => r.sender_id === user.id ? r.receiver_id : r.sender_id)
    .filter(Boolean);

  const today = todayStr();
  const [todayRes, profilesRes] = await Promise.all([
    friendIds.length > 0
      ? sbClient.from('user_data').select('user_id,state').in('user_id', friendIds).eq('date', today)
      : Promise.resolve({ data: [] }),
    friendIds.length > 0
      ? sbClient.from('user_profiles').select('user_id,name,email,targetK,streak').in('user_id', friendIds)
      : Promise.resolve({ data: [] }),
  ]);

  const todayMap = {};
  (todayRes.data || []).forEach(d => { todayMap[d.user_id] = d.state || {}; });
  const profMap = {};
  (profilesRes.data || []).forEach(p => { profMap[p.user_id] = p; });

  friendsEl.innerHTML = accepted.map(r => {
    const fid = r.sender_id === user.id ? r.receiver_id : r.sender_id;
    const prof = profMap[fid] || {};
    const state = todayMap[fid] || {};

    const fEmail = prof.email || '';
    const displayName = prof.name || prof.email || fid;
    const streak = prof.streak || 0;
    const water = typeof state.water === 'number' ? state.water : 0;
    const waterPct = Math.min(100, Math.round(water / 2000 * 100));
    const entries = Array.isArray(state.entries) ? state.entries : [];
    const kcal = entries.reduce((s, e) => s + (e.calories || 0), 0);
    const targetK = prof.targetK || 2000;
    const kcalPct = Math.min(100, Math.round(kcal / targetK * 100));

    return `
      <div class="social-friend-card">
        <div class="sfc-avatar">${escapeHtml(displayName.charAt(0).toUpperCase())}</div>
        <div class="sfc-body">
          <div class="sfc-top">
            <div class="sfc-name">${escapeHtml(displayName)}</div>
            <div class="sfc-streak">🔥 ${streak}</div>
          </div>
          <div class="sfc-email">${escapeHtml(fEmail)}</div>
          <div class="sfc-bars">
            <div class="sfc-bar-row">
              <span class="sfc-bar-label">💧 ${water} мл</span>
              <div class="sfc-bar-track"><div class="sfc-bar-fill sfc-water" style="width:${waterPct}%"></div></div>
            </div>
            <div class="sfc-bar-row">
              <span class="sfc-bar-label">🔥 ${kcal} ккал</span>
              <div class="sfc-bar-track"><div class="sfc-bar-fill sfc-kcal" style="width:${kcalPct}%"></div></div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}
