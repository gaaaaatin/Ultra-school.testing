// Видеоуроки: окно с плеером, паузы-вопросы, после ролика — «Закрепить: 5 задач».
// Данные — data/videos.js. Связь с тренажёром — window.US (app.js).
(() => {
  const VIDEOS = window.VIDEOS || {};
  const KEY = 'ultraschool-video';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* без памяти */ } };
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  const root = document.createElement('div');
  root.className = 'vmodal'; root.hidden = true;
  root.innerHTML = `
    <div class="vbox" role="dialog" aria-modal="true" aria-labelledby="vTitle">
      <header class="vhead">
        <div><div class="vchap" id="vChap"></div><div class="vtitle" id="vTitle"></div></div>
        <button class="round vclose" id="vClose" title="Закрыть">✕</button>
      </header>
      <div class="vstage">
        <video id="vVideo" playsinline controls preload="metadata"></video>
        <div class="vlayer vq" id="vQ" hidden>
          <div class="vq-in">
            <div class="vq-tag">Проверь себя</div>
            <div class="vq-text" id="vQText"></div>
            <div class="vq-opts" id="vQOpts"></div>
            <div class="vq-say" id="vQSay" hidden><img id="vQAva" src="assets/x-hi.png" alt="Икс"><div id="vQMsg"></div></div>
            <button class="vbtn lime" id="vQGo" hidden>Смотреть дальше →</button>
          </div>
        </div>
        <div class="vlayer vend" id="vEnd" hidden>
          <div class="vq-in">
            <img class="vend-ava" src="assets/x-wow.png" alt="">
            <div class="vq-text">Глава просмотрена</div>
            <div class="vend-sub">Теперь закрепи правило на задачах — пять штук, пара минут.</div>
            <div class="vend-btns">
              <button class="vbtn lime" id="vPractice">Закрепить: 5 задач</button>
              <button class="vbtn ghost" id="vAgain">Пересмотреть</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);
  const $ = id => document.getElementById(id);
  const video = $('vVideo');
  let cur = null, topic = null, done = new Set();

  function exitFull() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (video.webkitDisplayingFullscreen) video.webkitExitFullscreen();
  }
  function open(code, idx = 0) {
    const v = (VIDEOS[code] || [])[idx]; if (!v) return;
    cur = v; topic = code; done = new Set();
    $('vChap').textContent = v.chapter; $('vTitle').textContent = v.title;
    $('vQ').hidden = true; $('vEnd').hidden = true;
    if (video.getAttribute('src') !== v.src) { video.src = v.src; video.poster = v.poster || ''; }
    video.currentTime = 0;
    root.hidden = false; document.body.classList.add('vopen');
    window.US && US.pause();
    video.play().catch(() => {}); // без разрешения браузера стартует по кнопке Play
    $('vClose').focus({ preventScroll: true });
  }
  function close() {
    video.pause(); exitFull();
    root.hidden = true; document.body.classList.remove('vopen');
    if (window.US) { US.resume(); US.refresh(); }
  }
  function ask(p, i) {
    video.pause(); exitFull();
    $('vQText').textContent = p.q;
    $('vQOpts').innerHTML = p.options.map((o, k) => `<button class="vopt" data-k="${k}"><span>${k + 1}</span>${o}</button>`).join('');
    $('vQSay').hidden = true; $('vQGo').hidden = true;
    $('vQ').hidden = false; $('vQ').dataset.p = i;
  }
  function answer(k) {
    const i = +$('vQ').dataset.p, p = cur.pauses[i];
    if (!$('vQGo').hidden) return;
    const ok = k === p.correct;
    $('vQOpts').querySelectorAll('.vopt').forEach((b, j) => {
      b.disabled = true;
      b.classList.toggle('ok', j === p.correct); b.classList.toggle('bad', j === k && !ok);
    });
    $('vQAva').src = ok ? 'assets/x-wow.png' : 'assets/x-meh.png';
    $('vQMsg').textContent = ok ? p.ok : p.bad;
    $('vQSay').hidden = false; $('vQGo').hidden = false; $('vQGo').focus({ preventScroll: true });
    const s = load(), r = s[cur.id] || {};
    r.answers = r.answers || {}; r.answers[i] = ok; s[cur.id] = r; save(s);
  }
  function resume() { $('vQ').hidden = true; video.play().catch(() => {}); }

  video.addEventListener('timeupdate', () => {
    if (!cur || !$('vQ').hidden) return;
    cur.pauses.forEach((p, i) => { if (!done.has(i) && video.currentTime >= p.t && video.currentTime < p.t + 1.5) { done.add(i); ask(p, i); } });
    const s = load(), r = s[cur.id] || {};
    const pct = Math.round(100 * video.currentTime / (video.duration || cur.dur));
    if (pct > (r.pct || 0)) { r.pct = pct; s[cur.id] = r; save(s); }
  });
  video.addEventListener('ended', () => {
    const s = load(), r = s[cur.id] || {}; r.watched = true; r.pct = 100; s[cur.id] = r; save(s);
    exitFull(); $('vEnd').hidden = false;
  });
  $('vQOpts').onclick = e => { const b = e.target.closest('.vopt'); if (b) answer(+b.dataset.k); };
  $('vQGo').onclick = resume;
  $('vClose').onclick = close;
  $('vAgain').onclick = () => { $('vEnd').hidden = true; done = new Set(); video.currentTime = 0; video.play().catch(() => {}); };
  $('vPractice').onclick = () => { const code = topic; close(); window.US && US.startTopic(code, 5); };
  root.addEventListener('click', e => { if (e.target === root) close(); });
  document.addEventListener('keydown', e => {
    if (root.hidden) return;
    if (e.key === 'Escape') return close();
    if (!$('vQ').hidden) {
      if ($('vQGo').hidden && e.key >= '1' && e.key <= String(cur.pauses[+$('vQ').dataset.p].options.length)) answer(+e.key - 1);
      else if (!$('vQGo').hidden && e.key === 'Enter') { e.preventDefault(); resume(); }
    }
  });

  // Для тренажёра: есть ли видео у темы, просмотрено ли, подпись для плашки.
  window.VideoPlayer = {
    open,
    has: code => !!(VIDEOS[code] && VIDEOS[code].length),
    badge(code) {
      const list = VIDEOS[code]; if (!list || !list.length) return '';
      const s = load(), seen = list.every(v => s[v.id] && s[v.id].watched);
      const dur = list.reduce((a, v) => a + v.dur, 0);
      return `<span class="vid${seen ? ' seen' : ''}" data-video="${code}">${seen ? '✓ Видео' : '▶ Видео'} · ${fmt(dur)}</span>`;
    },
  };
  window.US && US.refresh();
})();
