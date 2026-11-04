const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { XMLParser, XMLValidator } = require('fast-xml-parser');
const { CATEGORIES, classify } = require('./classify');

/* ---------- default sources ---------- */
const DEFAULT_SOURCES = [
  { id: 'zoomit', name: 'زومیت', url: 'https://www.zoomit.ir/feed/', enabled: true },
  { id: 'digiato', name: 'دیجیاتو', url: 'https://digiato.com/feed', enabled: true },
  { id: 'digikala-mag', name: 'دیجی‌کالا مگ', url: 'https://www.digikala.com/mag/feed/', enabled: true },
  { id: 'gadgetnews', name: 'گجت‌نیوز', url: 'https://gadgetnews.net/feed/', enabled: true },
  { id: 'itiran', name: 'آی‌تی‌ایران', url: 'https://itiran.com/feed/', enabled: true },
  { id: 'tarfandestan', name: 'ترفندستان', url: 'https://www.tarfandestan.com/feed', enabled: true },
];
const DEFAULTS = { sources: DEFAULT_SOURCES, intervalMinutes: 20 };

/* ---------- storage ---------- */
const file = (n) => path.join(app.getPath('userData'), n);
const readJson = (n, d) => { try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch { return d; } };
const writeJson = (n, v) => { try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(file(n), JSON.stringify(v)); } catch { /* ignore */ } };

let settings = null;
let cache = null;
let win = null;

/* ---------- text helpers ---------- */
const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…', laquo: '«', raquo: '»', ndash: '–', mdash: '—' };
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
function clean(html) {
  let s = decode(String(html || '')).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  s = decode(s).replace(/\s+/g, ' ').trim();
  return s.replace(/(The post .*? appeared first on .*)$/i, '').replace(/(نوشته\s.*?(اولین بار|ابتدا)\sدر\s.*)$/, '').trim();
}
const firstImg = (h) => { const m = /<img[^>]+src=["']([^"']+)["']/i.exec(String(h || '')); return m ? m[1] : ''; };
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(16); };

/* ---------- feed parsing (RSS and Atom) ---------- */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});
const arr = (x) => (x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]);
const tx = (v) => {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return tx(v[0]);
  if (typeof v === 'object') return v['#text'] !== undefined ? String(v['#text']) : '';
  return String(v);
};

function parseFeed(xml, source) {
  if (XMLValidator.validate(xml) !== true) throw new Error('فید معتبر نیست');
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel || doc?.['rdf:RDF'] || doc?.feed || {};
  let nodes = arr(channel.item).concat(arr(doc?.['rdf:RDF']?.item));
  if (!nodes.length) nodes = arr(channel.entry);
  const out = [];
  for (const it of nodes) {
    let link = typeof it.link === 'string' ? it.link.trim() : '';
    if (!link) {
      const ls = arr(it.link);
      const alt = ls.find((l) => l && typeof l === 'object' && (!l['@_rel'] || l['@_rel'] === 'alternate')) || ls[0];
      link = alt ? (typeof alt === 'object' ? (alt['@_href'] || tx(alt)) : String(alt)) : tx(it.guid);
    }
    const title = clean(tx(it.title));
    if (!/^https?:\/\//i.test(link) || !title) continue;
    const body = tx(it['content:encoded']) || tx(it.content);
    const descRaw = tx(it.description) || tx(it.summary) || body;
    const summary = clean(descRaw).slice(0, 260);
    const date = Date.parse(tx(it.pubDate) || tx(it['dc:date']) || tx(it.published) || tx(it.updated)) || Date.now();
    let image = '';
    const enc = arr(it.enclosure).find((e) => e && typeof e === 'object' && (/^image/.test(e['@_type'] || '') || /\.(jpe?g|png|webp)/i.test(e['@_url'] || '')));
    if (enc) image = enc['@_url'] || '';
    if (!image) {
      const mc = arr(it['media:content'])[0] || arr(it['media:thumbnail'])[0];
      if (mc && typeof mc === 'object') image = mc['@_url'] || '';
    }
    if (!image) image = firstImg(body) || firstImg(descRaw);
    if (!/^https?:\/\//i.test(image)) image = '';
    const feedCategories = arr(it.category)
      .map((c) => clean(typeof c === 'object' ? (c['#text'] || c['@_term'] || '') : c))
      .filter(Boolean);
    out.push({
      id: hash(link), title, summary, link, image, date,
      source: source.name, sourceId: source.id,
      category: classify({ title, summary, feedCategories }),
    });
  }
  return out.sort((a, b) => b.date - a.date).slice(0, 60);
}

async function fetchText(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 MehdiNews/1.0',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('زمان اتصال تمام شد');
    throw e;
  } finally { clearTimeout(t); }
}

/* ---------- news state ---------- */
function snapshot() {
  const items = []; const statuses = [];
  for (const s of settings.sources) {
    const e = cache.bySource[s.id];
    statuses.push({ id: s.id, name: s.name, ok: e ? e.ok : null, error: e?.error || '', count: e?.items?.length || 0 });
    if (s.enabled && e?.items) items.push(...e.items);
  }
  const seen = new Set();
  const uniq = items.filter((i) => (seen.has(i.id) ? false : seen.add(i.id))).sort((a, b) => b.date - a.date);
  return { items: uniq.slice(0, 600), statuses, updatedAt: cache.updatedAt };
}

let busy = null;
function refresh() {
  if (busy) return busy;
  busy = (async () => {
    const active = settings.sources.filter((s) => s.enabled);
    const res = await Promise.allSettled(active.map(async (s) => parseFeed(await fetchText(s.url), s)));
    res.forEach((r, i) => {
      const id = active[i].id;
      if (r.status === 'fulfilled') cache.bySource[id] = { ok: true, items: r.value, at: Date.now() };
      else cache.bySource[id] = { ok: false, error: String(r.reason?.message || r.reason), items: cache.bySource[id]?.items || [], at: Date.now() };
    });
    if (res.some((r) => r.status === 'fulfilled')) cache.updatedAt = Date.now();
    writeJson('cache.json', cache);
    return snapshot();
  })().finally(() => { busy = null; });
  return busy;
}

function push(d) { if (win && !win.isDestroyed()) win.webContents.send('news:updated', d); }

let timer = null;
function schedule() {
  clearInterval(timer);
  timer = setInterval(async () => push(await refresh()), Math.max(5, settings.intervalMinutes || 20) * 60000);
}

/* ---------- IPC ---------- */
ipcMain.handle('news:get', () => snapshot());
ipcMain.handle('news:refresh', () => refresh());
ipcMain.handle('cats:get', () => CATEGORIES.map(({ id, name, color }) => ({ id, name, color })));
ipcMain.handle('settings:get', () => settings);
ipcMain.handle('settings:defaults', () => DEFAULTS);
ipcMain.handle('settings:set', (_e, next) => {
  const sources = (next?.sources || []).filter((s) => s && /^https?:\/\//i.test(String(s.url || '')))
    .map((s) => ({ id: String(s.id || hash(s.url)), name: String(s.name || s.url).slice(0, 60), url: String(s.url), enabled: s.enabled !== false }));
  settings = { sources, intervalMinutes: Math.min(240, Math.max(5, Number(next?.intervalMinutes) || 20)) };
  writeJson('settings.json', settings);
  schedule();
  return refresh();
});
ipcMain.handle('open', (_e, url) => { if (/^https?:\/\//i.test(String(url))) shell.openExternal(String(url)); });

/* ---------- window ---------- */
function createWindow() {
  const icon = path.join(__dirname, '..', 'build', 'icon.png');
  win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 820, minHeight: 560, title: 'MehdiNews', autoHideMenuBar: true,
    ...(fs.existsSync(icon) ? { icon } : {}),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url); } });
  win.on('focus', async () => { if (Date.now() - cache.updatedAt > 10 * 60000) push(await refresh()); });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    settings = Object.assign({}, DEFAULTS, readJson('settings.json', {}));
    cache = readJson('cache.json', { updatedAt: 0, bySource: {} });
    createWindow();
    schedule();
    refresh().then(push);
  });
  app.on('window-all-closed', () => app.quit());
}

module.exports = { parseFeed, clean };
