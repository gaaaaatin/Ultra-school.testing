// Встроенный методист: по диагностике, цели, сроку и времени в день собирает индивидуальную программу.
// 1) Режим по сроку до экзамена: полный курс / интенсив / спринт / финиш.
// 2) Бюджет задач = недели учёбы × задач в день. Тема с нуля ≈ 35 задач, «подтянуть» ≈ 18.
// 3) Номера экзамена отбираются по «цене балла»: сколько баллов прибавит номер ÷ сколько задач на него нужно.
// 4) Отобранные темы — в учебном порядке (в спринте — сначала самые выгодные), остальное честно «отложено».
// 5) Прогноз: сколько баллов сейчас и к экзамену, если идти по программе.
(function () {
  const TOPICS = window.TOPICS, DIAG = window.DIAGNOSTIC, EXAM = window.EXAM;
  const BY = {};
  TOPICS.forEach(s => s.items.forEach(t => { BY[t.code] = t; }));
  const sectionOf = c => c.split('.')[0];

  const CFG = {
    perDay: { 15: 10, 25: 15, 40: 25 },        // минут в день → задач в дневном плане
    activeDays: 6 / 7,                          // учимся 6 дней из 7
    learnShare: 0.65,                           // доля задач на новые темы; остальное — повторение и вперемешку
    cost: p => p < 0.5 ? 35 : p < 0.8 ? 18 : 0, // задач, чтобы довести тему до «освоена»
    extra: { 'П': 60, 'В': 120 },               // доплата за задачи второй части (оформление, разбор решений)
    solved: { 'Б': 0.85, 'П1': 0.8, 'П2': 0.5, 'В': 0.3 }, // доля баллов номера после проработки
    modes: [ // от длинного срока к короткому
      { key: 'full', min: 26, title: 'Полный курс', exam: 4, review: 2, intervals: [1, 3, 7, 14, 30],
        text: 'Времени достаточно: идём по всем нужным темам от основ к сложному, в конце — повторение и пробники.' },
      { key: 'intensive', min: 12, title: 'Интенсив', exam: 3, review: 1, intervals: [1, 3, 6, 12, 20],
        text: 'Времени меньше полугода: берём номера, которые дают больше баллов за меньшее время, повторяем чаще.' },
      { key: 'sprint', min: 4, title: 'Спринт', exam: 2, review: 1, intervals: [1, 2, 4, 7, 10],
        text: 'До экзамена пара месяцев: только самые выгодные номера, сначала те, что принесут баллы быстрее всего.' },
      { key: 'finish', min: 0, title: 'Финиш', exam: 99, review: 0, intervals: [1, 2, 3, 5, 7],
        text: 'Меньше месяца: новых тем не берём, решаем варианты и закрываем ошибки в том, что уже знаешь.' },
    ],
    targets: {
      profile: [{ v: 50, label: '50+', text: 'Сдать уверенно' }, { v: 70, label: '70+', text: 'Хороший вуз' },
        { v: 80, label: '80+', text: 'Сильный вуз' }, { v: 90, label: '90+', text: 'Максимум' }],
      base: [{ v: 3, label: '«3»', text: 'Сдать без нервов' }, { v: 4, label: '«4»', text: 'Твёрдая четвёрка' },
        { v: 5, label: '«5»', text: 'На отлично' }],
    },
  };

  const examOf = goal => EXAM[goal === 'base' ? 'base' : 'profile'];
  const allowed = (t, goal, target) => goal === 'base' || !t.minTarget || target >= t.minTarget;
  const pSolve = (t, p) => t.topics.reduce((s, c) => s + (p[c] ?? 0.5), 0) / t.topics.length;
  // Сколько первичных баллов нужно на цель
  function needPrimary(goal, target) {
    if (goal === 'base') return { 3: 7, 4: 12, 5: 17 }[target] || 12;
    const ex = examOf(goal);
    for (let i = 0; i <= ex.maxPrimary; i++) if (ex.scale(i) >= target) return i;
    return ex.maxPrimary;
  }
  // Доля баллов номера сейчас: вторая часть без отдельной проработки решается намного хуже, чем знание тем.
  const nowShare = (t, p) => { const x = pSolve(t, p); return t.part === 1 ? x : t.lvl === 'В' ? x * x * x * 0.3 : x * x * 0.5; };
  const solvedKey = t => t.part === 1 ? (t.lvl === 'Б' ? 'Б' : 'П1') : t.lvl === 'В' ? 'В' : 'П2';
  // Ожидаемый первичный балл
  const expected = (tasks, p, done = {}) => tasks.reduce((s, t) => s + t.pts * Math.max(nowShare(t, p), done[t.n] || 0), 0);
  const show = (goal, primary) => goal === 'base'
    ? { value: examOf(goal).grade(primary), unit: 'отметка', primary: Math.round(primary) }
    : { value: examOf(goal).scale(primary), unit: 'баллов', primary: Math.round(primary) };

  function build({ goal = 'profile', target, minutes = 25, examDate = DIAG.examDate, p = {}, now = new Date() }) {
    const ex = examOf(goal), tasks = ex.tasks;
    if (target == null) target = goal === 'base' ? 4 : 70;
    const perDay = CFG.perDay[minutes] || 15;
    const daysLeft = Math.max(1, Math.round((new Date(examDate) - now) / 864e5));
    const weeksLeft = Math.max(1, Math.round(daysLeft / 7));
    const mode = CFG.modes.find(m => weeksLeft >= m.min);
    const examWeeks = Math.min(weeksLeft, mode.exam), reviewWeeks = Math.min(mode.review, weeksLeft - examWeeks);
    const learnWeeks = Math.max(0, weeksLeft - examWeeks - reviewWeeks);
    const budget = Math.round(learnWeeks * 7 * CFG.activeDays * perDay * CFG.learnShare);
    const pc = c => p[c] ?? 0.5;
    const prereqs = c => (DIAG.links[c] || []).filter(x => pc(x) < 0.5);

    // Жадный отбор номеров по цене балла
    const chosen = new Set(), picked = [], info = {};
    const topicsFor = t => {
      const out = new Set();
      const walk = c => { if (out.has(c) || chosen.has(c)) return; if (pc(c) >= 0.8) return; out.add(c); prereqs(c).forEach(walk); };
      t.topics.forEach(walk);
      return [...out];
    };
    tasks.forEach(t => {
      const ps = pSolve(t, p), goalP = CFG.solved[solvedKey(t)];
      info[t.n] = { n: t.n, pts: t.pts, part: t.part, lvl: t.lvl, title: t.title, now: ps, gain: t.pts * Math.max(0, goalP - nowShare(t, p)),
        status: !allowed(t, goal, target) ? 'skip' : ps >= 0.8 ? 'keep' : 'open' };
    });
    let spent = 0;
    for (;;) {
      let best = null, bestR = 0, bestCost = 0, bestTopics = null;
      tasks.forEach(t => {
        const it = info[t.n];
        if (it.status !== 'open' || it.gain < 0.05) return;
        const ts = topicsFor(t), cost = ts.reduce((s, c) => s + CFG.cost(pc(c)), 0) + (t.part === 2 ? CFG.extra[t.lvl] : 0);
        if (spent + cost > budget) return;
        // Вторая часть рискованнее: баллы там нестабильны, поэтому при равной выгоде сначала — первая часть.
        const r = it.gain / Math.max(cost, 5) * (t.part === 2 ? 0.5 : 1);
        if (r > bestR) { bestR = r; best = t; bestCost = cost; bestTopics = ts; }
      });
      if (!best) break;
      spent += bestCost;
      info[best.n].status = 'pick'; info[best.n].order = picked.length; info[best.n].cost = bestCost;
      bestTopics.forEach(c => { chosen.add(c); });
      info[best.n].topics = bestTopics;
      picked.push(best.n);
    }
    tasks.forEach(t => { if (info[t.n].status === 'open') info[t.n].status = info[t.n].gain < 0.05 ? 'keep' : 'later'; });

    // Порядок тем: в спринте — по выгоде номера, иначе — учебный (разделы, потом глубина темы)
    const depthMemo = {};
    const depth = c => depthMemo[c] ?? (depthMemo[c] = (DIAG.links[c] || []).reduce((m, x) => Math.max(m, depth(x) + 1), 0));
    const pickOrder = c => Math.min(...picked.filter(n => (info[n].topics || []).includes(c)).map(n => info[n].order), 99);
    const secRank = c => DIAG.sectionOrder.indexOf(sectionOf(c));
    const order = [...chosen].sort((a, b) => mode.key === 'sprint'
      ? pickOrder(a) - pickOrder(b) || depth(a) - depth(b)
      : secRank(a) - secRank(b) || depth(a) - depth(b) || pc(a) - pc(b));

    // Шаги траектории: подряд идущие темы одного раздела (в спринте — одного номера), не больше 5 в шаге
    const steps = [], key = c => mode.key === 'sprint' ? 'n' + pickOrder(c) : sectionOf(c);
    order.forEach(c => {
      const last = steps[steps.length - 1];
      if (last && last.key === key(c) && last.codes.length < 5) last.codes.push(c);
      else steps.push({ kind: 'learn', key: key(c), codes: [c] });
    });
    const totalCost = order.reduce((s, c) => s + CFG.cost(pc(c)), 0) || 1;
    let week = 1;
    const parts = {}, secCount = {};
    steps.forEach(st => { const k = sectionOf(st.codes[0]); secCount[k] = (secCount[k] || 0) + 1; });
    steps.forEach(st => {
      const nums = picked.filter(n => st.codes.some(c => (info[n].topics || []).includes(c))).sort((a, b) => a - b);
      const k = sectionOf(st.codes[0]); parts[k] = (parts[k] || 0) + 1;
      st.tasks = nums;
      st.title = TOPICS.find(s => s.code === k).title + (secCount[k] > 1 ? ` · часть ${parts[k]}` : '') + (nums.length ? ` · №${nums.join(', ')}` : '');
      st.weeks = Math.max(1, Math.round(st.codes.reduce((s, c) => s + CFG.cost(pc(c)), 0) / totalCost * learnWeeks));
      st.from = week; week += st.weeks; st.to = week - 1;
      delete st.key;
    });
    const keep = tasks.filter(t => info[t.n].status === 'keep').map(t => t.n);
    if (reviewWeeks) {
      steps.push({ kind: 'review', title: 'Повторение и задачи вперемешку', codes: [],
        note: keep.length ? `Держим в тонусе №${keep.join(', ')}` : 'Закрепляем всё пройденное', from: week, to: week + reviewWeeks - 1 });
      week += reviewWeeks;
    }
    const part1 = goal === 'base' ? '' : ' первой части';
    steps.push({ kind: 'exam', title: 'Пробники и работа над ошибками', codes: [],
      note: `Вариант${part1} с таймером раз в неделю, разбор самых дорогих ошибок`, from: Math.min(week, weeksLeft), to: weeksLeft });

    // Прогноз
    const done = {};
    picked.forEach(n => { done[n] = CFG.solved[solvedKey(info[n])]; });
    keep.forEach(n => { done[n] = Math.max(0.85, info[n].now); });
    const nowP = expected(tasks, p), afterP = expected(tasks, p, done), need = needPrimary(goal, target);
    const forecast = { now: show(goal, nowP), after: show(goal, afterP), need, reach: Math.round(afterP) >= need };
    const later = tasks.filter(t => info[t.n].status === 'later').map(t => t.n);
    const notes = [];
    if (later.length && mode.key !== 'finish') notes.push(`Отложили №${later.join(', ')}: в этот срок они дают меньше баллов за потраченное время.`);
    if (!forecast.reach) {
      const more = Object.keys(CFG.perDay).map(Number).find(m => m > minutes);
      notes.push(more ? `До цели не хватает времени. С ${more} минутами в день программа станет шире.` : 'Цель амбициозная для этого срока — держим максимум, что успеваем, и повышаем, если пойдёт быстрее.');
    }
    if (mode.key === 'finish') notes.push('Новые темы не начинаем: каждый день — задания в формате ЕГЭ и разбор ошибок.');

    return {
      v: 1, goal, target, minutes, perDay, examDate, daysLeft, weeksLeft, learnWeeks,
      mode: { key: mode.key, title: mode.title, text: mode.text }, intervals: mode.intervals,
      budget, spent, picked, keep, later, tasks: tasks.map(t => info[t.n]), topics: order,
      steps, forecast, notes, pace: learnWeeks ? Math.max(1, Math.round(order.length / learnWeeks)) : 0,
    };
  }

  window.METODIST = { build, CFG, needPrimary, allowed, relevant(goal, target, code) {
    return examOf(goal).tasks.some(t => allowed(t, goal, target) && t.topics.includes(code));
  } };
})();
