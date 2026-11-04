(() => {
  const $ = (s) => document.querySelector(s);
  const fa = (n) => Number(n).toLocaleString('fa-IR');
  const norm = (s) => String(s || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200d]/g, ' ');

  const state = { items: [], statuses: [], updatedAt: 0, cats: [], cat: 'all', source: '', q: '', loading: false };
  let settings = null;

  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };
  let saved = store.get('mn.saved', {});
  let read = new Set(store.get('mn.read', []));

  const catById = (id) => state.cats.find((c) => c.id === id) || { name: 'سایر', color: '#adb5bd' };

  /* ---------- theme ---------- */
  const savedTheme = store.get('mn.theme', null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $('#btn-theme').addEventListener('click', () => {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const cur = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('mn.theme', next);
  });

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });
  function ago(ts) {
    const diff = (ts - Date.now()) / 1000;
    const a = Math.abs(diff);
    if (a < 60) return 'همین حالا';
    if (a < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return new Date(ts).toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' });
  }
  function dayLabel(ts) {
    const d = new Date(ts); const t = new Date();
    const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((start(t) - start(d)) / 86400000);
    if (diff <= 0) return 'امروز';
    if (diff === 1) return 'دیروز';
    return d.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  /* ---------- sidebar ---------- */
  function renderCats() {
    const nav = $('#cats');
    nav.textContent = '';
    const counts = {};
    for (const i of state.items) counts[i.category] = (counts[i.category] || 0) + 1;
    const add = (id, name, color, n, extra) => {
      const b = el('button', 'cat' + (state.cat === id ? ' active' : '') + (extra ? ' ' + extra : ''));
      if (color) { const d = el('span', 'dot'); d.style.setProperty('--c', color); b.append(d); }
      b.append(el('span', '', name), el('span', 'n', fa(n)));
      b.addEventListener('click', () => { state.cat = id; renderCats(); renderList(); $('#list').scrollTop = 0; });
      nav.append(b);
    };
    add('all', 'همه اخبار', null, state.items.length);
    add('saved', 'ذخیره‌شده‌ها', null, Object.keys(saved).length);
    let first = true;
    for (const c of state.cats) {
      if (!counts[c.id]) continue;
      add(c.id, c.name, c.color, counts[c.id], first ? 'sep' : '');
      first = false;
    }
  }

  /* ---------- list ---------- */
  function visible() {
    let list = state.cat === 'saved' ? Object.values(saved).sort((a, b) => b.date - a.date) : state.items;
    if (state.cat !== 'all' && state.cat !== 'saved') list = list.filter((i) => i.category === state.cat);
    if (state.source) list = list.filter((i) => i.sourceId === state.source);
    const q = norm(state.q).trim();
    if (q) list = list.filter((i) => norm(i.title + ' ' + i.summary).includes(q));
    return list;
  }

  function renderItem(i, lead) {
    const c = catById(i.category);
    const row = el('article', 'item' + (lead ? ' lead' : '') + (i.image ? '' : ' noimg') + (read.has(i.id) ? ' read' : ''));
    if (i.image) {
      const img = el('img', 'thumb');
      img.src = i.image; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => { img.remove(); row.classList.add('noimg'); });
      row.append(img);
    }
    const body = el('div', 'body');
    const meta = el('div', 'meta');
    const chip = el('span', 'chip'); const dot = el('span', 'dot'); dot.style.setProperty('--c', c.color);
    chip.append(dot, document.createTextNode(c.name));
    const save = el('button', 'save' + (saved[i.id] ? ' on' : ''), saved[i.id] ? '★ ذخیره شد' : '☆ ذخیره');
    save.title = 'ذخیره برای بعد';
    save.addEventListener('click', (e) => {
      e.stopPropagation();
      if (saved[i.id]) delete saved[i.id]; else saved[i.id] = i;
      store.set('mn.saved', saved);
      renderCats();
      if (state.cat === 'saved') renderList(); else { save.classList.toggle('on', !!saved[i.id]); save.textContent = saved[i.id] ? '★ ذخیره شد' : '☆ ذخیره'; }
    });
    meta.append(chip, el('span', '', i.source), el('span', '', ago(i.date)), save);

    const a = el('a', 'title', i.title);
    a.href = i.link; a.rel = 'noreferrer';
    const open = (e) => {
      e.preventDefault();
      window.api.open(i.link);
      if (!read.has(i.id)) { read.add(i.id); store.set('mn.read', [...read].slice(-3000)); }
      row.classList.add('read');
    };
    a.addEventListener('click', open);
    body.append(meta, a);
    if (i.summary) body.append(el('p', 'sum', i.summary));
    row.append(body);
    return row;
  }

  function renderList() {
    const box = $('#list');
    box.textContent = '';
    const list = visible();
    if (!list.length) {
      const e = el('div', 'empty');
      const allFailed = !state.items.length && state.statuses.length && state.statuses.every((s) => s.ok === false);
      if (state.loading && !state.items.length) e.textContent = 'در حال دریافت اخبار…';
      else if (allFailed) {
        e.append(el('div', '', 'اتصال به منابع خبری برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.'));
        const b = el('button', 'primary', 'تلاش دوباره'); b.addEventListener('click', doRefresh); e.append(b);
      } else if (state.cat === 'saved') e.textContent = 'هنوز خبری ذخیره نکرده‌اید. با دکمه «ذخیره» زیر هر خبر، آن را اینجا نگه دارید.';
      else if (!state.items.length) e.textContent = 'هنوز خبری دریافت نشده است. دکمه «به‌روزرسانی» را بزنید.';
      else e.textContent = 'خبری پیدا نشد. عبارت دیگری را جستجو کنید یا فیلترها را بردارید.';
      box.append(e);
      return;
    }
    let lastDay = '';
    list.slice(0, 250).forEach((i, idx) => {
      const day = dayLabel(i.date);
      if (day !== lastDay) { box.append(el('h3', 'day', day)); lastDay = day; }
      box.append(renderItem(i, idx === 0 && !state.q && !!i.image));
    });
  }

  function renderStatus() {
    const s = $('#status');
    if (state.loading) { s.textContent = 'در حال به‌روزرسانی اخبار…'; return; }
    const failed = state.statuses.filter((x) => x.ok === false).length;
    let t = state.updatedAt ? 'آخرین به‌روزرسانی: ' + new Date(state.updatedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) + ' — ' + fa(visible().length) + ' خبر' : '';
    if (failed) t += (t ? ' — ' : '') + fa(failed) + ' منبع در دسترس نبود';
    s.textContent = t;
  }

  function renderSources() {
    const sel = $('#src');
    const cur = state.source;
    sel.textContent = '';
    sel.append(new Option('همه منابع', ''));
    for (const s of (settings?.sources || []).filter((x) => x.enabled)) sel.append(new Option(s.name, s.id));
    sel.value = [...sel.options].some((o) => o.value === cur) ? cur : '';
    state.source = sel.value;
  }

  function apply(data) {
    if (!data) return;
    state.items = data.items || [];
    state.statuses = data.statuses || [];
    state.updatedAt = data.updatedAt || 0;
    renderCats(); renderList(); renderStatus();
  }

  async function doRefresh() {
    if (state.loading) return;
    state.loading = true;
    const b = $('#btn-refresh'); b.disabled = true; b.textContent = 'در حال دریافت…';
    renderStatus(); if (!state.items.length) renderList();
    try { apply(await window.api.refresh()); }
    finally { state.loading = false; b.disabled = false; b.textContent = 'به‌روزرسانی'; renderStatus(); renderList(); }
  }

  /* ---------- settings dialog ---------- */
  let draft = null;
  function renderDraft() {
    const ul = $('#sources');
    ul.textContent = '';
    draft.sources.forEach((s, idx) => {
      const li = el('li');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = s.enabled;
      cb.addEventListener('change', () => { s.enabled = cb.checked; });
      const nm = el('span', 'nm', s.name);
      const st = state.statuses.find((x) => x.id === s.id);
      const stEl = el('span', 'st' + (st?.ok === true ? ' good' : st?.ok === false ? ' bad' : ''),
        st?.ok === true ? 'فعال — ' + fa(st.count) + ' خبر' : st?.ok === false ? 'خطا: ' + st.error : '');
      const del = el('button', '', '✕'); del.title = 'حذف منبع';
      del.addEventListener('click', () => { draft.sources.splice(idx, 1); renderDraft(); });
      li.append(cb, nm, stEl, del);
      ul.append(li);
    });
    $('#interval').value = String(draft.intervalMinutes);
    if ($('#interval').value !== String(draft.intervalMinutes)) $('#interval').value = '20';
  }
  $('#btn-settings').addEventListener('click', async () => {
    settings = await window.api.getSettings();
    draft = JSON.parse(JSON.stringify(settings));
    renderDraft(); $('#dlg').showModal();
  });
  $('#cancel-btn').addEventListener('click', () => $('#dlg').close());
  $('#add-btn').addEventListener('click', () => {
    const url = $('#add-url').value.trim(); const name = $('#add-name').value.trim();
    if (!/^https?:\/\/.+/i.test(url)) { $('#add-url').focus(); return; }
    draft.sources.push({ id: 'c' + Date.now().toString(36), name: name || new URL(url).hostname, url, enabled: true });
    $('#add-name').value = ''; $('#add-url').value = ''; renderDraft();
  });
  $('#reset-btn').addEventListener('click', async () => { draft = JSON.parse(JSON.stringify(await window.api.getDefaults())); renderDraft(); });
  $('#save-btn').addEventListener('click', async () => {
    draft.intervalMinutes = Number($('#interval').value) || 20;
    $('#dlg').close();
    state.loading = true; renderStatus();
    try {
      apply(await window.api.setSettings(draft));
      settings = await window.api.getSettings();
      renderSources();
    } finally { state.loading = false; renderStatus(); renderList(); }
  });

  /* ---------- wiring ---------- */
  let qt;
  $('#q').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; renderList(); renderStatus(); }, 150); });
  $('#src').addEventListener('change', (e) => { state.source = e.target.value; renderList(); renderStatus(); });
  $('#btn-refresh').addEventListener('click', doRefresh);
  window.api.onUpdated((d) => { apply(d); });

  (async function init() {
    state.cats = await window.api.getCategories();
    settings = await window.api.getSettings();
    renderSources();
    apply(await window.api.getNews());
    renderCats(); renderList();
  })();
})();
