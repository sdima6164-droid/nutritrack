/* ===== STATE ===== */
let currentTab = 'diary';
let currentDate = todayStr();
let selectedFood = null;
let modalTab = 'search';
let profileGoal = 'maintain';
let chartWeek = null;
let chartPie = null;

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
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

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
}

/* ===== DIARY PAGE ===== */
function renderDiary() {
  // Date display
  document.getElementById('date-display').textContent = formatDate(currentDate);

  const entries = getDayLog(currentDate);
  const totals = sumLog(entries);
  const targets = getTargets();

  // Rings
  renderRing('ring-p', 'protein', totals.proteins, targets.proteins, 'Б');
  renderRing('ring-f', 'fat', totals.fats, targets.fats, 'Ж');
  renderRing('ring-c', 'carb', totals.carbs, targets.carbs, 'У');
  renderRing('ring-k', 'kcal', totals.calories, targets.calories, 'ккал');

  // Totals card
  document.getElementById('total-p').textContent = totals.proteins + 'г';
  document.getElementById('total-f').textContent = totals.fats + 'г';
  document.getElementById('total-c').textContent = totals.carbs + 'г';
  document.getElementById('total-k').textContent = totals.calories;

  // Food list
  const listEl = document.getElementById('food-list');
  if (entries.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <p>Нет записей за этот день.<br>Нажмите «+ Добавить продукт»</p>
      </div>`;
  } else {
    listEl.innerHTML = entries.map((e, i) => `
      <div class="food-entry">
        <div class="food-entry-info">
          <div class="food-entry-name">${e.name}</div>
          <div class="food-entry-weight">${e.weight} г</div>
          <div class="food-entry-macros">
            <span class="macro-pill p">Б ${e.proteins}г</span>
            <span class="macro-pill f">Ж ${e.fats}г</span>
            <span class="macro-pill c">У ${e.carbs}г</span>
            <span class="macro-pill k">${e.calories} ккал</span>
          </div>
        </div>
        <button class="food-entry-delete" onclick="deleteEntry(${i})" aria-label="Удалить">✕</button>
      </div>`).join('');
  }
}

function renderRing(id, type, val, target, label) {
  const el = document.getElementById(id);       // это .ring-wrap
  const card = el.closest('.ring-card');         // поднимаемся к карточке
  const pct = target > 0 ? Math.min(Math.round((val / target) * 100), 100) : 0;
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const fill = el.querySelector('.ring-fill');
  fill.style.strokeDasharray = circ;
  fill.style.strokeDashoffset = offset;
  el.querySelector('.ring-pct').textContent = pct + '%';
  card.querySelector('.ring-val').textContent = round1(val) + (label === 'ккал' ? '' : 'г');
}

function deleteEntry(index) {
  const entries = getDayLog(currentDate);
  entries.splice(index, 1);
  setDayLog(currentDate, entries);
  renderDiary();
  showToast('Запись удалена');
}

/* ===== MODAL ===== */
function openModal() {
  selectedFood = null;
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('search-input').value = '';
  document.getElementById('weight-input').value = '100';
  document.getElementById('food-results').innerHTML = '';
  updatePreview();
  switchModalTab('search');
  document.getElementById('search-input').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function switchModalTab(tab) {
  modalTab = tab;
  document.querySelectorAll('.modal-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  const activeTab = document.getElementById('mtab-' + tab);
  activeTab.classList.add('active');
  activeTab.setAttribute('aria-selected', 'true');

  const search = document.getElementById('modal-search-panel');
  const manual = document.getElementById('modal-manual-panel');
  if (tab === 'search') {
    search.removeAttribute('hidden');
    manual.setAttribute('hidden', '');
  } else {
    manual.removeAttribute('hidden');
    search.setAttribute('hidden', '');
  }
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
}

/* ===== PROFILE PAGE ===== */
function renderProfile() {
  const p = getProfile();
  profileGoal = p.goal || 'maintain';

  // Fill form
  document.getElementById('prof-name').value = p.name || '';
  document.getElementById('prof-age').value = p.age || '';
  document.getElementById('prof-weight').value = p.weight || '';
  document.getElementById('prof-height').value = p.height || '';
  document.getElementById('prof-targetP').value = p.targetP || 150;
  document.getElementById('prof-targetF').value = p.targetF || 65;
  document.getElementById('prof-targetC').value = p.targetC || 200;
  document.getElementById('prof-targetK').value = p.targetK || 2000;

  // Goal buttons
  document.querySelectorAll('.goal-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.goal === profileGoal);
  });

  // Stats
  const streak = calcStreak();
  document.getElementById('streak-val').textContent = streak;
  document.getElementById('streak-label').textContent = streak === 1 ? 'день подряд' : (streak < 5 ? 'дня подряд' : 'дней подряд');

  const days = countLoggedDays();
  document.getElementById('stat-days').textContent = days;
  document.getElementById('stat-avgkcal').textContent = calcAvgKcal();

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
  const p = {
    name: document.getElementById('prof-name').value.trim(),
    age: parseInt(document.getElementById('prof-age').value) || 0,
    weight: parseFloat(document.getElementById('prof-weight').value) || 0,
    height: parseInt(document.getElementById('prof-height').value) || 0,
    goal: profileGoal,
    targetP: parseFloat(document.getElementById('prof-targetP').value) || 150,
    targetF: parseFloat(document.getElementById('prof-targetF').value) || 65,
    targetC: parseFloat(document.getElementById('prof-targetC').value) || 200,
    targetK: parseFloat(document.getElementById('prof-targetK').value) || 2000,
  };
  setProfile(p);
  showToast('✓ Профиль сохранён');
  renderDiary();
}

function setGoal(goal) {
  profileGoal = goal;
  document.querySelectorAll('.goal-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.goal === goal);
  });
  // Auto-set targets based on goal
  const p = getProfile();
  const w = p.weight || 70;
  const goals = {
    cut:      { p: Math.round(w*2.2), f: Math.round(w*0.8), c: Math.round(w*2), k: Math.round(w*28) },
    maintain: { p: Math.round(w*1.8), f: Math.round(w*1.0), c: Math.round(w*3), k: Math.round(w*33) },
    bulk:     { p: Math.round(w*2.0), f: Math.round(w*1.2), c: Math.round(w*4.5), k: Math.round(w*38) },
  };
  const t = goals[goal];
  document.getElementById('prof-targetP').value = t.p;
  document.getElementById('prof-targetF').value = t.f;
  document.getElementById('prof-targetC').value = t.c;
  document.getElementById('prof-targetK').value = t.k;
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

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  switchTab('diary');

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
});
