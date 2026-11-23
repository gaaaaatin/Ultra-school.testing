// Генераторы вопросов: на каждый вызов — новая задача со случайными числами.
// Каждая функция возвращает { q, a, w, e }:
//   q — текст вопроса (можно HTML: <sup>, <sub>), a — правильный ответ,
//   w — неправильные варианты (лишние/совпавшие отбрасываются), e — пояснение.
(function () {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const nz = (a, b) => { let x; do { x = R(a, b); } while (x === 0); return x; };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = R(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // Число по-русски: запятая вместо точки, длинный минус.
  const num = n => String(Math.round(n * 1e6) / 1e6).replace('.', ',').replace('-', '−');
  const frac = (p, q) => {
    if (q < 0) { p = -p; q = -q; }
    const g = gcd(p, q) || 1; p /= g; q /= g;
    return q === 1 ? num(p) : (p < 0 ? '−' : '') + Math.abs(p) + '/' + q;
  };
  // p·π/q
  const piFrac = (p, q = 1) => {
    if (p === 0) return '0';
    const s = p < 0 ? '−' : ''; p = Math.abs(p);
    const g = gcd(p, q); p /= g; q /= g;
    return s + (p === 1 ? '' : p) + 'π' + (q === 1 ? '' : '/' + q);
  };
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', SUB = '₀₁₂₃₄₅₆₇₈₉';
  const sup = n => String(n).split('').map(c => c === '-' ? '⁻' : SUP[+c]).join('');
  const sub = n => String(n).split('').map(c => SUB[+c]).join('');
  // Многочлен по коэффициентам от старшей степени: [2, −3, 1] → 2x² − 3x + 1
  const poly = (cs, v = 'x') => {
    const n = cs.length - 1; let s = '';
    cs.forEach((c, i) => {
      if (c === 0) return;
      const p = n - i, a = Math.abs(c);
      const t = (a === 1 && p > 0 ? '' : num(a)) + (p > 0 ? v + (p > 1 ? sup(p) : '') : '');
      s += s === '' ? (c < 0 ? '−' : '') + t : (c < 0 ? ' − ' : ' + ') + t;
    });
    return s || '0';
  };
  const lin = (v, c) => c === 0 ? v : v + (c < 0 ? ' − ' : ' + ') + Math.abs(c); // x − 3
  const lin2 = (a, b) => { // ax + by
    let s = (a === 1 ? '' : a === -1 ? '−' : num(a)) + 'x';
    s += (b < 0 ? ' − ' : ' + ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'y';
    return s;
  };
  const cplx = (re, im) => {
    if (im === 0) return num(re);
    const imS = (Math.abs(im) === 1 ? '' : Math.abs(im)) + 'i';
    if (re === 0) return (im < 0 ? '−' : '') + imS;
    return num(re) + (im < 0 ? ' − ' : ' + ') + imS;
  };
  const iv = (a, b, l = '(', r = ')') => `${l}${typeof a === 'number' ? num(a) : a}; ${typeof b === 'number' ? num(b) : b}${r}`;
  const sys = (l1, l2) => `<span class="sys"><span>${l1}</span><span>${l2}</span></span>`;
  const mx = rows => `<table class="mx">${rows.map(r => `<tr>${r.map(c => `<td>${typeof c === 'number' ? num(c) : c}</td>`).join('')}</tr>`).join('')}</table>`;
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
  const fact = n => n <= 1 ? 1 : n * fact(n - 1);
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29]];

  // Таблица значений тригонометрических функций: [угол, sin, cos, tg]
  const TRIG = [
    ['0', '0', '1', '0'], ['π/6', '1/2', '√3/2', '√3/3'], ['π/4', '√2/2', '√2/2', '1'],
    ['π/3', '√3/2', '1/2', '√3'], ['π/2', '1', '0', null], ['2π/3', '√3/2', '−1/2', '−√3'],
    ['3π/4', '√2/2', '−√2/2', '−1'], ['5π/6', '1/2', '−√3/2', '−√3/3'], ['π', '0', '−1', '0'],
  ];
  const TVALS = ['0', '1', '−1', '1/2', '−1/2', '√2/2', '−√2/2', '√3/2', '−√3/2', '√3', '−√3', '√3/3', '−√3/3'];
  const ARC = [
    ['arcsin', '1/2', 'π/6'], ['arcsin', '√2/2', 'π/4'], ['arcsin', '√3/2', 'π/3'], ['arcsin', '1', 'π/2'],
    ['arcsin', '−1/2', '−π/6'], ['arcsin', '0', '0'], ['arccos', '1/2', 'π/3'], ['arccos', '0', 'π/2'],
    ['arccos', '−1/2', '2π/3'], ['arccos', '√2/2', 'π/4'], ['arccos', '−√2/2', '3π/4'], ['arccos', '1', '0'],
    ['arccos', '−1', 'π'], ['arctg', '1', 'π/4'], ['arctg', '√3', 'π/3'], ['arctg', '−1', '−π/4'],
    ['arctg', '√3/3', 'π/6'], ['arctg', '0', '0'],
  ];
  const ANGLES = ['0', 'π/6', 'π/4', 'π/3', 'π/2', '2π/3', '3π/4', '5π/6', 'π', '−π/6', '−π/4', '−π/3'];
  const othersFrom = (pool, ans) => shuffle(pool.filter(x => x !== ans)).slice(0, 3);

  const G = {};

  // ───── 1. Числа и вычисления ─────
  G['1.1'] = [
    () => {
      const g = R(2, 12); let x, y;
      do { x = R(2, 9); y = R(2, 9); } while (x === y || gcd(x, y) !== 1);
      return { q: `Найдите наибольший общий делитель чисел ${g * x} и ${g * y}.`, a: g,
        w: [g * x * y, g * Math.min(x, y), 2 * g, g + 1],
        e: `${g * x} = ${g}·${x}, ${g * y} = ${g}·${y}; ${x} и ${y} взаимно просты, значит НОД = ${g}.` };
    },
    () => {
      const g = R(2, 8); let x, y;
      do { x = R(2, 7); y = R(2, 7); } while (x === y || gcd(x, y) !== 1);
      const a = g * x, b = g * y;
      return { q: `Найдите наименьшее общее кратное чисел ${a} и ${b}.`, a: g * x * y,
        w: [a * b, g, g * x * y * 2],
        e: `НОК = a·b / НОД = ${a}·${b} / ${g} = ${g * x * y}.` };
    },
    () => {
      const n = R(100, 999), m = R(4, 13), r = n % m;
      return { q: `Найдите остаток от деления ${n} на ${m}.`, a: r,
        w: [(r + 1) % m, (r + m - 1) % m, (r + 2) % m],
        e: `${n} = ${m}·${Math.floor(n / m)} + ${r}.` };
    },
    () => {
      const d = pick([3, 9]);
      const ans = d * R(Math.ceil(100 / d), Math.floor(999 / d));
      const w = [];
      while (w.length < 3) { const x = R(100, 999); if (x % d !== 0 && !w.includes(x)) w.push(x); }
      const ds = String(ans).split('').reduce((s, c) => s + +c, 0);
      return { q: `Какое из чисел делится на ${d}?`, a: ans, w,
        e: `Признак делимости на ${d}: сумма цифр делится на ${d}. У числа ${ans} сумма цифр ${ds}.` };
    },
  ];

  G['1.2'] = [
    () => {
      const p = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), N = 20 * R(2, 50), ans = N * p / 100;
      return { q: `Найдите ${p}% от числа ${N}.`, a: ans, w: [N * p / 10, N - ans, ans + p],
        e: `${N} · ${p}/100 = ${num(ans)}.` };
    },
    () => {
      const b = R(2, 9), d = R(2, 9); const a = R(1, b - 1 || 1), c = R(1, d - 1 || 1);
      if (b === d) return null;
      return { q: `Вычислите ${a}/${b} + ${c}/${d}.`, a: frac(a * d + c * b, b * d),
        w: [frac(a + c, b + d), frac(a * c, b * d), frac(a + c, b * d)],
        e: `Общий знаменатель ${b * d}: (${a * d} + ${c * b})/${b * d} = ${frac(a * d + c * b, b * d)}.` };
    },
    () => {
      const N = 100 * R(5, 90), p = pick([5, 10, 15, 20, 25, 30, 40]), ans = N * (100 + p) / 100;
      return { q: `Товар стоил ${N} руб. и подорожал на ${p}%. Сколько рублей стоит товар теперь?`, a: ans,
        w: [N + p, N * (100 - p) / 100, N * p / 100],
        e: `${N} · ${num(1 + p / 100)} = ${num(ans)}.` };
    },
  ];

  G['1.3'] = [
    () => {
      const m = pick([2, 3, 5, 6, 7]), k = R(2, 6);
      return { q: `Вычислите √${m * k * k} · √${m}.`, a: m * k, w: [m * k * k, k * k, m + k],
        e: `√(${m * k * k}·${m}) = √${m * m * k * k} = ${m * k}.` };
    },
    () => {
      const b = pick([2, 3, 5, 6, 7, 10]), k = R(2, 9);
      return { q: `Вычислите √${b * k * k} / √${b}.`, a: k, w: [k * k, b * k, k + 1],
        e: `√(${b * k * k} / ${b}) = √${k * k} = ${k}.` };
    },
    () => {
      const k = R(2, 9), n = k ** 3;
      return { q: `Вычислите ∛${n}.`, a: k, w: [k * k, k + 1, Math.round(n / 3)],
        e: `${k}³ = ${n}.` };
    },
    () => {
      let a, b; do { a = R(2, 30); b = R(2, 30); } while (a === b || Number.isInteger(Math.sqrt(a)) || Number.isInteger(Math.sqrt(b)));
      return { q: `Вычислите (√${a} − √${b})(√${a} + √${b}).`, a: a - b, w: [a + b, b - a, (a - b) ** 2],
        e: `Разность квадратов: (√${a})² − (√${b})² = ${a} − ${b} = ${num(a - b)}.` };
    },
  ];

  G['1.4'] = [
    () => {
      const p = pick([2, 3, 5]), e = R(-2, p === 2 ? 4 : 2), m = R(3, 9), n = R(-4, 4), k = m + n - e;
      const val = e >= 0 ? num(p ** e) : '1/' + p ** -e;
      const f = x => x >= 0 ? num(p ** x) : '1/' + p ** -x;
      return { q: `Найдите значение выражения ${p}<sup>${num(m)}</sup> · ${p}<sup>${num(n)}</sup> : ${p}<sup>${num(k)}</sup>.`,
        a: val, w: [f(e + 1), f(-e), f(e - 1), '−' + val],
        e: `Показатели: ${m} + (${num(n)}) − (${num(k)}) = ${num(e)}, значит ${p}<sup>${num(e)}</sup> = ${val}.` };
    },
    () => {
      const k = pick([2, 3]), den = pick([2, 3, 4]); const num_ = R(1, den + 1);
      if (gcd(num_, den) !== 1 || k ** den > 81) return null;
      const b = k ** den, ans = k ** num_;
      return { q: `Вычислите ${b}<sup>${num_}/${den}</sup>.`, a: ans, w: [b * num_ / den, k ** (num_ + 1), b ** 2 / den],
        e: `${b} = ${k}<sup>${den}</sup>, значит ${b}<sup>${num_}/${den}</sup> = ${k}<sup>${num_}</sup> = ${ans}.` };
    },
    () => {
      const a = pick([2, 3, 5, 10]), n = R(1, 3);
      return { q: `Вычислите ${a}<sup>−${n}</sup>.`, a: frac(1, a ** n), w: [num(-(a ** n)), num(-a * n), frac(1, a * n)],
        e: `a<sup>−n</sup> = 1/a<sup>n</sup> = 1/${a ** n}.` };
    },
  ];

  G['1.5'] = [
    () => {
      const row = pick(TRIG); let f = R(1, 3); if (row[f] === null) f = 1;
      const name = ['sin', 'cos', 'tg'][f - 1];
      return { q: `Найдите значение ${name}(${row[0]}).`, a: row[f], w: othersFrom(TVALS, row[f]),
        e: `По таблице значений: ${name}(${row[0]}) = ${row[f]}.` };
    },
    () => {
      const [fn, x, ans] = pick(ARC);
      return { q: `Найдите значение ${fn}(${x}).`, a: ans, w: othersFrom(ANGLES, ans),
        e: `${fn}(${x}) = ${ans}, так как это угол из области значений ${fn}, для которого функция равна ${x}.` };
    },
    () => {
      const [a, b, c] = pick(TRIPLES.slice(0, 4));
      if (Math.random() < 0.5)
        return { q: `Известно, что sin α = ${a}/${c} и α ∈ (π/2; π). Найдите cos α.`, a: `−${b}/${c}`,
          w: [`${b}/${c}`, `−${a}/${c}`, `${a}/${b}`],
          e: `cos²α = 1 − ${a * a}/${c * c} = ${b * b}/${c * c}; во II четверти cos α < 0, значит −${b}/${c}.` };
      return { q: `Известно, что cos α = ${b}/${c} и α ∈ (3π/2; 2π). Найдите sin α.`, a: `−${a}/${c}`,
        w: [`${a}/${c}`, `−${b}/${c}`, `${b}/${a}`],
        e: `sin²α = 1 − ${b * b}/${c * c} = ${a * a}/${c * c}; в IV четверти sin α < 0, значит −${a}/${c}.` };
    },
  ];

  G['1.6'] = [
    () => {
      if (Math.random() < 0.25) {
        const k = R(-3, 6);
        return { q: `Вычислите ln e<sup>${num(k)}</sup>.`, a: k, w: [-k, k + 1, k * 2], e: `ln e<sup>k</sup> = k.` };
      }
      const a = pick([2, 3, 5]), k = R(-2, a === 2 ? 6 : a === 3 ? 4 : 3);
      const x = k >= 0 ? String(a ** k) : '(1/' + a ** -k + ')';
      return { q: `Вычислите log${sub(a)} ${x}.`, a: k, w: [-k, k + 1, k - 1],
        e: `${a}<sup>${num(k)}</sup> = ${x.replace(/[()]/g, '')}, значит log${sub(a)} ${x} = ${num(k)}.` };
    },
    () => {
      const b = pick([2, 3, 6, 10]), k = b < 6 ? 3 : pick([2, 3]), N = b ** k;
      const divs = []; for (let d = 2; d < N; d++) if (N % d === 0 && d * d !== N) divs.push(d);
      const x = pick(divs), y = N / x;
      const L = b === 10 ? 'lg ' : `log${sub(b)} `;
      return { q: `Вычислите ${L}${x} + ${L}${y}.`, a: k, w: [k + 1, k - 1, 2 * k],
        e: `Сумма логарифмов = логарифм произведения: ${L}${N} = ${k}.` };
    },
    () => {
      const a = pick([2, 3, 5, 7]); let m; do { m = R(2, 15); } while (m === a);
      return { q: `Вычислите ${a}<sup>log<sub>${a}</sub> ${m}</sup>.`, a: m, w: [a, a * m, m + a],
        e: `Основное логарифмическое тождество: a<sup>log<sub>a</sub> b</sup> = b.` };
    },
    () => {
      const a = pick([2, 3, 5]), n = pick([1, 2, 3]), c = R(2, 7), b = c * a ** n;
      return { q: `Вычислите log${sub(a)} ${b} − log${sub(a)} ${c}.`, a: n, w: [n + 1, b - c, 2 * n],
        e: `Разность логарифмов = логарифм частного: log${sub(a)} ${b / c} = ${n}.` };
    },
  ];

  G['1.7'] = [
    () => {
      let n; do { n = R(2, 200); } while (Number.isInteger(Math.sqrt(n)));
      const k = Math.floor(Math.sqrt(n));
      return { q: `Между какими соседними целыми числами находится √${n}?`, a: `${k} и ${k + 1}`,
        w: [`${k + 1} и ${k + 2}`, `${k - 1} и ${k}`, `${k + 2} и ${k + 3}`],
        e: `${k}² = ${k * k} < ${n} < ${(k + 1) ** 2} = ${k + 1}².` };
    },
    () => {
      const n = R(1001, 99999), q = Math.floor(n / 100), r = n % 100, t = r >= 50 ? q + 1 : q;
      const s = v => (v / 10).toFixed(1).replace('.', ',');
      return { q: `Округлите число ${(n / 1000).toFixed(3).replace('.', ',')} до десятых.`, a: s(t),
        w: [s(r >= 50 ? q : q + 1), s(t + 1), s(t - 1)],
        e: `Смотрим на цифру сотых: ${Math.floor(r / 10)} ${r >= 50 ? '≥ 5 — округляем вверх' : '< 5 — отбрасываем'}.` };
    },
    () => {
      const pairs = [];
      for (let a = 2; a <= 5; a++) for (const b of [2, 3, 5, 6, 7]) pairs.push([a, b, a * a * b]);
      const chosen = []; shuffle(pairs);
      for (const p of pairs) if (!chosen.some(c => c[2] === p[2])) { chosen.push(p); if (chosen.length === 4) break; }
      chosen.sort((x, y) => y[2] - x[2]);
      const s = p => `${p[0]}√${p[1]}`;
      return { q: 'Какое из чисел наибольшее?', a: s(chosen[0]), w: chosen.slice(1).map(s),
        e: 'Сравниваем квадраты: ' + chosen.map(p => `(${s(p)})² = ${p[2]}`).join(', ') + '.' };
    },
  ];

  G['1.8'] = [
    () => {
      const a = R(30, 99), b = a - R(2, 9);
      return { q: `Вычислите ${a}² − ${b}².`, a: a * a - b * b, w: [(a - b) ** 2, a + b, 2 * (a * a - b * b)],
        e: `(${a} − ${b})(${a} + ${b}) = ${a - b}·${a + b} = ${a * a - b * b}.` };
    },
    () => {
      const S = R(3, 15); let a10; do { a10 = R(1, S * 10 - 1); } while (a10 * 2 === S * 10);
      const a = a10 / 10, b = (S * 10 - a10) / 10;
      return { q: `Найдите значение выражения (a² − b²)/(a − b) при a = ${num(a)}, b = ${num(b)}.`, a: S,
        w: [num((a10 - (S * 10 - a10)) / 10), S * S, 2 * S],
        e: `(a² − b²)/(a − b) = a + b = ${num(a)} + ${num(b)} = ${S}.` };
    },
    () => {
      const k = R(2, 9);
      return { q: `Упростите выражение (x² − ${k * k})/(x − ${k}).`, a: lin('x', k),
        w: [lin('x', -k), `x² − ${k}`, lin('x', k * k)],
        e: `x² − ${k * k} = (x − ${k})(x + ${k}), сокращаем на (x − ${k}).` };
    },
    () => {
      const a = R(1, 30) / 10, b = R(1, 20) / 10, ans = Math.round(4 * a * b * 100) / 100;
      return { q: `Найдите значение выражения (a + b)² − (a − b)² при a = ${num(a)}, b = ${num(b)}.`, a: ans,
        w: [Math.round(2 * a * b * 100) / 100, Math.round((a + b) ** 2 * 100) / 100, 0],
        e: `(a + b)² − (a − b)² = 4ab = 4·${num(a)}·${num(b)} = ${num(ans)}.` };
    },
  ];

  G['1.9'] = [
    () => {
      const a = nz(-5, 5), b = nz(-5, 5), c = nz(-5, 5), d = nz(-5, 5);
      return { q: `Вычислите (${cplx(a, b)})(${cplx(c, d)}).`, a: cplx(a * c - b * d, a * d + b * c),
        w: [cplx(a * c + b * d, a * d - b * c), cplx(a * c, b * d), cplx(a * c - b * d, -(a * d + b * c))],
        e: `(a + bi)(c + di) = (ac − bd) + (ad + bc)i, i² = −1.` };
    },
    () => {
      const [x, y, z] = pick(TRIPLES); const a = x * pick([1, -1]), b = y * pick([1, -1]);
      return { q: `Найдите модуль комплексного числа ${cplx(a, b)}.`, a: z, w: [x + y, z * z, Math.abs(y - x)],
        e: `|a + bi| = √(a² + b²) = √(${x * x} + ${y * y}) = ${z}.` };
    },
    () => {
      const n = R(5, 60), vals = ['1', 'i', '−1', '−i'];
      return { q: `Вычислите i<sup>${n}</sup>.`, a: vals[n % 4], w: vals.filter((_, i) => i !== n % 4),
        e: `Степени i повторяются с периодом 4: ${n} = 4·${Math.floor(n / 4)} + ${n % 4}.` };
    },
    () => {
      const a = nz(-9, 9), b = nz(-9, 9);
      return { q: `Найдите число, сопряжённое к ${cplx(a, b)}.`, a: cplx(a, -b), w: [cplx(-a, b), cplx(-a, -b), cplx(b, a)],
        e: `Сопряжённое к a + bi — это a − bi.` };
    },
  ];

  // ───── 2. Уравнения и неравенства ─────
  G['2.1'] = [
    () => {
      let r1, r2; do { r1 = R(-9, 9); r2 = R(-9, 9); } while (r1 === r2);
      const big = Math.random() < 0.5, ans = big ? Math.max(r1, r2) : Math.min(r1, r2), other = r1 + r2 - ans;
      return { q: `Найдите ${big ? 'больший' : 'меньший'} корень уравнения ${poly([1, -(r1 + r2), r1 * r2])} = 0.`, a: ans,
        w: [other, -ans, r1 + r2],
        e: `По теореме Виета x₁ + x₂ = ${num(r1 + r2)}, x₁·x₂ = ${num(r1 * r2)}: корни ${num(Math.min(r1, r2))} и ${num(Math.max(r1, r2))}.` };
    },
    () => {
      const x = R(-9, 9), a = R(2, 9); let c; do { c = R(1, 8); } while (c === a);
      const b = R(-15, 15), d = a * x + b - c * x;
      return { q: `Решите уравнение ${poly([a, b])} = ${poly([c, d])}.`, a: x, w: [-x, x + 1, x - 2],
        e: `${num(a - c)}x = ${num(d - b)}, x = ${num(x)}.` };
    },
    () => {
      const a = R(-6, 6), t = nz(-5, 5), m = R(1, 4), k = m * t;
      return { q: `Решите уравнение ${num(k)}/(${lin('x', -a)}) = ${m}.`, a: a + t, w: [a - t, t, a + k],
        e: `${lin('x', -a)} = ${num(k)}/${m} = ${num(t)}, x = ${num(a + t)}.` };
    },
  ];

  G['2.2'] = [
    () => {
      const x = R(-5, 10), a = R(1, 6), c = R(1, 9), b = c * c - a * x;
      return { q: `Решите уравнение √(${poly([a, b])}) = ${c}.`, a: x, w: [x + 1, -x, c * c],
        e: `Возводим в квадрат: ${poly([a, b])} = ${c * c}, x = ${num(x)}.` };
    },
    () => {
      const x = R(1, 9), m = R(x + 1, x + 6), k = m * m - x * x;
      return { q: `Найдите положительный корень уравнения √(x² + ${k}) = ${m}.`, a: x, w: [m, m - x, x + 1],
        e: `x² + ${k} = ${m * m}, x² = ${x * x}, x = ${x}.` };
    },
  ];

  G['2.4'] = [
    () => {
      const a = pick([2, 3, 5]), c = R(1, a === 2 ? 6 : 3), b = nz(-6, 6);
      return { q: `Решите уравнение ${a}<sup>${lin('x', b)}</sup> = ${a ** c}.`, a: c - b, w: [c + b, c, a ** c - b],
        e: `${a ** c} = ${a}<sup>${c}</sup>, значит ${lin('x', b)} = ${c}, x = ${num(c - b)}.` };
    },
    () => {
      const a = pick([2, 3, 5]), c = R(1, a === 2 ? 5 : 3), b = R(-9, 9);
      return { q: `Решите уравнение log${sub(a)}(${lin('x', b)}) = ${c}.`, a: a ** c - b, w: [c - b, a * c - b, a ** c + b],
        e: `${lin('x', b)} = ${a}<sup>${c}</sup> = ${a ** c}, x = ${num(a ** c - b)}.` };
    },
    () => {
      const a = pick([2, 3, 5]), k = R(1, a === 2 ? 5 : 3), b = R(-5, 5);
      return { q: `Решите уравнение (1/${a})<sup>${lin('x', -b)}</sup> = ${a ** k}.`, a: b - k, w: [b + k, k, -k],
        e: `${a ** k} = (1/${a})<sup>−${k}</sup>, значит ${lin('x', -b)} = −${k}, x = ${num(b - k)}.` };
    },
  ];

  G['2.5'] = [
    () => {
      const a = R(-8, 5), b = a + R(1, 8);
      return { q: `Сколько целых решений имеет неравенство (${lin('x', -a)})(${lin('x', -b)}) ≤ 0?`, a: b - a + 1,
        w: [b - a, b - a - 1, b - a + 2],
        e: `Решение — отрезок [${num(a)}; ${num(b)}], в нём ${b - a + 1} целых чисел.` };
    },
    () => {
      let a, b; do { a = R(-7, 7); b = R(-7, 7); } while (a === b);
      const lo = Math.min(a, b), hi = Math.max(a, b);
      return { q: `Решите неравенство (${lin('x', -a)})/(${lin('x', -b)}) < 0.`, a: iv(lo, hi),
        w: [`(−∞; ${num(lo)}) ∪ (${num(hi)}; +∞)`, iv(lo, hi, '[', ']'), a < b ? iv(a, b, '[', ')') : iv(b, a, '(', ']')],
        e: `Метод интервалов: дробь отрицательна между нулями ${num(lo)} и ${num(hi)}; знаменатель ≠ 0, неравенство строгое.` };
    },
    () => {
      const a = nz(-5, 5), k = R(-6, 6), b = R(-9, 9), c = a * k + b;
      if (k === 0) return null;
      const right = a > 0 ? `x > ${num(k)}` : `x < ${num(k)}`, wrong = a > 0 ? `x < ${num(k)}` : `x > ${num(k)}`;
      return { q: `Решите неравенство ${poly([a, b])} > ${num(c)}.`, a: right, w: [wrong, `x > ${num(-k)}`, `x < ${num(-k)}`],
        e: `${num(a)}x > ${num(c - b)}${a < 0 ? '; делим на отрицательное число — знак меняется' : ''}: ${right}.` };
    },
  ];

  G['2.6'] = [
    () => {
      const a = R(-5, 8), c = R(1, 5), top = a + c * c;
      if (Math.random() < 0.5)
        return { q: `Решите неравенство √(${lin('x', -a)}) < ${c}.`, a: iv(a, top, '[', ')'),
          w: [iv(a, top), iv(a, a + c, '[', ')'), iv('−∞', top)],
          e: `ОДЗ: x ≥ ${num(a)}. Возводим в квадрат: ${lin('x', -a)} < ${c * c}, x < ${num(top)}.` };
      return { q: `Решите неравенство √(${lin('x', -a)}) ≥ ${c}.`, a: iv(top, '+∞', '['),
        w: [iv(a, '+∞', '['), iv(top, '+∞'), iv(a, top, '[', ']')],
        e: `${lin('x', -a)} ≥ ${c * c}, x ≥ ${num(top)} (ОДЗ x ≥ ${num(a)} выполняется).` };
    },
  ];

  G['2.7'] = [
    () => {
      const a = pick([2, 3, 5]), k = R(1, a === 2 ? 5 : 3), v = R(1, 3);
      if (v === 1)
        return { q: `Решите неравенство ${a}<sup>x</sup> > ${a ** k}.`, a: iv(k, '+∞'),
          w: [iv('−∞', k), iv(k, '+∞', '['), iv(a ** k, '+∞')],
          e: `${a ** k} = ${a}<sup>${k}</sup>; основание ${a} > 1, знак сохраняется: x > ${k}.` };
      if (v === 2)
        return { q: `Решите неравенство (1/${a})<sup>x</sup> > ${a ** k}.`, a: iv('−∞', -k),
          w: [iv(-k, '+∞'), iv('−∞', k), iv(k, '+∞')],
          e: `${a ** k} = (1/${a})<sup>−${k}</sup>; основание меньше 1 — знак меняется: x < −${k}.` };
      return { q: `Решите неравенство log${sub(a)} x < ${k}.`, a: iv(0, a ** k),
        w: [iv('−∞', a ** k), iv(a ** k, '+∞'), iv(0, a * k)],
        e: `ОДЗ x > 0; основание ${a} > 1: x < ${a}<sup>${k}</sup> = ${a ** k}.` };
    },
  ];

  G['2.9'] = [
    () => {
      const x = R(-6, 6), y = R(-6, 6); let a1, b1, a2, b2;
      do { a1 = nz(-5, 5); b1 = nz(-5, 5); a2 = nz(-5, 5); b2 = nz(-5, 5); } while (a1 * b2 - a2 * b1 === 0);
      const p = (u, v) => `(${num(u)}; ${num(v)})`;
      return { q: `Решите систему уравнений ${sys(`${lin2(a1, b1)} = ${num(a1 * x + b1 * y)}`, `${lin2(a2, b2)} = ${num(a2 * x + b2 * y)}`)}`,
        a: p(x, y), w: [p(y, x), p(-x, y), p(x, -y)],
        e: `Подстановкой или сложением: x = ${num(x)}, y = ${num(y)}.` };
    },
    () => {
      const x = R(-7, 7), y = R(-7, 7), s = x + y, p = x * y;
      return { q: `Известно, что x + y = ${num(s)} и xy = ${num(p)}. Найдите x² + y².`, a: s * s - 2 * p,
        w: [s * s + 2 * p, s * s, s * s - p],
        e: `x² + y² = (x + y)² − 2xy = ${s * s} − ${num(2 * p)} = ${num(s * s - 2 * p)}.` };
    },
  ];

  G['2.10'] = [
    () => {
      const k = R(1, 9);
      return { q: `При каком положительном значении a уравнение x² − ax + ${k * k} = 0 имеет ровно один корень?`, a: 2 * k,
        w: [k, k * k, 4 * k],
        e: `Один корень при D = 0: a² − 4·${k * k} = 0, a = ${2 * k}.` };
    },
    () => {
      const c = nz(-9, 9);
      return { q: `При каких значениях a уравнение x² ${c < 0 ? '−' : '+'} ${Math.abs(c)} = a не имеет корней?`, a: `a < ${num(c)}`,
        w: [`a > ${num(c)}`, `a = ${num(c)}`, `a ≤ ${num(c)}`],
        e: `x² = a ${c < 0 ? '+' : '−'} ${Math.abs(c)}, корней нет, если правая часть отрицательна: a < ${num(c)}.` };
    },
    () => {
      const k = nz(-9, 9), m = nz(-9, 9);
      return { q: `При каком значении a уравнение (${lin('a', -k)})x = ${num(m)} не имеет решений?`, a: `a = ${num(k)}`,
        w: [`a = ${num(-k)}`, `a = ${num(m)}`, 'a = 0'],
        e: `При a = ${num(k)} получаем 0·x = ${num(m)} — решений нет.` };
    },
  ];

  G['2.11'] = [
    () => {
      const a = R(-6, 9), b = R(-6, 9), c = R(-6, 9), d = R(-6, 9);
      return { q: `Вычислите определитель матрицы ${mx([[a, b], [c, d]])}`, a: a * d - b * c,
        w: [a * d + b * c, a * c - b * d, b * c - a * d],
        e: `Δ = ad − bc = ${num(a * d)} − ${num(b * c)} = ${num(a * d - b * c)}.` };
    },
    () => {
      const d = R(1, 6); let b, c; do { b = nz(-6, 6); c = nz(-6, 6); } while ((b * c) % d !== 0);
      const t = b * c / d;
      return { q: `При каком значении t определитель матрицы ${mx([['t', b], [c, d]])} равен нулю?`, a: t,
        w: [-t, d, b + c],
        e: `Δ = ${d}t − ${num(b * c)} = 0, t = ${num(t)}.` };
    },
  ];

  // ───── 3. Функции и графики ─────
  G['3.1'] = [
    () => {
      const k = R(2, 5), b = nz(-9, 9);
      return { q: `Найдите функцию, обратную к y = ${poly([k, b])}.`, a: `y = (${lin('x', -b)})/${k}`,
        w: [`y = (${lin('x', b)})/${k}`, `y = ${poly([k, -b])}`, `y = x/${k} ${b < 0 ? '+' : '−'} ${Math.abs(b)}`],
        e: `Выразим x: x = (y ${b < 0 ? '+' : '−'} ${Math.abs(b)})/${k}, затем меняем x и y местами.` };
    },
    () => {
      const a = R(1, 9), v = nz(-9, 9), odd = Math.random() < 0.5;
      return { q: `Функция f — ${odd ? 'нечётная' : 'чётная'}, f(${a}) = ${num(v)}. Найдите f(−${a}).`, a: odd ? -v : v,
        w: [odd ? v : -v, 0, 2 * v],
        e: odd ? 'Для нечётной функции f(−x) = −f(x).' : 'Для чётной функции f(−x) = f(x).' };
    },
    () => {
      const a = nz(-3, 3), b = R(-5, 5), c = R(-9, 9), x0 = R(-3, 3), v = a * x0 * x0 + b * x0 + c;
      return { q: `Функция задана формулой f(x) = ${poly([a, b, c])}. Найдите f(${num(x0)}).`, a: v,
        w: [a * x0 * x0 - b * x0 + c, -v, v + 2 * a],
        e: `f(${num(x0)}) = ${num(a)}·${x0 * x0} + ${num(b)}·(${num(x0)}) + ${num(c)} = ${num(v)}.` };
    },
  ];

  G['3.2'] = [
    () => {
      const a = nz(-9, 9);
      return { q: `Найдите область определения функции y = √(${lin('x', -a)}).`, a: iv(a, '+∞', '['),
        w: [iv(a, '+∞'), iv('−∞', a, '(', ']'), iv(-a, '+∞', '[')],
        e: `Подкоренное выражение неотрицательно: x ≥ ${num(a)}.` };
    },
    () => {
      const a = R(1, 9);
      return { q: `Найдите область определения функции y = 1/(x² − ${a * a}).`, a: `x ≠ ±${a}`,
        w: [`x ≠ ${a}`, `x > ${a}`, `x ≠ ${a * a}`],
        e: `Знаменатель не равен нулю: x² ≠ ${a * a}, x ≠ ±${a}.` };
    },
    () => {
      const h = nz(-6, 6), c = R(-10, 10), m = c - h * h;
      return { q: `Найдите наименьшее значение функции y = ${poly([1, -2 * h, c])}.`, a: m, w: [c, h, c + h * h],
        e: `y = (${lin('x', -h)})² ${m < 0 ? '−' : '+'} ${Math.abs(m)}; минимум при x = ${num(h)}: ${num(m)}.` };
    },
    () => {
      const h = nz(-6, 6), c = R(-10, 10);
      return { q: `Найдите промежуток возрастания функции y = ${poly([1, -2 * h, c])}.`, a: iv(h, '+∞', '['),
        w: [iv('−∞', h, '(', ']'), iv(-h, '+∞', '['), iv(c, '+∞', '[')],
        e: `Ветви параболы вверх, вершина x₀ = ${num(h)}; правее вершины функция возрастает.` };
    },
  ];

  G['3.3'] = [
    () => {
      const n = pick([2, 3, 4, 5]), x0 = nz(-3, 3), v = x0 ** n;
      return { q: `Дана функция f(x) = x${sup(n)}. Найдите f(${num(x0)}).`, a: v, w: [-v, n * x0, v + 1],
        e: `(${num(x0)})${sup(n)} = ${num(v)}${n % 2 ? ' — нечётная степень сохраняет знак' : ' — чётная степень даёт неотрицательное число'}.` };
    },
    () => {
      const k = R(1, 5), s = pick([1, -1]);
      return { q: `Дана функция f(x) = ∛x. Найдите f(${num(s * k ** 3)}).`, a: s * k, w: [-s * k, s * k * k, Math.round(s * k ** 3 / 3)],
        e: `(${num(s * k)})³ = ${num(s * k ** 3)}.` };
    },
  ];

  G['3.4'] = [
    () => {
      const fn = pick(['sin', 'cos', 'tg']), k = R(2, 6);
      const ans = fn === 'tg' ? piFrac(1, k) : piFrac(2, k);
      return { q: `Найдите наименьший положительный период функции y = ${fn} ${k}x.`, a: ans,
        w: [piFrac(2 * k), fn === 'tg' ? piFrac(2, k) : piFrac(1, k), '2π', 'π'],
        e: `Период ${fn} x равен ${fn === 'tg' ? 'π' : '2π'}; для ${fn} ${k}x он делится на ${k}: ${ans}.` };
    },
    () => {
      const a = nz(-5, 5), b = R(-5, 5), A = Math.abs(a);
      const coef = a === 1 ? '' : a === -1 ? '−' : num(a);
      return { q: `Найдите область значений функции y = ${coef}sin x${b ? (b < 0 ? ' − ' : ' + ') + Math.abs(b) : ''}.`, a: iv(b - A, b + A, '[', ']'),
        w: [iv(-A, A, '[', ']'), iv(b - 1, b + 1, '[', ']'), iv(b, b + A, '[', ']')],
        e: `sin x ∈ [−1; 1], значит ${coef}sin x ∈ [−${A}; ${A}], сдвиг на ${num(b)}.` };
    },
  ];

  G['3.5'] = [
    () => {
      const a = pick([2, 3, 5, 10]), c = nz(-9, 9);
      const L = a === 10 ? 'lg' : `log${sub(a)}`;
      return { q: `Найдите область определения функции y = ${L}(${lin('x', -c)}).`, a: iv(c, '+∞'),
        w: [iv(c, '+∞', '['), iv('−∞', c), iv(0, '+∞')],
        e: `Аргумент логарифма положителен: x > ${num(c)}.` };
    },
    () => {
      const a = pick([2, 3, 5]), c = nz(-9, 9);
      return { q: `Найдите область значений функции y = ${a}<sup>x</sup> ${c < 0 ? '−' : '+'} ${Math.abs(c)}.`, a: iv(c, '+∞'),
        w: [iv(c, '+∞', '['), iv(0, '+∞'), iv('−∞', '+∞')],
        e: `${a}<sup>x</sup> > 0, значит y > ${num(c)}.` };
    },
    () => {
      const a = pick([2, 3, 4, 5]), k = R(1, 3);
      return { q: `Дана функция f(x) = ${a}<sup>x</sup>. Найдите f(−${k}).`, a: frac(1, a ** k), w: [num(-(a ** k)), num(-a * k), frac(1, a * k)],
        e: `${a}<sup>−${k}</sup> = 1/${a ** k}.` };
    },
  ];

  G['3.6'] = [
    () => {
      const a = nz(-5, 5), c = nz(-6, 6); let b; do { b = R(-9, 9); } while (a * c + b === 0 || b === a);
      const f = `y = (${poly([a, b])})/(${lin('x', -c)})`;
      if (Math.random() < 0.5)
        return { q: `Найдите вертикальную асимптоту графика функции ${f}.`, a: `x = ${num(c)}`,
          w: [`x = ${num(-c)}`, `x = ${num(a)}`, `y = ${num(c)}`],
          e: `Знаменатель обращается в ноль при x = ${num(c)}, числитель там ≠ 0.` };
      return { q: `Найдите горизонтальную асимптоту графика функции ${f}.`, a: `y = ${num(a)}`,
        w: [`y = ${num(c)}`, `x = ${num(a)}`, `y = ${num(b)}`],
        e: `При x → ∞ дробь стремится к отношению старших коэффициентов: ${num(a)}/1.` };
    },
  ];

  G['3.7'] = [
    () => {
      const a1 = R(-10, 10), d = nz(-6, 6), n = R(5, 20), an = a1 + (n - 1) * d;
      return { q: `В арифметической прогрессии a₁ = ${num(a1)}, d = ${num(d)}. Найдите a${sub(n)}.`, a: an,
        w: [a1 + n * d, a1 + (n - 2) * d, a1 * n],
        e: `aₙ = a₁ + (n − 1)d = ${num(a1)} + ${n - 1}·(${num(d)}) = ${num(an)}.` };
    },
    () => {
      const a1 = R(-5, 10), d = nz(-4, 5), n = R(5, 15), S = n * (2 * a1 + (n - 1) * d) / 2;
      return { q: `Найдите сумму первых ${n} членов арифметической прогрессии, если a₁ = ${num(a1)}, d = ${num(d)}.`, a: S,
        w: [n * (a1 + (n - 1) * d), S + d, n * (2 * a1 + n * d) / 2],
        e: `Sₙ = (2a₁ + (n − 1)d)·n/2 = ${num(S)}.` };
    },
    () => {
      const b1 = nz(-5, 5), q = pick([2, 3, -2, -3]), n = R(3, 6), bn = b1 * q ** (n - 1);
      return { q: `В геометрической прогрессии b₁ = ${num(b1)}, q = ${num(q)}. Найдите b${sub(n)}.`, a: bn,
        w: [b1 * q ** n, -bn, b1 * q * (n - 1)],
        e: `bₙ = b₁·qⁿ⁻¹ = ${num(b1)}·(${num(q)})${sup(n - 1)} = ${num(bn)}.` };
    },
    () => {
      const [p, qd] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [-1, 2]]);
      const b1 = R(1, 9) * (qd - p) * (p < 0 ? 1 : 1);
      return { q: `Найдите сумму бесконечно убывающей геометрической прогрессии: b₁ = ${b1}, q = ${frac(p, qd)}.`, a: frac(b1 * qd, qd - p),
        w: [frac(b1 * qd, qd + p), frac(b1 * p, qd), num(b1 * 2)],
        e: `S = b₁/(1 − q) = ${b1}/(1 − ${frac(p, qd)}) = ${frac(b1 * qd, qd - p)}.` };
    },
    () => {
      const S = 10000 * R(1, 9), p = pick([10, 20]), ans = S * (100 + p) ** 2 / 10000;
      const f = v => Math.round(v).toLocaleString('ru-RU');
      return { q: `Вклад ${f(S)} руб. положили под ${p}% годовых с ежегодной капитализацией. Сколько рублей будет на счёте через 2 года?`,
        a: f(ans), w: [f(S * (100 + 2 * p) / 100), f(S * (100 + p) / 100), f(S * (100 + p) ** 3 / 1e6)],
        e: `Формула сложных процентов: ${f(S)}·${num(1 + p / 100)}² = ${f(ans)}.` };
    },
    () => {
      const p = pick([10, 20, 30, 50]), d = p * p / 100;
      return { q: `Цену товара повысили на ${p}%, а затем снизили на ${p}%. Как изменилась цена?`, a: `уменьшилась на ${num(d)}%`,
        w: ['не изменилась', `уменьшилась на ${p}%`, `увеличилась на ${num(d)}%`],
        e: `(1 + ${num(p / 100)})(1 − ${num(p / 100)}) = ${num(1 - d / 100)} — цена уменьшилась на ${num(d)}%.` };
    },
  ];

  // ───── 4. Начала анализа ─────
  const DERIV = [['sin x', 'cos x'], ['cos x', '−sin x'], ['eˣ', 'eˣ'], ['ln x', '1/x'], ['tg x', '1/cos²x'],
    ['√x', '1/(2√x)'], ['x³', '3x²'], ['x²', '2x'], ['1/x', '−1/x²'], ['2ˣ', '2ˣ·ln 2']];
  const ANTI = [['2x', 'x² + C'], ['3x²', 'x³ + C'], ['cos x', 'sin x + C'], ['sin x', '−cos x + C'], ['eˣ', 'eˣ + C'],
    ['1/x', 'ln|x| + C'], ['4x³', 'x⁴ + C'], ['1/cos²x', 'tg x + C'], ['1', 'x + C']];

  G['4.1'] = [
    () => {
      const a = nz(-3, 3), b = R(-4, 4), c = R(-6, 6), d = R(-5, 5), x0 = R(-3, 3);
      const ans = 3 * a * x0 * x0 + 2 * b * x0 + c, fx = a * x0 ** 3 + b * x0 * x0 + c * x0 + d;
      const f = poly([a, b, c, d]);
      const q = Math.random() < 0.5
        ? `Найдите f′(${num(x0)}), если f(x) = ${f}.`
        : `Найдите угловой коэффициент касательной к графику функции y = ${f} в точке x₀ = ${num(x0)}.`;
      return { q, a: ans, w: [fx, 3 * a * x0 * x0 + b * x0 + c, a * x0 * x0 + b * x0 + c],
        e: `f′(x) = ${poly([3 * a, 2 * b, c])}; f′(${num(x0)}) = ${num(ans)}.` };
    },
    () => {
      const [f, d] = pick(DERIV);
      return { q: `Найдите производную функции y = ${f}.`, a: d, w: othersFrom(DERIV.map(r => r[1]), d),
        e: `Табличная производная: (${f})′ = ${d}.` };
    },
    () => {
      const a = R(1, 5), b = R(0, 10), c = R(0, 20), t = R(1, 6), v = 2 * a * t + b;
      return { q: `Точка движется по закону x(t) = ${poly([a, b, c], 't')} (x — в метрах, t — в секундах). Найдите её скорость (м/с) в момент t = ${t} с.`,
        a: v, w: [a * t * t + b * t + c, a * t + b, 2 * a * t],
        e: `v(t) = x′(t) = ${poly([2 * a, b], 't')}; v(${t}) = ${v}.` };
    },
  ];

  G['4.2'] = [
    () => {
      const k = R(1, 4), c = R(-9, 9), isMin = Math.random() < 0.5;
      return { q: `Найдите точку ${isMin ? 'минимума' : 'максимума'} функции y = ${poly([1, 0, -3 * k * k, c])}.`, a: isMin ? k : -k,
        w: [isMin ? -k : k, 0, 3 * k * k],
        e: `y′ = 3x² − ${3 * k * k} = 0 при x = ±${k}. Производная меняет знак с «+» на «−» в −${k} (максимум) и с «−» на «+» в ${k} (минимум).` };
    },
    () => {
      const k = R(1, 3);
      return { q: `Найдите наименьшее значение функции y = ${poly([1, 0, -3 * k * k, 0])} на отрезке [0; ${2 * k}].`, a: -2 * k ** 3,
        w: [0, 2 * k ** 3, k],
        e: `y′ = 0 при x = ${k}; y(0) = 0, y(${k}) = ${num(-2 * k ** 3)}, y(${2 * k}) = ${2 * k ** 3}. Наименьшее — ${num(-2 * k ** 3)}.` };
    },
    () => {
      const h = nz(-6, 6), c = R(-9, 9), M = c + h * h;
      return { q: `Найдите наибольшее значение функции y = ${poly([-1, 2 * h, c])}.`, a: M, w: [c, h, c - h * h],
        e: `y′ = −2x ${h < 0 ? '−' : '+'} ${Math.abs(2 * h)} = 0 при x = ${num(h)} — точка максимума; y(${num(h)}) = ${num(M)}.` };
    },
  ];

  G['4.3'] = [
    () => {
      const a = R(1, 4), k = R(1, 6);
      return { q: `Вычислите ∫<sub>0</sub><sup>${a}</sup> ${k === 1 ? '' : k}x² dx.`, a: frac(k * a ** 3, 3),
        w: [frac(k * a * a, 2), num(k * a ** 3), num(2 * k * a)],
        e: `Первообразная ${k === 1 ? '' : k}x³/3; ${k === 1 ? '' : k + '·'}${a ** 3}/3 − 0 = ${frac(k * a ** 3, 3)}.` };
    },
    () => {
      const p = R(-3, 3), q = p + R(1, 4), c = R(-5, 5), ans = q * q - p * p + c * (q - p);
      return { q: `Вычислите ∫<sub>${num(p)}</sub><sup>${num(q)}</sup> (${poly([2, c])}) dx.`, a: ans,
        w: [q * q - p * p, 2 * (q - p), ans + c],
        e: `Первообразная ${poly([1, c, 0])}; F(${num(q)}) − F(${num(p)}) = ${num(ans)}.` };
    },
    () => {
      const [f, F] = pick(ANTI);
      return { q: `Найдите первообразную функции f(x) = ${f}.`, a: F, w: othersFrom(ANTI.map(r => r[1]), F),
        e: `Проверка: (${F.replace(' + C', '')})′ = ${f}.` };
    },
  ];

  // ───── 5. Множества и логика ─────
  G['5.1'] = [
    () => {
      const a = R(8, 20), b = R(8, 20), c = R(2, Math.min(a, b) - 2), N = a + b - c + R(1, 10);
      return { q: `В классе ${N} учеников. ${a} занимаются футболом, ${b} — плаванием, ${c} — и тем и другим. Сколько учеников не занимается ни тем, ни другим?`,
        a: N - (a + b - c), w: [N - a - b + 2 * c, Math.abs(N - a - b), N - a - b + c + 1],
        e: `|Ф ∪ П| = ${a} + ${b} − ${c} = ${a + b - c}; ${N} − ${a + b - c} = ${N - (a + b - c)}.` };
    },
    () => {
      const mk = () => shuffle([...Array(10)].map((_, i) => i + 1)).slice(0, R(4, 5)).sort((x, y) => x - y);
      const A = mk(), B = mk();
      const s = arr => arr.length ? '{' + arr.join(', ') + '}' : '∅';
      const inter = A.filter(x => B.includes(x)), uni = [...new Set([...A, ...B])].sort((x, y) => x - y);
      const AmB = A.filter(x => !B.includes(x)), BmA = B.filter(x => !A.includes(x));
      const isInter = Math.random() < 0.5;
      return { q: `A = ${s(A)}, B = ${s(B)}. Найдите A ${isInter ? '∩' : '∪'} B.`, a: s(isInter ? inter : uni),
        w: [s(isInter ? uni : inter), s(AmB), s(BmA)],
        e: isInter ? 'Пересечение — элементы, которые есть в обоих множествах.' : 'Объединение — все элементы обоих множеств без повторов.' };
    },
  ];

  // ───── 6. Вероятность и статистика ─────
  G['6.1'] = [
    () => {
      const n = pick([5, 7]); let xs = [...Array(n)].map(() => R(1, 30));
      const sum = xs.reduce((s, x) => s + x, 0); if (sum % n) { const i = xs.indexOf(Math.max(...xs)); xs[i] += n - sum % n; }
      const sorted = [...xs].sort((a, b) => a - b), mean = xs.reduce((s, x) => s + x, 0) / n, med = sorted[(n - 1) / 2];
      const kind = R(1, 3), list = xs.join('; ');
      if (kind === 1)
        return { q: `Найдите среднее арифметическое набора: ${list}.`, a: mean, w: [med, (sorted[0] + sorted[n - 1]) / 2, mean + 1],
          e: `Сумма ${mean * n}, делим на ${n}: ${num(mean)}.` };
      if (kind === 2)
        return { q: `Найдите медиану набора: ${list}.`, a: med, w: [xs[(n - 1) / 2], mean, sorted[n - 1] - sorted[0]],
          e: `Упорядочим: ${sorted.join('; ')}. Середина — ${med}.` };
      return { q: `Найдите размах набора: ${list}.`, a: sorted[n - 1] - sorted[0], w: [sorted[n - 1], sorted[n - 1] + sorted[0], n],
        e: `Размах = max − min = ${sorted[n - 1]} − ${sorted[0]} = ${sorted[n - 1] - sorted[0]}.` };
    },
  ];

  G['6.2'] = [
    () => {
      const r = R(1, 12), b = R(1, 12);
      return { q: `В урне ${r} красных и ${b} синих шаров. Наугад вынимают один шар. Найдите вероятность того, что он красный.`,
        a: frac(r, r + b), w: [frac(b, r + b), frac(r, b), frac(1, r + b)],
        e: `Благоприятных исходов ${r}, всего ${r + b}: P = ${frac(r, r + b)}.` };
    },
    () => {
      const s = R(2, 12), cnt = 6 - Math.abs(s - 7);
      return { q: `Бросают две игральные кости. Найдите вероятность того, что сумма очков равна ${s}.`, a: frac(cnt, 36),
        w: [frac(1, 6), frac(1, 36), frac(cnt + 1, 36), frac(1, 11)],
        e: `Всего 36 исходов, благоприятных — ${cnt}: P = ${frac(cnt, 36)}.` };
    },
    () => {
      const n = R(2, 4), k = R(0, n), c = C(n, k);
      return { q: `Монету бросают ${n} раза. Найдите вероятность того, что орёл выпадет ровно ${k} раз${k >= 2 && k <= 4 ? 'а' : ''}.`, a: frac(c, 2 ** n),
        w: [frac(1, 2 ** n), frac(1, 2), frac(k + 1, n + 1), frac(c, 2 ** (n + 1))],
        e: `Всего 2${sup(n)} = ${2 ** n} исходов, благоприятных C(${n}; ${k}) = ${c}.` };
    },
    () => {
      const p = R(1, 9) / 10, q = R(1, 9) / 10, r2 = v => Math.round(v * 100) / 100;
      return { q: `Два стрелка стреляют независимо. Вероятность попадания первого ${num(p)}, второго ${num(q)}. Найдите вероятность того, что попадут оба.`,
        a: r2(p * q), w: [r2(p + q - p * q), r2(1 - p * q), r2((p + q) / 2)],
        e: `Независимые события: P = ${num(p)}·${num(q)} = ${num(r2(p * q))}.` };
    },
    () => {
      const X = R(1, 9);
      return { q: `Вероятность того, что новая ручка пишет плохо, равна ${num(X / 100)}. Найдите вероятность того, что случайно выбранная ручка пишет хорошо.`,
        a: num((100 - X) / 100), w: [num(X / 100), num((100 - 2 * X) / 100), num((100 - X - 1) / 100)],
        e: `Противоположное событие: 1 − ${num(X / 100)} = ${num((100 - X) / 100)}.` };
    },
  ];

  G['6.3'] = [
    () => {
      const n = R(4, 7);
      return { q: `Сколькими способами можно расставить ${n} разных книг на полке?`, a: fact(n), w: [n * n, 2 ** n, fact(n - 1)],
        e: `Число перестановок: ${n}! = ${fact(n)}.` };
    },
    () => {
      const n = R(5, 20);
      return { q: `${n} человек обменялись рукопожатиями (каждый с каждым). Сколько было рукопожатий?`, a: C(n, 2), w: [n * (n - 1), n * n, n],
        e: `C(${n}; 2) = ${n}·${n - 1}/2 = ${C(n, 2)}.` };
    },
    () => {
      const n = R(5, 25);
      return { q: `Сколькими способами можно выбрать из ${n} человек старосту и его заместителя?`, a: n * (n - 1), w: [C(n, 2), n * n, 2 * n],
        e: `Порядок важен: A(${n}; 2) = ${n}·${n - 1} = ${n * (n - 1)}.` };
    },
    () => {
      const n = R(5, 10);
      return { q: `Сколькими способами можно выбрать 3 человека в комиссию из ${n} человек?`, a: C(n, 3), w: [n * (n - 1) * (n - 2), 3 * n, C(n, 2)],
        e: `C(${n}; 3) = ${n}·${n - 1}·${n - 2}/6 = ${C(n, 3)}.` };
    },
  ];

  // ───── 7. Геометрия ─────
  G['7.1'] = [
    () => {
      const [a, b, c] = pick(TRIPLES), m = R(1, 3);
      if (Math.random() < 0.5)
        return { q: `Катеты прямоугольного треугольника равны ${a * m} и ${b * m}. Найдите гипотенузу.`, a: c * m, w: [(a + b) * m, (c + 1) * m, b * m + 1],
          e: `c = √(${(a * m) ** 2} + ${(b * m) ** 2}) = ${c * m}.` };
      return { q: `Гипотенуза прямоугольного треугольника равна ${c * m}, один из катетов — ${a * m}. Найдите другой катет.`, a: b * m, w: [(c - a) * m, (b + 1) * m, c * m + a * m],
        e: `b = √(${(c * m) ** 2} − ${(a * m) ** 2}) = ${b * m}.` };
    },
    () => {
      const x = R(20, 80), y = R(20, 150 - x);
      return { q: `Два угла треугольника равны ${x}° и ${y}°. Найдите третий угол (в градусах).`, a: 180 - x - y, w: [x + y, 360 - x - y, 90 - Math.min(x, y)],
        e: `Сумма углов треугольника 180°: 180 − ${x} − ${y} = ${180 - x - y}.` };
    },
    () => {
      const r = R(2, 10), area = Math.random() < 0.5;
      return { q: `Радиус окружности равен ${r}. Найдите ${area ? 'площадь круга' : 'длину окружности'}.`, a: area ? piFrac(r * r) : piFrac(2 * r),
        w: area ? [piFrac(2 * r), piFrac(2 * r * r), piFrac(r)] : [piFrac(r * r), piFrac(r), piFrac(4 * r)],
        e: area ? `S = πr² = ${piFrac(r * r)}.` : `L = 2πr = ${piFrac(2 * r)}.` };
    },
    () => {
      const al = R(10, 85);
      return { q: `Вписанный угол равен ${al}°. Найдите центральный угол, опирающийся на ту же дугу (в градусах).`, a: 2 * al, w: [al, num(al / 2), 180 - al],
        e: `Вписанный угол равен половине центрального: ${al}·2 = ${2 * al}.` };
    },
    () => {
      const n = pick([3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20]);
      return { q: `Найдите внутренний угол правильного ${n}-угольника (в градусах).`, a: 180 * (n - 2) / n, w: [360 / n, 180 * (n - 2), 180 - 180 / n],
        e: `Сумма углов 180·(${n} − 2) = ${180 * (n - 2)}, делим на ${n}: ${180 * (n - 2) / n}.` };
    },
    () => {
      const a = R(2, 15), b = R(2, 15);
      return { q: `Катеты прямоугольного треугольника равны ${a} и ${b}. Найдите его площадь.`, a: a * b / 2, w: [a * b, a + b, (a * b) / 4],
        e: `S = ab/2 = ${a}·${b}/2 = ${num(a * b / 2)}.` };
    },
  ];

  G['7.3'] = [
    () => {
      const a = R(2, 9), k = R(1, 3);
      if (k === 1) return { q: `Ребро куба равно ${a}. Найдите его объём.`, a: a ** 3, w: [6 * a * a, a * a, 3 * a], e: `V = a³ = ${a ** 3}.` };
      if (k === 2) return { q: `Ребро куба равно ${a}. Найдите площадь его поверхности.`, a: 6 * a * a, w: [a ** 3, 4 * a * a, 12 * a], e: `S = 6a² = ${6 * a * a}.` };
      return { q: `Ребро куба равно ${a}. Найдите диагональ куба.`, a: `${a}√3`, w: [`${a}√2`, `${3 * a}`, `${a * a}√3`], e: `d = a√3 = ${a}√3.` };
    },
    () => {
      const [a, b, c, d] = pick([[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [2, 6, 9, 11], [4, 4, 7, 9], [6, 6, 7, 11], [2, 10, 11, 15]]), m = R(1, 2);
      return { q: `Рёбра прямоугольного параллелепипеда, выходящие из одной вершины, равны ${a * m}, ${b * m} и ${c * m}. Найдите его диагональ.`, a: d * m,
        w: [(a + b + c) * m, (d + 1) * m, c * m + 1],
        e: `d = √(${(a * m) ** 2} + ${(b * m) ** 2} + ${(c * m) ** 2}) = ${d * m}.` };
    },
    () => {
      const a = R(2, 9), h = R(2, 12);
      return { q: `В правильной четырёхугольной пирамиде сторона основания ${a}, высота ${h}. Найдите объём пирамиды.`, a: frac(a * a * h, 3),
        w: [num(a * a * h), frac(a * h, 3), frac(a * a * h, 2)],
        e: `V = S·h/3 = ${a * a}·${h}/3 = ${frac(a * a * h, 3)}.` };
    },
    () => {
      const n = R(3, 12), prism = Math.random() < 0.5, what = R(1, 3);
      const vals = prism ? [3 * n, 2 * n, n + 2] : [2 * n, n + 1, n + 1];
      const names = ['рёбер', 'вершин', 'граней'];
      return { q: `Сколько ${names[what - 1]} у ${n}-угольной ${prism ? 'призмы' : 'пирамиды'}?`, a: vals[what - 1],
        w: [...vals.filter((_, i) => i !== what - 1), n, 2 * n + 2],
        e: prism ? `У n-угольной призмы 3n рёбер, 2n вершин, n + 2 граней.` : `У n-угольной пирамиды 2n рёбер, n + 1 вершин, n + 1 граней.` };
    },
  ];

  G['7.4'] = [
    () => {
      const r = R(1, 6), h = R(1, 10), k = R(1, 5);
      if (k === 1) return { q: `Радиус основания цилиндра ${r}, высота ${h}. Найдите объём цилиндра.`, a: piFrac(r * r * h), w: [piFrac(2 * r * h), piFrac(r * h), piFrac(r * r * h, 3)], e: `V = πr²h = ${piFrac(r * r * h)}.` };
      if (k === 2) return { q: `Радиус основания цилиндра ${r}, высота ${h}. Найдите площадь боковой поверхности.`, a: piFrac(2 * r * h), w: [piFrac(r * r * h), piFrac(r * h), piFrac(2 * r * (r + h))], e: `S = 2πrh = ${piFrac(2 * r * h)}.` };
      if (k === 3) return { q: `Радиус основания конуса ${r}, высота ${h}. Найдите объём конуса.`, a: piFrac(r * r * h, 3), w: [piFrac(r * r * h), piFrac(r * h, 3), piFrac(2 * r * h, 3)], e: `V = πr²h/3 = ${piFrac(r * r * h, 3)}.` };
      if (k === 4) return { q: `Радиус шара ${r}. Найдите объём шара.`, a: piFrac(4 * r ** 3, 3), w: [piFrac(4 * r * r), piFrac(r ** 3), piFrac(4 * r ** 3)], e: `V = 4πr³/3 = ${piFrac(4 * r ** 3, 3)}.` };
      return { q: `Радиус сферы ${r}. Найдите площадь сферы.`, a: piFrac(4 * r * r), w: [piFrac(4 * r ** 3, 3), piFrac(r * r), piFrac(2 * r * r)], e: `S = 4πr² = ${piFrac(4 * r * r)}.` };
    },
  ];

  G['7.5'] = [
    () => {
      const [x, y, z] = pick(TRIPLES); const a = x * pick([1, -1]), b = y * pick([1, -1]);
      return { q: `Найдите длину вектора a⃗(${num(a)}; ${num(b)}).`, a: z, w: [x + y, z * z, Math.abs(a + b) || z + 1],
        e: `|a⃗| = √(${x * x} + ${y * y}) = ${z}.` };
    },
    () => {
      const a1 = R(-6, 6), b1 = R(-6, 6), a2 = R(-6, 6), b2 = R(-6, 6), d = a1 * a2 + b1 * b2;
      return { q: `Найдите скалярное произведение векторов a⃗(${num(a1)}; ${num(b1)}) и b⃗(${num(a2)}; ${num(b2)}).`, a: d,
        w: [a1 * b2 + a2 * b1, a1 * a2 - b1 * b2, a1 + a2 + b1 + b2],
        e: `a⃗·b⃗ = ${num(a1)}·${num(a2)} + ${num(b1)}·${num(b2)} = ${num(d)}.` };
    },
    () => {
      const a2 = pick([1, 2, 3, -1, -2, -3]); let b1, b2; do { b1 = nz(-6, 6); b2 = nz(-6, 6); } while ((b1 * b2) % a2 !== 0);
      const t = -b1 * b2 / a2;
      return { q: `При каком t векторы a⃗(t; ${num(b1)}) и b⃗(${num(a2)}; ${num(b2)}) перпендикулярны?`, a: t, w: [-t, b1 * b2, t + a2],
        e: `a⃗·b⃗ = ${num(a2)}t + ${num(b1 * b2)} = 0, t = ${num(t)}.` };
    },
    () => {
      const x1 = R(-6, 6), y1 = R(-6, 6), x2 = x1 + 2 * R(-4, 4), y2 = y1 + 2 * R(-4, 4);
      const p = (u, v) => `(${num(u)}; ${num(v)})`;
      return { q: `Найдите координаты середины отрезка AB, если A${p(x1, y1)}, B${p(x2, y2)}.`, a: p((x1 + x2) / 2, (y1 + y2) / 2),
        w: [p(x2 - x1, y2 - y1), p((x2 - x1) / 2, (y2 - y1) / 2), p(x1 + x2, y1 + y2)],
        e: `Середина: ((x₁ + x₂)/2; (y₁ + y₂)/2).` };
    },
  ];

  window.GENERATORS = G;
  window.QUIZ_FMT = { num, shuffle, poly };
})();
