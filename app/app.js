// Тренажёр: сборка вопросов и логика тестов.
(function () {
  const { num, shuffle } = window.QUIZ_FMT;
  const TOPICS = window.TOPICS, GEN = window.GENERATORS, STATIC = window.STATIC_QUESTIONS;
  const TOPIC_BY_CODE = {};
  TOPICS.forEach(s => s.items.forEach(t => { TOPIC_BY_CODE[t.code] = t; }));

  const SETTINGS = {
    delayCorrect: 4000,   // мс до следующего вопроса после верного ответа
    delayNextTest: 7,     // с до автозапуска следующего теста
  };

  // ── Вопрос: генератор или готовый вопрос → 4 варианта ответа ──
  const show = x => typeof x === 'number' ? num(x) : String(x);

  function buildOptions(raw) {
    if (!raw) return null;
    const answer = show(raw.a), used = new Set([answer]), wrong = [];
    for (const w of raw.w || []) {
      const s = show(w);
      if (!used.has(s)) { used.add(s); wrong.push(s); }
      if (wrong.length === 3) break;
    }
    if (wrong.length < 3 && typeof raw.a === 'number') {
      for (const d of [1, -1, 2, -2, 3, 10, -3, -10, 5]) {
        const s = num(raw.a + d);
        if (!used.has(s)) { used.add(s); wrong.push(s); }
        if (wrong.length === 3) break;
      }
    }
    if (wrong.length < 3) return null;
    const options = shuffle([answer, ...wrong]);
    return { q: raw.q, options, correct: options.indexOf(answer), e: raw.e || '' };
  }

  function makeQuestion(code) {
    const gens = GEN[code] || [], stat = STATIC.filter(q => q.t === code), total = gens.length + stat.length;
    if (!total) return null;
    for (let i = 0; i < 40; i++) {
      const k = Math.floor(Math.random() * total);
      let raw = null;
      try { raw = k < gens.length ? gens[k]() : stat[k - gens.length]; } catch (err) { console.error(code, err); }
      const q = buildOptions(raw);
      if (q) return { ...q, topic: code };
    }
    return null;
  }

  // ── Задания в формате номеров ЕГЭ ──
  const EXAM = window.EXAM, MET = window.METODIST;
  const goalNow = () => (mem.diag && mem.diag.goal) || 'profile';
  const examTasks = (goal = goalNow()) => EXAM[goal].tasks;
  const examTask = (n, goal = goalNow()) => examTasks(goal).find(t => t.n === n);
  // Задача под номер: сначала задачи в формате этого номера, иначе — генераторы его тем.
  function makeExamQuestion(n, goal = goalNow()) {
    const t = examTask(n, goal); if (!t) return null;
    const own = EXAM.gens[(goal === 'base' ? 'b' : 'p') + n] || [];
    for (let i = 0; i < 20; i++) {
      if (own.length && (Math.random() < 0.7 || i > 10)) {
        const g = own[Math.floor(Math.random() * own.length)];
        let raw = null;
        try { raw = g.f(); } catch (err) { console.error(n, err); }
        const q = buildOptions(raw);
        if (q) return { ...q, topic: g.topic, exam: n };
      } else {
        const q = makeQuestion(t.topics[Math.floor(Math.random() * t.topics.length)]);
        if (q) return { ...q, exam: n };
      }
    }
    return null;
  }
  // Пробник: по одной задаче на каждый номер первой части, по порядку.
  function buildMock() {
    return examTasks().filter(t => t.part === 1).map(t => makeExamQuestion(t.n)).filter(Boolean).map(q => ({ ...q, block: 'Пробник' }));
  }

  function topicCodes(sel) {
    if (sel === 'all') return Object.keys(TOPIC_BY_CODE);
    if (sel.startsWith('s:')) return TOPICS.find(s => s.code === sel.slice(2)).items.map(t => t.code);
    if (sel.startsWith('e:')) return examTask(+sel.slice(2)).topics;
    return [sel];
  }

  function buildTest(sel, count) {
    const codes = topicCodes(sel), seen = new Set(), list = [], exam = sel.startsWith('e:') ? +sel.slice(2) : 0;
    for (let guard = 0; list.length < count && guard < 600; guard++) {
      const q = exam ? makeExamQuestion(exam) : makeQuestion(codes[Math.floor(Math.random() * codes.length)]);
      if (!q || (seen.has(q.q) && guard < 400)) continue;
      seen.add(q.q); list.push(q);
    }
    return list;
  }

  // ── Статистика (хранится в браузере) ──
  const STORE_KEY = 'ultraschool.math.stats';
  function loadStats() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  function saveStats(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* без статистики */ } }
  let stats = loadStats();
  function record(code, ok) {
    const s = stats[code] || (stats[code] = { n: 0, ok: 0 });
    s.n++; if (ok) s.ok++; saveStats(stats);
    const d = today();
    d.n++; if (ok) d.ok++; savePlan();
  }

  // ── План на сегодня: интервальное повторение по темам ──
  // Тема «в коробке» box: верно ≥ 80% → коробка выше и повтор позже, < 60% → снова завтра.
  const PLAN = {
    size: 15,                        // задач в дневном плане
    focus: 7,                        // задач по главной теме дня
    reviewTopics: 3, perReview: 2,   // тем на повторение и задач на каждую
    intervals: [1, 3, 7, 14, 30],    // через сколько дней повторять тему в коробке 0, 1, 2…
    learnedBox: 3,                   // с этой коробки тема считается освоенной
    extra: 5,                        // «ещё задач» после плана
  };
  const PLAN_KEY = 'ultraschool.math.plan';
  const ALL_CODES = Object.keys(TOPIC_BY_CODE);
  function loadMem() { try { return JSON.parse(localStorage.getItem(PLAN_KEY)) || {}; } catch (e) { return {}; } }
  function savePlan() { try { localStorage.setItem(PLAN_KEY, JSON.stringify(mem)); } catch (e) { /* без памяти */ } }
  let mem = loadMem();
  const resetMem = () => { mem = { topics: {}, days: {} }; };
  if (!mem.topics || !mem.days) resetMem();

  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };
  const today = () => mem.days[dayKey()] || (mem.days[dayKey()] = { n: 0, ok: 0, done: false });
  const started = () => ALL_CODES.filter(c => mem.topics[c]);
  const isLearned = c => mem.topics[c] && mem.topics[c].box >= PLAN.learnedBox;
  const isDue = (c, key = dayKey()) => mem.topics[c] && mem.topics[c].due <= key;
  const topicAcc = c => stats[c] && stats[c].n ? stats[c].ok / stats[c].n : 0;
  // Настройки из программы методиста: задач в день и интервалы повторения зависят от режима.
  const M = () => mem.diag && mem.diag.m;
  const intervals = () => (M() && M().intervals) || PLAN.intervals;
  const planSize = () => (M() && M().perDay) || PLAN.size;
  const planFocus = () => Math.min(10, Math.round(planSize() * 0.47)); // больше 10 задач подряд на одну тему — уже не работает

  function updateMemory(results, minN) {
    const key = dayKey();
    Object.entries(results).forEach(([code, r]) => {
      if (r.n < minN) return;
      const t = mem.topics[code] || { box: 0 }, acc = r.ok / r.n;
      if (acc < 0.6) t.box = 0;
      else if (acc >= 0.8 && t.up !== key) { t.box = Math.min(t.box + 1, PLAN.intervals.length - 1); t.up = key; }
      t.due = addDays(key, intervals()[t.box]);
      mem.topics[code] = t;
    });
    savePlan();
  }

  function streakDays() {
    let key = today().done ? dayKey() : addDays(dayKey(), -1), n = 0;
    while (mem.days[key] && mem.days[key].done) { n++; key = addDays(key, -1); }
    return n;
  }

  function sample(arr, k) { return shuffle(arr.slice()).slice(0, k); }

  function todayPlan() {
    const d = today();
    if (d.plan) return d.plan;
    const key = dayKey(), seen = started(), m = M(), size = planSize();
    const due = seen.filter(c => isDue(c, key))
      .sort((a, b) => mem.topics[a].due.localeCompare(mem.topics[b].due) || mem.topics[a].box - mem.topics[b].box);
    // Главная тема: слабая из начатых, иначе следующая по программе методиста;
    // темы вне программы — в конец, уверенные — после программы.
    const diag = mem.diag, idx = c => ALL_CODES.indexOf(c);
    const rank = c => diag && diag.priority.includes(c) ? diag.priority.indexOf(c) : 999;
    const goalOk = c => !diag || inGoal(c, diag.goal, m && m.target);
    const freshKey = c => !goalOk(c) ? 3000 + idx(c) : rank(c) < 999 ? rank(c)
      : diag && diag.p[c] >= 0.8 ? 2000 + idx(c) : 1000 + idx(c);
    const weak = seen.filter(c => mem.topics[c].box === 0 && goalOk(c)).sort((a, b) => rank(a) - rank(b) || topicAcc(a) - topicAcc(b));
    const fresh = ALL_CODES.filter(c => !mem.topics[c]).sort((a, b) => freshKey(a) - freshKey(b));
    const reviewsOf = focus => due.filter(c => c !== focus)
      .slice(0, Math.min(PLAN.reviewTopics, Math.floor((size - (focus ? planFocus() : 0)) / PLAN.perReview)));
    // Номера ЕГЭ, темы которых ученик уже начал: их решаем в формате экзамена.
    const examPool = m ? m.picked.concat(m.keep).filter(n => examTask(n).part === 1 && examTask(n).topics.some(c => mem.topics[c])) : [];

    // Финиш: новых тем нет — задания в формате ЕГЭ по всем номерам первой части и повторение.
    if (m && m.mode.key === 'finish') {
      const reviews = reviewsOf(null), part1 = examTasks().filter(t => t.part === 1).map(t => t.n);
      const exam = [], need = size - reviews.length * PLAN.perReview;
      while (exam.length < need) exam.push(...sample(part1, need - exam.length));
      d.plan = { focus: null, focusNew: false, reviews, mixed: [], exam, scout: false };
      savePlan(); return d.plan;
    }

    let focus = weak[0], focusNew = false;
    if (!focus && fresh.length) { focus = fresh[0]; focusNew = true; }
    if (!focus) focus = seen.slice().sort((a, b) => mem.topics[a].box - mem.topics[b].box)[0];
    const reviews = reviewsOf(focus);
    const pool = seen.filter(c => c !== focus && !reviews.includes(c));
    // Пока пройденных тем мало — «разведка» по новым темам, чтобы найти слабые места.
    const scout = !pool.length;
    const restN = size - planFocus() - reviews.length * PLAN.perReview;
    const exam = scout ? [] : sample(examPool, Math.min(examPool.length, size >= 15 ? 3 : 2, Math.max(0, restN - 1)));
    const mixedN = restN - exam.length;
    const src = scout ? fresh.filter(c => c !== focus && goalOk(c)) : pool;
    let mixed = sample(src, mixedN);
    while (mixed.length < mixedN) mixed.push(src.length ? src[Math.floor(Math.random() * src.length)] : focus);
    d.plan = { focus, focusNew, reviews, mixed, exam, scout };
    savePlan();
    return d.plan;
  }

  function buildPlanTest(plan) {
    const seen = new Set();
    const take = (make, block) => {
      for (let i = 0; i < 20; i++) {
        const q = make();
        if (q && !seen.has(q.q)) { seen.add(q.q); return { ...q, block }; }
      }
      return null;
    };
    const head = [], tail = [];
    if (plan.focus) for (let i = 0; i < planFocus(); i++) head.push(take(() => makeQuestion(plan.focus), plan.focusNew ? 'Новая тема' : 'Слабая тема'));
    plan.reviews.forEach(c => { for (let i = 0; i < PLAN.perReview; i++) tail.push(take(() => makeQuestion(c), 'Повторение')); });
    plan.mixed.forEach(c => tail.push(take(() => makeQuestion(c), plan.scout ? 'Разведка' : 'Вперемешку')));
    (plan.exam || []).forEach(n => tail.push(take(() => makeExamQuestion(n), 'Как на ЕГЭ')));
    return head.concat(shuffle(tail)).filter(Boolean);
  }

  function buildExtraTest() {
    const pool = started().length ? started() : ALL_CODES, list = [], seen = new Set();
    for (let guard = 0; list.length < PLAN.extra && guard < 200; guard++) {
      const q = makeQuestion(pool[Math.floor(Math.random() * pool.length)]);
      if (q && !seen.has(q.q)) { seen.add(q.q); list.push({ ...q, block: 'Бонус' }); }
    }
    return list;
  }

  // ── Стартовая диагностика ──
  // У каждой темы — вероятность «знает» p (сначала 0,5). Ответ меняет p самой темы и связанных:
  // ошибка тянет вниз темы, которые на неё опираются; верный ответ поднимает темы-основы.
  // Следующий вопрос — по теме, ответ на которую больше всего проясняет картину.
  const DIAG = window.DIAGNOSTIC, PREREQ = DIAG.links, DEPS = {};
  ALL_CODES.forEach(c => { DEPS[c] = []; });
  Object.entries(PREREQ).forEach(([c, ps]) => ps.forEach(p => DEPS[p].push(c)));
  function around(code, map, depth = 2) { // связанные темы: { код: шагов до неё }
    const out = {}, queue = [[code, 0]];
    while (queue.length) {
      const [c, d] = queue.shift();
      if (d >= depth) continue;
      (map[c] || []).forEach(n => { if (!(n in out)) { out[n] = d + 1; queue.push([n, d + 1]); } });
    }
    return out;
  }
  const reach = c => Object.keys(around(c, DEPS, 9)).length; // сколько тем опирается на эту
  const sectionOf = c => c.split('.')[0];
  // Тема «в цели», если она нужна для номеров экзамена под эту цель (или на неё опираются такие темы).
  const goalMemo = {};
  function inGoal(c, goal, target) {
    const k = goal + '|' + target;
    if (!goalMemo[k]) {
      const set = new Set();
      const walk = x => { if (set.has(x)) return; set.add(x); (PREREQ[x] || []).forEach(walk); };
      EXAM[goal].tasks.filter(t => target == null || MET.allowed(t, goal, target)).forEach(t => t.topics.forEach(walk));
      goalMemo[k] = set;
    }
    return goalMemo[k].has(c) && (goal !== 'base' || TOPIC_BY_CODE[c].level !== 'УУ');
  }
  const unc = p => 1 - Math.abs(2 * p - 1);

  const ob = {};
  function diagReset(goal) {
    Object.assign(ob, { goal, p: {}, why: {}, asked: [], q: null, picks: [], humor: true, step: 0,
      year: ob.year || 0, target: null, minutes: null });
    ALL_CODES.forEach(c => { ob.p[c] = 0.5; });
  }
  const examWeight = c => EXAM[ob.goal].tasks.filter(t => MET.allowed(t, ob.goal, ob.target) && t.topics.includes(c)).reduce((x, t) => x + t.pts, 0);
  const askedSet = () => new Set(ob.asked.map(a => a.code));

  function diagNext() {
    const asked = askedSet(), perSec = {};
    ob.asked.forEach(a => { perSec[sectionOf(a.code)] = (perSec[sectionOf(a.code)] || 0) + 1; });
    let best = null, bestScore = -1;
    ALL_CODES.filter(c => inGoal(c, ob.goal, ob.target) && !asked.has(c)).forEach(c => {
      const near = Object.assign({}, around(c, PREREQ), around(c, DEPS));
      let s = unc(ob.p[c]) * (1 + reach(c) * 0.08);
      Object.entries(near).forEach(([n, d]) => { if (inGoal(n, ob.goal, ob.target) && !asked.has(n)) s += unc(ob.p[n]) * 0.35 / d; });
      s *= 1 + 0.12 * Math.min(4, examWeight(c));     // чаще спрашиваем темы, которые дают баллы
      s *= Math.pow(0.45, perSec[sectionOf(c)] || 0); // раскидываем вопросы по разделам
      s *= 0.9 + Math.random() * 0.2;                   // чтобы диагностика не была у всех одинаковой
      if (s > bestScore) { bestScore = s; best = c; }
    });
    return best;
  }

  function diagUpdate(code, ok) {
    const p = ob.p, asked = askedSet();
    if (ok) {
      p[code] = 0.95;
      Object.entries(around(code, PREREQ)).forEach(([c, d]) => { if (!asked.has(c)) p[c] = Math.max(p[c], d === 1 ? 0.85 : 0.75); });
      Object.keys(around(code, DEPS, 1)).forEach(c => { if (!asked.has(c)) p[c] = Math.min(0.9, p[c] + 0.05); });
    } else {
      p[code] = 0.1; ob.why[code] = 'Ошибка в диагностике';
      Object.entries(around(code, DEPS)).forEach(([c, d]) => {
        if (asked.has(c)) return;
        p[c] = Math.min(p[c], d === 1 ? 0.3 : 0.4);
        if (!ob.why[c]) ob.why[c] = `Опирается на тему ${code}, где была ошибка`;
      });
      Object.keys(around(code, PREREQ, 1)).forEach(c => { if (!asked.has(c)) p[c] = Math.max(0.1, p[c] - 0.12); });
    }
  }

  // Глубина темы: сколько шагов до самых базовых тем. Траектория идёт от основ к сложному.
  const depthMemo = {};
  function depth(c) {
    if (!(c in depthMemo)) depthMemo[c] = (PREREQ[c] || []).reduce((m, p) => Math.max(m, depth(p) + 1), 0);
    return depthMemo[c];
  }

  // Экзамен по выбранному году: основной период — начало июня.
  const examDateFor = year => { const d = new Date(DIAG.examDate); d.setFullYear(d.getFullYear() + (year || 0)); return dayKey(d); };

  function diagResult() {
    const codes = ALL_CODES.filter(c => inGoal(c, ob.goal, ob.target)), p = ob.p;
    const avg = codes.reduce((s, c) => s + p[c], 0) / codes.length;
    const correct = ob.asked.filter(a => a.ok).length;
    const level = avg >= 0.65 ? 'уверенный' : avg >= 0.45 ? 'средний' : 'стартовый';
    const sections = TOPICS.map(s => {
      const cs = s.items.map(t => t.code).filter(c => inGoal(c, ob.goal, ob.target));
      if (!cs.length) return null;
      const v = cs.reduce((x, c) => x + p[c], 0) / cs.length;
      return { code: s.code, title: s.title, v, status: v >= 0.65 ? 'good' : v >= 0.45 ? 'mid' : 'weak' };
    }).filter(Boolean);
    const program = DIAG.programs[ob.goal][level];
    // Методист: режим по сроку, отбор номеров по цене балла, траектория и прогноз.
    const m = MET.build({ goal: ob.goal, target: ob.target, minutes: ob.minutes, examDate: examDateFor(ob.year), p });
    return { avg, correct, level, sections, program, m, route: { steps: m.steps, weeksLeft: m.weeksLeft, pace: m.pace }, priority: m.topics };
  }

  // Пересобрать программу (сменили цель/время или прошла неделя): та же диагностика, свежие сроки.
  function rebuildProgram(patch = {}) {
    const d = mem.diag; if (!d || !d.m) return;
    const m = MET.build({ goal: d.goal, target: d.m.target, minutes: d.m.minutes, examDate: d.m.examDate, p: d.p, ...patch });
    d.m = m; d.route = { steps: m.steps, weeksLeft: m.weeksLeft, pace: m.pace }; d.priority = m.topics; d.built = dayKey();
    const t = today(); if (!t.done) delete t.plan;
    savePlan();
  }

  // Стиль объяснений: strict — строгие формулировки, informal — простым языком; humor — шутки Икса.
  const prefs = () => mem.prefs || { style: 'informal', humor: true };

  function diagApply(res) {
    const key = dayKey();
    mem.diag = { date: key, goal: ob.goal, p: ob.p, priority: res.priority, why: ob.why, level: res.level, correct: res.correct,
      program: res.program, route: res.route, sections: res.sections, m: res.m, built: key };
    const strict = ob.picks.filter(x => x === 'strict').length;
    mem.prefs = { style: strict * 2 > ob.picks.length ? 'strict' : 'informal', humor: ob.humor };
    ob.asked.forEach(({ code, ok }) => {
      if (mem.topics[code]) return;
      mem.topics[code] = ok ? { box: 1, due: addDays(key, intervals()[1]) } : { box: 0, due: key };
    });
    const d = today();
    if (!d.done) delete d.plan; // план на сегодня пересобираем с учётом диагностики
    savePlan();
  }

  // ── Реплики персонажей (без повторов подряд) ──
  const PH = window.PHRASES, recent = {};
  function say(list) {
    const arr = PH[list], used = recent[list] || (recent[list] = []);
    let i, guard = 0;
    do { i = Math.floor(Math.random() * arr.length); } while (used.includes(i) && guard++ < 50);
    used.push(i); if (used.length > Math.min(12, arr.length - 1)) used.shift();
    return arr[i];
  }

  // ── Интерфейс ──
  const $ = id => document.getElementById(id);
  const screens = ['menu', 'quiz', 'result'];
  const showScreen = name => { screens.forEach(s => { $(s).hidden = s !== name; }); window.scrollTo(0, 0); if (name === 'menu') window.dispatchEvent(new Event('ultra:menu')); };
  const IMG = { hi: 'assets/x-hi.png', wow: 'assets/x-wow.png', meh: 'assets/x-meh.png', shrug: 'assets/x-meh.png' };

  const state = {
    mode: 'free', // free — свободная практика, plan — план на сегодня, extra — задачи сверх плана
    sel: 'all', view: 'all', count: 10, testNo: 0, list: [], marks: [], idx: 0, score: 0,
    answered: false, streak: 0, timer: null, tick: null, left: 0, startedAt: 0,
  };

  // ── Меню ──
  function selLabel(sel) {
    if (sel === 'all') return 'Все темы вперемешку';
    if (sel.startsWith('s:')) return 'Раздел: ' + TOPICS.find(s => s.code === sel.slice(2)).title;
    if (sel.startsWith('e:')) return `№${sel.slice(2)} ЕГЭ · ${examTask(+sel.slice(2)).title}`;
    return sel + ' ' + TOPIC_BY_CODE[sel].title;
  }

  function topicStat(codes) {
    let n = 0, ok = 0;
    codes.forEach(c => { if (stats[c]) { n += stats[c].n; ok += stats[c].ok; } });
    return { n, ok, pct: n ? Math.round(ok / n * 100) : 0 };
  }

  function renderChips() {
    const chips = [['all', 'Все темы'], ['exam', 'Номера ЕГЭ']].concat(TOPICS.map(s => [s.code, `${s.code}. ${s.title}`]));
    $('chips').innerHTML = chips.map(([v, t]) => `<button class="chip${state.view === v ? ' on' : ''}${v === 'exam' ? ' exam' : ''}" data-v="${v}">${t}</button>`).join('');
  }

  const STATUS = { pick: 'в программе', keep: 'держим в тонусе', later: 'отложено', skip: 'вне цели' };
  const ptsWord = n => n === 1 ? 'балл' : n < 5 ? 'балла' : 'баллов';
  function renderExamTasks() {
    const m = M(), info = {};
    (m ? m.tasks : []).forEach(t => { info[t.n] = t; });
    let html = `<button class="topic all" data-act="mock"><span class="ttl">Пробник: ${examTasks().filter(t => t.part === 1).length} задач первой части по порядку</span><span class="code">→</span></button>`;
    examTasks().forEach(t => {
      const st = topicStat(t.topics), s = info[t.n] ? info[t.n].status : '';
      html += `<button class="topic ex-${s}${state.sel === 'e:' + t.n ? ' on' : ''}" data-sel="e:${t.n}">
        <span class="code">№${t.n}</span><span class="lvl">${t.part === 2 ? 'часть 2 · ' : ''}${t.pts} ${ptsWord(t.pts)}</span>
        <span class="ttl">${t.title}</span>
        <span class="prog"><i style="width:${st.pct}%"></i></span>
        <span class="stat">${s ? STATUS[s] + ' · ' : ''}темы ${t.topics.join(', ')}${st.n ? ` · верно ${st.pct}%` : ''}</span></button>`;
    });
    $('topics').innerHTML = html;
    $('startLabel').textContent = selLabel(state.sel);
  }

  function renderTopics() {
    if (state.view === 'exam') return renderExamTasks();
    const sections = state.view === 'all' ? TOPICS : TOPICS.filter(s => s.code === state.view);
    const allSel = state.view === 'all' ? 'all' : 's:' + state.view;
    const allSt = topicStat(topicCodes(allSel)), goal = goalNow();
    let html = `<button class="topic all${state.sel === allSel ? ' on' : ''}" data-sel="${allSel}">
      <span class="ttl">${state.view === 'all' ? 'Все темы вперемешку' : 'Весь раздел целиком'}</span>
      <span class="code">${allSt.n ? allSt.pct + '%' : '→'}</span></button>`;
    sections.forEach(s => s.items.forEach(t => {
      const st = topicStat([t.code]), nums = EXAM.tasksOfTopic(goal, t.code);
      const tag = nums.length ? `ЕГЭ №${nums.join(', ')}` : 'вне экзамена';
      html += `<button class="topic${state.sel === t.code ? ' on' : ''}${nums.length ? '' : ' off'}" data-sel="${t.code}">
        <span class="code">${t.code}</span><span class="lvl">${tag}</span>
        <span class="ttl">${t.title}</span>
        ${window.VideoPlayer ? VideoPlayer.badge(t.code) : ''}
        <span class="prog"><i style="width:${st.pct}%"></i></span>
        <span class="stat">${st.n ? `решено ${st.n} · верно ${st.pct}%` : 'ещё не решал'}${isLearned(t.code) ? ' · <b>освоена</b>' : isDue(t.code) ? ' · повторить' : ''}</span></button>`;
    }));
    $('topics').innerHTML = html;
    $('startLabel').textContent = selLabel(state.sel);
  }

  function renderMenu() {
    const st = topicStat(Object.keys(TOPIC_BY_CODE));
    if ($('statsPill')) $('statsPill').textContent = st.n ? `✓ ${st.ok} из ${st.n} · ${st.pct}%` : 'Новичок';
    // Пока нет диагностики — задания закрыты, в приветственном окне сразу тест.
    if (!diagDone()) return renderHeroIntro();
    // Раз в неделю методист пересобирает программу: срок до экзамена сокращается, режим может смениться.
    if (mem.diag.built && addDays(mem.diag.built, 7) <= dayKey()) rebuildProgram();
    renderHeroDone();
    renderClock(); renderRoute(); renderPlan(); renderPace(); renderPrefs(); renderChips(); renderTopics();
  }

  const short = c => `${c} ${TOPIC_BY_CODE[c].title}`;
  function renderPlan() {
    const p = todayPlan(), d = today(), streak = streakDays(), m = M();
    const tomorrow = started().filter(c => isDue(c, addDays(dayKey(), 1))).length;
    const total = (p.focus ? planFocus() : 0) + p.reviews.length * PLAN.perReview + p.mixed.length + (p.exam || []).length;
    $('plan').classList.toggle('done', d.done);
    $('streak').textContent = streak ? `Серия ${streak} дн.` : 'Серия 0';
    $('streak').classList.toggle('hot', streak > 0);
    $('planTitle').textContent = d.done ? 'Готово на сегодня' : `${total} задач · ~${m ? m.minutes : 20} минут`;
    const rows = [];
    if (p.focus) rows.push([planFocus(), p.focusNew ? 'Новая тема' : 'Слабая тема', short(p.focus)]);
    // в повторении — только начало названия, чтобы строка не разрасталась
    if (p.reviews.length) rows.push([p.reviews.length * PLAN.perReview, 'Повторение',
      p.reviews.map(c => `${c} ${TOPIC_BY_CODE[c].title.split(/[.,(]/)[0]}`).join(' · ')]);
    if (p.mixed.length) rows.push([p.mixed.length, p.scout ? 'Разведка' : 'Вперемешку',
      p.scout ? 'Случайные темы: найдём твои слабые места' : 'Пройденные темы без подсказки, какая где']);
    if ((p.exam || []).length) rows.push([p.exam.length, 'Как на ЕГЭ',
      `Задания в формате экзамена: №${[...new Set(p.exam)].sort((a, b) => a - b).join(', ')}`]);
    $('planSteps').innerHTML = rows.map(([n, label, text]) =>
      `<div class="step"><span class="n">${n}</span><div><b>${label}</b><span>${text}</span></div></div>`).join('');
    $('planHint').textContent = d.done ? `Сегодня решено ${d.n}` : p.focus ? 'Сначала тема дня, потом вперемешку' : 'Задания по всем номерам первой части';
    $('planBtn').textContent = d.done ? `Ещё ${PLAN.extra} задач →` : 'Начать план →';
    const learned = ALL_CODES.filter(isLearned).length, need = m ? m.topics.length : ALL_CODES.length;
    const learnedIn = m ? m.topics.filter(isLearned).length : learned;
    $('planFoot').textContent = `Программа: освоено ${learnedIn} из ${need} тем · на повторении: ${started().length - learned}` +
      (d.done ? ` · завтра повторить: ${tomorrow}` : '');
  }

  const targetLabel = (goal, v) => (MET.CFG.targets[goal].find(t => t.v === v) || { label: v }).label;
  const MINUTES = [15, 25, 40];
  function renderPrefs() {
    const pr = prefs(), m = M();
    $('prefs').innerHTML =
      (m ? `<button data-pref="target">Цель: <b>${targetLabel(m.goal, m.target)}</b></button>` : '') +
      `<button data-pref="style">Объяснения: <b>${pr.style === 'strict' ? 'строгие' : 'простым языком'}</b></button>` +
      `<button data-pref="humor">Шутки Икса: <b>${pr.humor ? 'вкл' : 'выкл'}</b></button>`;
  }

  const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many;
  // ── Программа дня: 15 / 25 / 40 минут — у каждой своё число задач, темп и прогноз ──
  function renderPace() {
    const d = mem.diag, m = d.m, t = today();
    const opts = MINUTES.map(v => v === m.minutes ? m
      : MET.build({ goal: d.goal, target: m.target, minutes: v, examDate: m.examDate, p: d.p }));
    const val = x => d.goal === 'base' ? `«${x.forecast.after.value}»` : `≈ ${x.forecast.after.value}`;
    $('pace').innerHTML = `
      <div class="pace-seg" role="radiogroup" aria-label="Программа в день">${opts.map(x => `
        <button role="radio" aria-checked="${x.minutes === m.minutes}" class="${x.minutes === m.minutes ? 'on' : ''}" data-min="${x.minutes}">
          <b>${x.minutes} мин</b><span>${x.perDay} задач в день</span><em>${x.topics.length} ${plural(x.topics.length, "тема", "темы", "тем")} · ${val(x)}</em>
        </button>`).join('')}</div>
      <div class="pace-note">${t.done ? 'Сегодняшний план уже выполнен — новая программа начнётся завтра.'
        : 'Переключай в любой момент: методист пересоберёт траекторию и план на сегодня.'}</div>`;
  }

  // ── Шкала времени до экзамена: обратный отсчёт и этапы траектории, обновляется каждую секунду ──
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const fromKey = k => { const [y, mo, dd] = k.split('-').map(Number); return new Date(y, mo - 1, dd); };
  const KIND = { learn: 'Учим', review: 'Повторяем', exam: 'Пробники' };
  let clockTimer = null;
  function clockGeo() {
    const d = mem.diag, m = d.m;
    const exam = new Date(`${m.examDate}T10:00:00+03:00`); // экзамены начинаются в 10:00 по местному времени; берём Москву
    const start = fromKey(d.built || d.date);
    return { m, exam, start, span: Math.max(1, exam - start) };
  }
  const pct = (g, t) => Math.max(0, Math.min(100, (t - g.start) / g.span * 100));
  function renderClock() {
    const g = clockGeo(), m = g.m, wk = 7 * 864e5;
    const segs = m.steps.map((st, i) => {
      const a = new Date(+g.start + (st.from - 1) * wk), b = new Date(Math.min(+g.start + st.to * wk, +g.exam));
      return { st, i, a, b, l: pct(g, a), w: Math.max(0.6, pct(g, b) - pct(g, a)) };
    }).filter(s => s.b > s.a);
    const ticks = [];
    for (let t = new Date(g.start.getFullYear(), g.start.getMonth() + 1, 1); t < g.exam; t = new Date(t.getFullYear(), t.getMonth() + 1, 1))
      ticks.push(`<i style="left:${pct(g, t)}%"><span>${MONTHS[t.getMonth()]}</span></i>`);
    const short = dt => `${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]}`;
    $('examClock').innerHTML = `
      <div class="clock-head">
        <div>
          <div class="plan-eyebrow">До ЕГЭ по математике · ${m.goal === 'base' ? 'база' : 'профиль'}</div>
          <div class="clock-num" id="clockNum" aria-live="off"></div>
        </div>
        <div class="clock-date"><b>${short(g.exam)} ${g.exam.getFullYear()}, 10:00</b><small>ориентир: расписание ЕГЭ ещё не утверждено</small></div>
      </div>
      <div class="tl">
        <div class="tl-bar">
          ${segs.map(s => `<span class="tl-seg ${s.st.kind}${s.st.kind === 'learn' && s.i % 2 ? ' alt' : ''}" style="left:${s.l}%;width:${s.w}%"
            title="${KIND[s.st.kind]}: ${s.st.title} · ${short(s.a)} — ${short(s.b)}"></span>`).join('')}
          <i class="tl-past" id="tlPast"></i>
          <b class="tl-now" id="tlNow"><span>Сегодня</span></b>
        </div>
        <div class="tl-months">${ticks.join('')}</div>
      </div>
      <div class="tl-foot">
        <span class="tl-key"><i class="learn"></i>Учим темы</span><span class="tl-key"><i class="review"></i>Повторяем</span><span class="tl-key"><i class="exam"></i>Пробники</span>
        <span class="tl-step" id="tlStep"></span>
      </div>`;
    tickClock();
    clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 1000);
  }
  function tickClock() {
    if (!$('clockNum') || !M()) return;
    const g = clockGeo(), now = new Date(), left = Math.max(0, g.exam - now);
    const dd = Math.floor(left / 864e5), hh = Math.floor(left / 36e5) % 24, mm = Math.floor(left / 6e4) % 60, ss = Math.floor(left / 1e3) % 60;
    const two = n => String(n).padStart(2, '0');
    $('clockNum').innerHTML = left ? `<b>${dd}</b><span>${dd % 10 === 1 && dd % 100 !== 11 ? 'день' : [2, 3, 4].includes(dd % 10) && ![12, 13, 14].includes(dd % 100) ? 'дня' : 'дней'}</span>` +
      `<b>${two(hh)}</b><span>ч</span><b>${two(mm)}</b><span>мин</span><b class="sec">${two(ss)}</b><span>с</span>` : '<b>Удачи на экзамене!</b>';
    const p = pct(g, now);
    $('tlPast').style.width = p + '%';
    $('tlNow').style.left = p + '%';
    $('tlNow').classList.toggle('flip', p > 82);
    const wk = Math.floor((now - g.start) / (7 * 864e5)) + 1, st = g.m.steps.find(s => wk >= s.from && wk <= s.to);
    $('tlStep').textContent = st ? `Сейчас: ${KIND[st.kind].toLowerCase()} — ${st.title.split(' · №')[0]}` : '';
  }

  // ── Траектория в меню ──
  function routeStepState(st, i, steps) {
    if (st.kind !== 'learn') {
      const learnLeft = steps.some(s => s.kind === 'learn' && s.codes.some(c => !isLearned(c)));
      if (learnLeft) return 'next';
      const hasReview = steps.some(s => s.kind === 'review');
      return st.kind === 'review' || !hasReview ? 'now' : 'next';
    }
    if (st.codes.every(isLearned)) return 'done';
    const firstOpen = steps.findIndex(s => s.kind === 'learn' && s.codes.some(c => !isLearned(c)));
    return i === firstOpen ? 'now' : 'next';
  }

  const forecastText = m => m.goal === 'base'
    ? `Сейчас ≈ «${m.forecast.now.value}», по программе к экзамену ≈ «${m.forecast.after.value}»`
    : `Сейчас ≈ ${m.forecast.now.value} баллов, по программе к экзамену ≈ ${m.forecast.after.value}`;

  function renderRoute() {
    const d = mem.diag, m = d.m, steps = m.steps;
    const weeks = (a, b) => a === b ? `неделя ${a}` : `недели ${a}–${b}`;
    const mark = { done: '✓', now: '●', next: '' };
    const last = (mem.mocks || []).slice(-1)[0];
    let nowIdx = steps.findIndex((st, i) => routeStepState(st, i, steps) !== 'done');
    if (nowIdx < 0) nowIdx = steps.length - 1;
    const hidden = steps.some((st, i) => i < nowIdx - 1 || i > nowIdx + 1);
    $('route').innerHTML = `
      <div class="route-head">
        <div>
          <div class="plan-eyebrow">Методист · режим «${m.mode.title}» · ${d.goal === 'base' ? 'база' : 'профиль'}</div>
          <h2 class="plan-title">Траектория до экзамена</h2>
          <p class="route-sub">${m.mode.text}</p>
        </div>
      </div>
      <div class="forecast${m.forecast.reach ? ' ok' : ''}">
        <b>${forecastText(m)}</b>
        <span>Цель ${targetLabel(m.goal, m.target)} — ${m.forecast.reach ? 'успеваем' : 'пока не дотягиваем'}. Прогноз — ориентир по диагностике, уточнится по пробникам.</span>
      </div>
      <div class="route-meta">
        <span>В день: ${m.perDay} задач (~${m.minutes} мин)</span>
        <span>Тем в программе: ${m.topics.length}</span>
        ${last ? `<span>Пробник: ${last.score}/${last.of}${last.value != null ? ` → ${m.goal === 'base' ? '«' + last.value + '»' : '≈ ' + last.value}` : ''}</span>` : ''}
      </div>
      ${m.notes.length ? `<ul class="route-notes">${m.notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
      <ol class="route-steps" id="routeSteps">${steps.map((st, i) => {
        const s = routeStepState(st, i, steps);
        const far = i < nowIdx - 1 || i > nowIdx + 1;
        const body = st.kind === 'learn'
          ? st.codes.map(c => `<span class="${isLearned(c) ? 'ok' : ''}">${c} ${TOPIC_BY_CODE[c].title.split(/[.(]/)[0]}</span>`).join('')
          : `<span>${st.note}</span>`;
        return `<li class="rs is-${s}${far ? ' far' : ''}"><i>${mark[s] || i + 1}</i><div><small>${weeks(st.from, st.to)}</small><b>${st.title}</b><p>${body}</p></div></li>`;
      }).join('')}</ol>
      ${hidden ? `<button class="route-more" id="routeMore">Показать все этапы (${steps.length})</button>` : ''}
      <div class="route-cap">Карта экзамена: зелёный — в программе, тёмный — уже решаешь, серый — отложено или вне цели</div>
      <div class="exmap">${m.tasks.map(t =>
        `<em class="${t.status}" title="№${t.n} ${t.title} · ${t.pts} ${ptsWord(t.pts)} · ${STATUS[t.status]}">${t.n}</em>`).join('')}</div>
      <div class="route-actions">
        <button class="cta small" id="mockBtn"><b>Пробник первой части →</b></button>
        <button class="linkbtn" id="redoDiag">Пройти диагностику заново</button>
      </div>`;
  }

  // ── Диагностика внутри приветственного окна ──
  // Шаги: цель, время в день → задачи → стиль объяснений → шутки.
  const OB_ABOUT = 2;
  const OB_TOTAL = OB_ABOUT + DIAG.count + DIAG.style.length + 1;
  const panel = () => $('heroPanel');
  const diagDone = () => mem.diag && !mem.diag.skipped && mem.diag.m;
  const examYear = (y = 0) => new Date(DIAG.examDate).getFullYear() + y;
  const obSegments = () => `<div class="segments hero-seg">${Array.from({ length: OB_TOTAL }, (_, i) =>
    `<i class="${i < ob.step ? 'ok' : i === ob.step ? 'now' : ''}"></i>`).join('')}</div>`;
  function heroSay(text, pose = 'hi') {
    $('helloBubble').textContent = text;
    $('heroGrin').src = IMG[pose];
  }
  function setTesting(on) {
    $('hero').classList.toggle('testing', on);
    $('menuMain').hidden = on || !diagDone();
  }

  function renderHeroIntro() {
    diagReset((mem.diag && mem.diag.goal) || 'profile');
    setTesting(true);
    panel().innerHTML = `
      <div class="tags"><span class="tag">ЕГЭ ${examYear()}</span><span class="tag">Шаг 1 · диагностика</span></div>
      <h1>Матеша<br>без <em>душноты</em></h1>
      <p>Около 6 минут: цель, 7 задач и пара вопросов о тебе. Методист соберёт программу под твою цель и срок до экзамена — что учить, в каком порядке и сколько баллов это даст.</p>
      <div class="goal" id="obGoal" role="group" aria-label="Какой экзамен">
        <button data-goal="profile" class="${ob.goal === 'profile' ? 'on' : ''}">Профильная</button>
        <button data-goal="base" class="${ob.goal === 'base' ? 'on' : ''}">Базовая</button>
      </div>
      <div class="goal" id="obYear" role="group" aria-label="Когда экзамен">
        <button data-year="0" class="${ob.year === 0 ? 'on' : ''}">Сдаю в ${examYear()}</button>
        <button data-year="1" class="${ob.year === 1 ? 'on' : ''}">В ${examYear(1)}</button>
      </div>
      <button class="cta hero-cta" id="obGo"><b>Начать →</b></button>`;
    heroSay('Не знаешь ответ — жми «Не знаю». Угадывать тут невыгодно.', 'hi');
  }

  function renderHeroDone() {
    const d = mem.diag, m = d.m;
    setTesting(false);
    panel().innerHTML = `
      <div class="tags"><span class="tag">ЕГЭ ${new Date(m.examDate).getFullYear()} · ${d.goal === 'base' ? 'база' : 'профиль'}</span><span class="tag">${m.mode.title}</span><span class="tag">Цель ${targetLabel(m.goal, m.target)}</span></div>
      <h1>${d.program.title}</h1>
      <p>${forecastText(m)}. ${m.mode.key === 'full' ? d.program.text : m.mode.text}</p>
      <button class="cta hero-cta" id="heroToPlan"><b>${today().done ? 'К траектории →' : 'Начать план на сегодня →'}</b></button>`;
    heroSay(PH.diagNote[d.level] || say('hello'), d.level === 'уверенный' ? 'wow' : 'hi');
  }

  function obAbout() {
    if (ob.step === 0) {
      panel().innerHTML = `${obSegments()}
        <div class="tags"><span class="tag">Цель · 1 из ${OB_ABOUT}</span><span class="tag">${ob.goal === 'base' ? 'база' : 'профиль'}</span></div>
        <h2 class="hero-h2">Какая цель на экзамене?</h2>
        <div class="hero-picks two">${MET.CFG.targets[ob.goal].map(t =>
          `<button class="hpick" data-target="${t.v}"><span class="pick-key">${t.label}</span><span>${t.text}</span></button>`).join('')}</div>`;
      return heroSay('От цели зависит, какие номера брать в программу. Поменять можно потом.', 'hi');
    }
    panel().innerHTML = `${obSegments()}
      <div class="tags"><span class="tag">Цель · 2 из ${OB_ABOUT}</span></div>
      <h2 class="hero-h2">Сколько времени в день готов заниматься?</h2>
      <div class="hero-picks">${MINUTES.map(v =>
        `<button class="hpick" data-minutes="${v}"><span class="pick-key">${v} минут</span><span>≈ ${MET.CFG.perDay[v]} задач в день${v === 25 ? ' — оптимально для большинства' : v === 15 ? ' — минимум, чтобы был эффект' : ' — если до экзамена мало времени'}</span></button>`).join('')}</div>`;
    heroSay('Честно: лучше 15 минут каждый день, чем 2 часа раз в неделю.', 'hi');
  }

  function obQuestion() {
    if (ob.asked.length >= DIAG.count) return obStyle();
    const code = diagNext(), sec = TOPICS.find(s => s.code === sectionOf(code));
    ob.q = makeQuestion(code);
    if (!ob.q) { ob.asked.push({ code, ok: false, skip: true }); ob.step++; return obQuestion(); }
    const nums = EXAM.tasksOfTopic(ob.goal, code);
    panel().innerHTML = `${obSegments()}
      <div class="tags"><span class="tag">Задача ${ob.asked.length + 1} из ${DIAG.count}</span><span class="tag">${sec.title}</span>${nums.length ? `<span class="tag">ЕГЭ №${nums.join(', ')}</span>` : ''}</div>
      <div class="hero-q">${ob.q.q}</div>
      <div class="hero-opts">${ob.q.options.map((o, i) =>
        `<button class="hopt" data-i="${i}"><span class="key">${'ABCD'[i]}</span><span>${o}</span></button>`).join('')}</div>
      <button class="hidk" data-i="-1">Не знаю</button>`;
    if (ob.asked.length) heroSay(say('obTips'), 'hi');
  }

  function obAnswer(i) {
    if (!ob.q || ob.locked) return;
    ob.locked = true;
    const q = ob.q, ok = i === q.correct;
    record(q.topic, ok);
    ob.asked.push({ code: q.topic, ok });
    diagUpdate(q.topic, ok);
    ob.step++;
    const btn = panel().querySelector(i < 0 ? '.hidk' : `.hopt[data-i="${i}"]`);
    if (btn) btn.classList.add('picked');
    setTimeout(() => { ob.locked = false; ob.q = null; obQuestion(); }, 260);
  }

  function obStyle() {
    const k = ob.step - OB_ABOUT - DIAG.count;
    if (k >= DIAG.style.length) return obHumor();
    const s = DIAG.style[k], order = shuffle(['strict', 'informal']);
    panel().innerHTML = `${obSegments()}
      <div class="tags"><span class="tag">Про тебя · ${k + 1} из ${DIAG.style.length + 1}</span><span class="tag">${s.topic}</span></div>
      <h2 class="hero-h2">Какое объяснение тебе понятнее?</h2>
      <div class="hero-picks">${order.map((v, i) =>
        `<button class="hpick" data-style="${v}"><span class="pick-key">Вариант ${'АБ'[i]}</span><span>${s[v]}</span></button>`).join('')}</div>`;
    heroSay('Тут нет правильного ответа. Выбирай, как тебе удобнее.', 'hi');
  }

  function obHumor() {
    panel().innerHTML = `${obSegments()}
      <div class="tags"><span class="tag">Про тебя · ${DIAG.style.length + 1} из ${DIAG.style.length + 1}</span></div>
      <h2 class="hero-h2">Икс любит подколоть за ошибку. Тебе так норм?</h2>
      <div class="hero-picks">
        <button class="hpick" data-humor="1"><span class="pick-key">Оставь</span><span>Заходит, с шутками веселее</span></button>
        <button class="hpick" data-humor="0"><span class="pick-key">Без подколов</span><span>Лучше по делу и спокойно</span></button>
      </div>`;
    heroSay(DIAG.humorSample, 'meh');
  }

  function obFinish() {
    diagApply(diagResult());
    renderMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('hero').onclick = e => {
    const goal = e.target.closest('[data-goal]');
    if (goal) {
      ob.goal = goal.dataset.goal;
      $('obGoal').querySelectorAll('button').forEach(b => b.classList.toggle('on', b === goal));
      return;
    }
    const year = e.target.closest('[data-year]');
    if (year) {
      ob.year = +year.dataset.year;
      $('obYear').querySelectorAll('button').forEach(b => b.classList.toggle('on', b === year));
      return;
    }
    if (e.target.closest('#obGo')) return obAbout();
    if (e.target.closest('#heroToPlan')) {
      if (today().done) return $('route').scrollIntoView({ behavior: 'smooth' });
      return startPlan();
    }
    const opt = e.target.closest('.hopt, .hidk');
    if (opt) return obAnswer(+opt.dataset.i);
    const pick = e.target.closest('.hpick');
    if (!pick) return;
    if (pick.dataset.target) { ob.target = +pick.dataset.target; ob.step++; return obAbout(); }
    if (pick.dataset.minutes) { ob.minutes = +pick.dataset.minutes; ob.step++; return obQuestion(); }
    if (pick.dataset.style) { ob.picks.push(pick.dataset.style); ob.step++; return obStyle(); }
    if (pick.dataset.humor) { ob.humor = pick.dataset.humor === '1'; ob.step++; return obFinish(); }
  };

  // ── Тест ──
  function startPlan() {
    state.testNo = 0; state.streak = 0;
    startTest(today().done ? 'extra' : 'plan');
  }

  function startTest(mode = 'free') {
    clearTimers();
    state.mode = mode;
    state.testNo++;
    state.list = mode === 'plan' ? buildPlanTest(todayPlan()) : mode === 'extra' ? buildExtraTest()
      : mode === 'mock' ? buildMock() : buildTest(state.sel, state.count);
    state.marks = state.list.map(() => '');
    state.idx = 0; state.score = 0;
    showScreen('quiz');
    renderQuestion();
  }

  function renderSegments(el, marks, now) {
    el.innerHTML = marks.map((m, i) => `<i class="${m || (i === now ? 'now' : '')}"></i>`).join('');
  }

  function setPeek(pose) {
    const p = $('peek'); p.src = IMG[pose];
    p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
  }

  // ── Шпаргалка по теме ──
  const THEORY = window.THEORY || {};
  function setTheory(code, open) {
    const th = THEORY[code], box = $('theoryBox'), btn = $('theoryBtn');
    btn.hidden = !th;
    if (!th) { box.hidden = true; return; }
    box.innerHTML = `<div class="who">Шпаргалка · ${code} ${TOPIC_BY_CODE[code].title}</div>
      <ul>${th.points.map(p => `<li>${p}</li>`).join('')}</ul>`;
    box.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Скрыть шпаргалку' : 'Шпаргалка по теме';
  }

  // ── Где могла быть ошибка: сравниваем выбранный ответ с верным ──
  function toNum(s) {
    const t = String(s).replace(/<[^>]+>/g, '').replace(/−/g, '-').replace(/\s/g, '').replace(',', '.');
    if (/^-?\d+(\.\d+)?$/.test(t)) return +t;
    const f = t.match(/^(-?\d+)\/(\d+)$/);
    return f ? +f[1] / +f[2] : null;
  }
  function mistakeHint(chosen, right) {
    const u = toNum(chosen), v = toNum(right), eq = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
    if (u === null || v === null) return '';
    if (v !== 0 && eq(u, -v)) return 'По модулю ответ верный, но знак другой — проверь, где потерялся минус.';
    if (v !== 0 && [10, 100, 0.1, 0.01].some(k => eq(u, v * k))) return 'Ответ отличается в 10 или 100 раз — проверь запятую и перевод процентов в дробь.';
    if (v !== 0 && u !== 0 && eq(u, 1 / v)) return 'Получилось обратное число — похоже, дробь перевернулась.';
    if (v !== 0 && (eq(u, 2 * v) || eq(v, 2 * u))) return 'Ответ отличается ровно в 2 раза — проверь множитель ½ или удвоение.';
    if (v !== 0 && (eq(u, v * v) || eq(u * u, v))) return 'Похоже, перепутаны число и его квадрат (или корень).';
    const k = v !== 0 && u !== 0 ? Math.max(u / v, v / u) : 0;
    if (k >= 3 && k <= 9 && eq(k, Math.round(k))) return `Ответ отличается в ${Math.round(k)} раза — проверь показатель степени или лишний (потерянный) множитель.`;
    if (Number.isInteger(u) && Number.isInteger(v) && Math.abs(u - v) <= 2) return 'Ответ совсем рядом — скорее всего, ошибка в арифметике. Пересчитай последний шаг.';
    return '';
  }

  function renderQuestion() {
    const q = state.list[state.idx], t = TOPIC_BY_CODE[q.topic];
    // Первая задача новой темы — сразу со шпаргалкой.
    $('videoBtn').hidden = !(window.VideoPlayer && VideoPlayer.has(q.topic));
    setTheory(q.topic, q.block === 'Новая тема' && (state.idx === 0 || state.list[state.idx - 1].topic !== q.topic));
    state.answered = false;
    renderSegments($('segments'), state.marks, state.idx);
    $('scorePill').textContent = `${state.score} ✓`;
    $('topicLabel').textContent = (q.block ? q.block + ' · ' : '') + (q.exam ? `№${q.exam} ЕГЭ · ` : '') + `${t.code} · ${t.title}`;
    $('qnum').textContent = `${state.idx + 1} / ${state.list.length}`;
    $('question').innerHTML = q.q;
    $('feedback').hidden = true;
    setPeek('hi');
    $('options').innerHTML = q.options.map((o, i) =>
      `<button class="opt" data-i="${i}"><span class="key">${'ABCD'[i]}</span><span>${o}</span></button>`).join('');
  }

  function answer(i) {
    if (state.answered) return;
    state.answered = true;
    const q = state.list[state.idx], ok = i === q.correct;
    if (ok) { state.score++; state.streak = state.streak > 0 ? state.streak + 1 : 1; }
    else state.streak = state.streak < 0 ? state.streak - 1 : -1;
    state.marks[state.idx] = ok ? 'ok' : 'bad';
    record(q.topic, ok);

    document.querySelectorAll('.opt').forEach((b, k) => {
      b.disabled = true;
      if (k === q.correct) b.classList.add('correct');
      else if (k === i) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    renderSegments($('segments'), state.marks, -1);
    $('scorePill').textContent = `${state.score} ✓`;

    const pose = ok ? 'wow' : (state.streak <= -2 ? 'shrug' : 'meh');
    setPeek(pose);
    $('grinAva').src = IMG[pose];
    const pr = prefs(), strict = pr.style === 'strict';
    $('grinSays').textContent = !pr.humor ? say(ok ? 'calmRight' : 'calmWrong')
      : ok ? say(state.streak >= 3 ? 'rightStreak' : 'right') : say(state.streak <= -2 ? 'wrongStreak' : 'wrong');
    $('verdict').innerHTML = strict ? (ok ? 'Верно.' : `Неверно. Правильный ответ: <b>${q.options[q.correct]}</b>.`)
      : ok ? say('maxRight') : `Правильный ответ — <b>${q.options[q.correct]}</b>`;
    $('explain').innerHTML = strict ? (q.e ? 'Решение: ' + q.e : '') : (ok ? '' : say('maxWrong') + ' ') + q.e;
    // При ошибке — подробнее: где могла быть ошибка, типичные ошибки темы и шпаргалка.
    const hint = ok ? '' : mistakeHint(q.options[i], q.options[q.correct]), th = THEORY[q.topic];
    $('hint').hidden = !hint;
    $('hint').innerHTML = hint ? `<b>Где могла быть ошибка.</b> ${hint}` : '';
    $('mistakes').hidden = ok || !th;
    $('mistakes').innerHTML = !ok && th ? `<b>Частые ошибки в теме:</b><ul>${th.mistakes.map(m => `<li>${m}</li>`).join('')}</ul>` : '';
    if (!ok) setTheory(q.topic, true);
    $('feedback').hidden = false;
    $('feedback').classList.remove('paused');
    $('feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // После ошибки не торопим: следующий вопрос — по кнопке «Дальше», когда ученик разобрался.
    state.autoNext = ok;
    if (ok) startTimer(SETTINGS.delayCorrect);
    else { const f = $('timerFill'); f.style.animation = 'none'; f.style.width = '0'; }
  }

  // Таймер автоперехода; пауза, пока курсор над блоком с объяснением.
  function startTimer(ms) {
    state.left = ms; state.startedAt = Date.now();
    const f = $('timerFill');
    f.style.animation = 'none'; void f.offsetWidth;
    f.style.animation = `fill ${ms}ms linear forwards`;
    state.timer = setTimeout(next, ms);
  }
  function pauseTimer() {
    if (!state.timer) return;
    clearTimeout(state.timer); state.timer = null;
    state.left -= Date.now() - state.startedAt;
    $('feedback').classList.add('paused');
  }
  function resumeTimer() {
    if (state.timer || !state.answered || !state.autoNext || $('quiz').hidden) return;
    $('feedback').classList.remove('paused');
    state.startedAt = Date.now();
    state.timer = setTimeout(next, Math.max(state.left, 600));
  }
  function clearTimers() { clearTimeout(state.timer); clearInterval(state.tick); state.timer = state.tick = null; }

  function next() {
    clearTimers();
    if (!state.answered) return;
    state.idx++;
    if (state.idx < state.list.length) { renderQuestion(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else finishTest();
  }

  function finishTest() {
    const n = state.list.length, pct = Math.round(state.score / n * 100);
    // Итоги по темам → когда повторять каждую.
    const res = {};
    state.list.forEach((q, i) => { const r = res[q.topic] || (res[q.topic] = { n: 0, ok: 0 }); r.n++; if (state.marks[i] === 'ok') r.ok++; });
    updateMemory(res, state.mode === 'plan' ? 1 : 2);
    const planned = state.mode === 'plan' || state.mode === 'extra', mock = state.mode === 'mock';
    if (state.mode === 'plan') { today().done = true; savePlan(); }

    $('resultTitle').textContent = state.mode === 'plan' ? 'План на сегодня · готово'
      : state.mode === 'extra' ? 'Бонус · готово' : mock ? 'Пробник первой части · готово' : `Тест ${state.testNo} · готово`;
    $('resultScore').innerHTML = `${state.score}/${n}<small>${pct}% правильных</small>`;
    renderSegments($('resultSegments'), state.marks, -1);
    $('resultGrin').src = IMG[pct >= 80 ? 'wow' : pct >= 50 ? 'hi' : pct >= 20 ? 'meh' : 'shrug'];
    $('resultNote').textContent = state.mode === 'plan' ? say('planDone') : PH.result.find(([min]) => pct >= min)[1];
    $('startNow').innerHTML = `<b>${planned ? `Ещё ${PLAN.extra} задач →` : mock ? 'Ещё пробник →' : 'Следующий тест →'}</b>`;
    showScreen('result');
    if (mock) {
      // Первичный балл за первую часть → тестовый балл (профиль) или отметка (база).
      const goal = goalNow(), value = goal === 'base' ? EXAM.base.grade(state.score) : EXAM.profile.scale(state.score);
      const wrong = state.list.filter((q, i) => state.marks[i] !== 'ok').map(q => q.exam);
      (mem.mocks || (mem.mocks = [])).push({ date: dayKey(), score: state.score, of: n, value, wrong });
      savePlan();
      $('countdown').textContent = (goal === 'base' ? `Это отметка «${value}»` : `Первая часть ≈ ${value} тестовых баллов`) +
        (wrong.length ? ` · разобрать: №${wrong.join(', ')}` : ' · без ошибок!');
      return;
    }
    if (planned) {
      const tomorrow = started().filter(c => isDue(c, addDays(dayKey(), 1))).length;
      $('countdown').textContent = `Серия: ${streakDays()} дн. подряд · завтра на повторение тем: ${tomorrow}`;
      return;
    }
    let left = SETTINGS.delayNextTest;
    const upd = () => { $('countdown').textContent = `Следующий тест через ${left} с`; };
    upd();
    state.tick = setInterval(() => { left--; if (left <= 0) startTest(); else upd(); }, 1000);
  }

  function toMenu() { clearTimers(); state.streak = 0; renderMenu(); showScreen('menu'); }

  // ── События ──
  $('chips').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.view = b.dataset.v;
    state.sel = state.view === 'all' ? 'all' : state.view === 'exam' ? 'e:1' : 's:' + state.view;
    renderChips(); renderTopics();
  };
  $('topics').onclick = e => {
    const v = e.target.closest('[data-video]');
    if (v && window.VideoPlayer) return VideoPlayer.open(v.dataset.video);
    const b = e.target.closest('.topic'); if (!b) return;
    if (b.dataset.act === 'mock') { state.testNo = 0; return startTest('mock'); }
    state.sel = b.dataset.sel; renderTopics();
  };
  $('countSeg').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    state.count = +b.dataset.n;
    $('countSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  };
  $('start').onclick = () => { state.testNo = 0; state.streak = 0; startTest(); };
  $('options').onclick = e => { const b = e.target.closest('.opt'); if (b) answer(+b.dataset.i); };
  $('next').onclick = next;
  $('videoBtn').onclick = () => window.VideoPlayer && VideoPlayer.open(state.list[state.idx].topic);
  $('theoryBtn').onclick = () => setTheory(state.list[state.idx].topic, $('theoryBox').hidden);
  $('feedback').onmouseenter = pauseTimer;
  $('feedback').onmouseleave = resumeTimer;
  const resultPrimary = () => startTest(state.mode === 'free' || state.mode === 'mock' ? state.mode : 'extra');
  $('startNow').onclick = resultPrimary;
  $('planStart').onclick = startPlan;
  $('prefs').onclick = e => {
    const b = e.target.closest('[data-pref]'); if (!b) return;
    const pr = prefs(), m = M(), k = b.dataset.pref;
    // Цель и время в день — методист сразу пересобирает программу.
    if (k === 'target' || k === 'minutes') {
      const list = k === 'target' ? MET.CFG.targets[m.goal].map(t => t.v) : MINUTES;
      const nextV = list[(list.indexOf(m[k]) + 1) % list.length];
      rebuildProgram({ [k]: nextV });
      return renderMenu();
    }
    if (k === 'style') pr.style = pr.style === 'strict' ? 'informal' : 'strict';
    else pr.humor = !pr.humor;
    mem.prefs = pr; savePlan(); renderPrefs();
  };
  $('pace').onclick = e => {
    const b = e.target.closest('[data-min]'); if (!b || +b.dataset.min === M().minutes) return;
    rebuildProgram({ minutes: +b.dataset.min });
    renderMenu();
  };
  $('route').onclick = e => {
    if (e.target.closest('#mockBtn')) { state.testNo = 0; return startTest('mock'); }
    if (e.target.closest('#routeMore')) { $('routeSteps').classList.add('all'); return e.target.closest('#routeMore').remove(); }
    if (!e.target.closest('#redoDiag')) return;
    renderHeroIntro(); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  $('quitQuiz').onclick = toMenu;
  $('quitResult').onclick = toMenu;
  // Сброс — в два нажатия на самой кнопке (системные окна confirm() в веб-версии по ссылке не показываются).
  let resetArmed = null;
  $('resetStats').onclick = () => {
    const b = $('resetStats');
    if (!resetArmed) {
      b.textContent = 'Точно сбросить всё? Нажми ещё раз';
      resetArmed = setTimeout(() => { resetArmed = null; b.textContent = 'Сбросить статистику'; }, 4000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null; b.textContent = 'Сбросить статистику';
    stats = {}; saveStats(stats); resetMem(); savePlan(); renderMenu();
  };
  document.addEventListener('keydown', e => {
    if (document.body.classList.contains('vopen')) return; // открыт видеоурок — клавиши у плеера
    if (!$('menu').hidden && ob.q && e.key >= '1' && e.key <= '4') return obAnswer(+e.key - 1);
    if (!$('quiz').hidden) {
      if (!state.answered && e.key >= '1' && e.key <= '4') answer(+e.key - 1);
      else if (!state.answered && /^[abcdABCD]$/.test(e.key)) answer('abcd'.indexOf(e.key.toLowerCase()));
      else if (state.answered && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); }
    } else if (!$('result').hidden && e.key === 'Enter') resultPrimary();
  });

  // 3D-параллакс: персонажи поворачиваются за курсором, Икс (ближе) — сильнее Макса.
  const hero = document.querySelector('.hero');
  const actors = [...document.querySelectorAll('#heroCast .actor')];
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    actors.forEach(a => {
      const d = +a.dataset.depth;
      a.style.transform = `translate3d(${x * 18 * d}px, ${y * 10 * d}px, 0) rotateY(${x * 16 * d}deg) rotateX(${-y * 8 * d}deg)`;
    });
  });
  hero.addEventListener('pointerleave', () => actors.forEach(a => { a.style.transform = ''; }));

  // Телефон: нижняя панель «Погнали» появляется, только когда долистал до выбора тем,
  // иначе она закрывает план и траекторию.
  if ('IntersectionObserver' in window) {
    const dockIo = new IntersectionObserver(es => {
      document.body.classList.toggle('dock-on', es.some(e => e.isIntersecting || e.boundingClientRect.top < 0));
    });
    ['chips', 'topics'].forEach(id => dockIo.observe($(id)));
  } else document.body.classList.add('dock-on');

  // Автообновление: на своём хостинге сайт кладёт рядом version.json (его пишет сайт.rb при каждой сборке).
  // Если версия на сервере сменилась — тихо перезагружаем страницу, но не посреди теста: прогресс в localStorage сохраняется.
  if (/^https?:$/.test(location.protocol)) {
    let build = null, pending = false;
    const reloadIfIdle = () => { if (pending && $('quiz').hidden) location.reload(); };
    const checkUpdate = () => fetch('version.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
      if (!j || !j.v) return;
      if (build === null) build = j.v;
      else if (j.v !== build) { pending = true; reloadIfIdle(); }
    }).catch(() => {});
    checkUpdate();
    setInterval(checkUpdate, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
    window.addEventListener('ultra:menu', reloadIfIdle);
  }

  // Установка на экран телефона и работа без сети — только на своём хостинге (https), не внутри чужой страницы.
  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  renderMenu();
  showScreen('menu');

  // Для проверки из консоли: QuizDebug.check(200) прогоняет все темы.
  // Связь с видеоуроками (app/video.js)
  window.US = {
    startTopic(code, n) { const keep = state.count; state.sel = code; state.count = n; state.testNo = 0; state.streak = 0; startTest(); state.count = keep; },
    pause: pauseTimer, resume: resumeTimer,
    refresh() { if (!$('menu').hidden) renderTopics(); },
  };

  window.QuizDebug = {
    makeQuestion, makeExamQuestion, todayPlan, buildPlanTest, mem: () => mem,
    // Программа методиста для любых вводных: QuizDebug.metodist({ goal: 'base', target: 4, minutes: 15, examDate: '2027-06-01' })
    metodist: o => MET.build({ p: (mem.diag && mem.diag.p) || {}, ...o }),
    // Проверка задач в формате номеров: { 'p13': ошибок, … }
    checkExam(times = 100) {
      const bad = {};
      ['profile', 'base'].forEach(goal => examTasks(goal).forEach(t => {
        for (let i = 0; i < times; i++) {
          const q = makeExamQuestion(t.n, goal), k = (goal === 'base' ? 'b' : 'p') + t.n;
          if (!q || q.options.length !== 4 || new Set(q.options).size !== 4 || /NaN|undefined|Infinity/.test(q.q + q.options.join('|')))
            bad[k] = (bad[k] || 0) + 1;
        }
      }));
      return bad;
    },
    // Сдвинуть «сегодня» назад на n дней — проверить интервалы без ожидания.
    timeTravel(n) {
      const shift = k => addDays(k, -n), days = {};
      Object.entries(mem.days).forEach(([k, v]) => { days[shift(k)] = v; });
      mem.days = days;
      Object.values(mem.topics).forEach(t => { t.due = shift(t.due); if (t.up) t.up = shift(t.up); });
      savePlan(); renderMenu();
    },
    check(times = 100) {
      const bad = {};
      Object.keys(TOPIC_BY_CODE).forEach(code => {
        for (let i = 0; i < times; i++) {
          const q = makeQuestion(code);
          if (!q || q.options.length !== 4 || new Set(q.options).size !== 4 || /NaN|undefined|Infinity/.test(q.q + q.options.join('|')))
            bad[code] = (bad[code] || 0) + 1;
        }
      });
      return bad;
    },
  };
})();
