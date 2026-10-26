'use strict';
/* ===== utilidades ===== */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const pad = n => String(n).padStart(2, '0');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAYS_S = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_S = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const COLORS = ['#007AFF', '#AF52DE', '#34C759', '#FF9500', '#FF3B30', '#5AC8FA', '#FF2D55', '#5856D6', '#FFCC00', '#8E8E93'];
const HOUR = 52;
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fromYmd = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const todayYmd = () => ymd(new Date());
const addDays = (s, n) => { const d = fromYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((fromYmd(b) - fromYmd(a)) / 86400000);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const minutes = t => { if (!t) return null; const p = t.split(':').map(Number); return p[0] * 60 + p[1]; };
const addMin = (t, n) => { const m = Math.max(0, Math.min(1439, minutes(t) + n)); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const ACCENTS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(ACCENTS, '');
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const fmtLong = s => { const d = fromYmd(s); return DAYS[d.getDay()] + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()]; };
const fmtShort = s => { const d = fromYmd(s); return d.getDate() + ' ' + MONTHS_S[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); };
function relDay(s) { if (!s) return 'Sin fecha'; const n = diffDays(todayYmd(), s); if (n === 0) return 'Hoy'; if (n === 1) return 'Mañana'; if (n === -1) return 'Ayer'; if (n > 1 && n < 7) return cap(DAYS[fromYmd(s).getDay()]); return fmtShort(s); }
const ico = n => '<svg><use href="#i-' + n + '"/></svg>';

/* ===== datos ===== */
const KEY = 'agenda.v1';
const DEFAULT_LISTS = [
  { id: 'inbox', name: 'Entrada', color: '#8E8E93' },
  { id: 'trabajo', name: 'Trabajo', color: '#007AFF' },
  { id: 'reuniones', name: 'Reuniones', color: '#AF52DE' },
  { id: 'personal', name: 'Personal', color: '#34C759' }
];
const REMINDERS = [[null, 'Sin aviso'], [0, 'A la hora'], [5, '5 min antes'], [10, '10 min antes'], [15, '15 min antes'], [30, '30 min antes'], [60, '1 hora antes'], [120, '2 horas antes'], [1440, '1 día antes']];
const REPEATS = [['none', 'No se repite'], ['daily', 'Cada día'], ['weekdays', 'Días laborables'], ['weekly', 'Cada semana'], ['biweekly', 'Cada dos semanas'], ['monthly', 'Cada mes'], ['yearly', 'Cada año']];
const remLabel = m => { const r = REMINDERS.find(x => x[0] === m); return r ? r[1] : m + ' min antes'; };
const state = { items: [], lists: [], settings: { theme: 'auto', sound: true, name: '' }, fired: {}, view: 'today', listId: null, sel: todayYmd(), calMode: 'month', cursor: todayYmd(), miniCursor: todayYmd(), filter: 'all' };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); state.items = d.items || []; state.lists = d.lists && d.lists.length ? d.lists : DEFAULT_LISTS.map(l => Object.assign({}, l)); Object.assign(state.settings, d.settings || {}); state.fired = d.fired || {}; }
    else { state.lists = DEFAULT_LISTS.map(l => Object.assign({}, l)); seed(); save(); }
  } catch (e) { console.error(e); state.lists = DEFAULT_LISTS.map(l => Object.assign({}, l)); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, items: state.items, lists: state.lists, settings: state.settings, fired: state.fired })); } catch (e) { toast('No se pudo guardar', String(e), 'info'); } }
function newItem(p) { return Object.assign({ id: uid(), type: 'task', title: '', notes: '', list: 'inbox', date: null, time: null, end: null, priority: 0, done: false, doneAt: null, doneDates: {}, reminder: null, repeat: 'none', location: '', created: Date.now(), updated: Date.now() }, p || {}); }
function seed() {
  const t = todayYmd();
  state.items = [
    newItem({ title: 'Bienvenido a Clanedario 👋', notes: 'Escribe arriba en lenguaje natural: «Reunión con Dani mañana 10:30 #trabajo !alta». Entiende hoy, mañana, lunes…, 15/11, «de 10 a 11», #lista, !alta / !media / !baja, «cada semana» y «avisa 30 min antes».', date: t, list: 'inbox', priority: 1 }),
    newItem({ type: 'event', title: 'Reunión de ejemplo', date: addDays(t, 1), time: '10:30', end: '11:30', list: 'reuniones', location: 'Oficina', reminder: 15, notes: 'Puedes borrarla sin miedo.' }),
    newItem({ title: 'Revisar pendientes de la semana', date: addDays(t, 2), time: '09:00', list: 'trabajo', priority: 2, reminder: 0 })
  ];
}
const byId = id => state.items.find(i => i.id === id);
const listOf = id => state.lists.find(l => l.id === id) || state.lists[0] || { id: 'inbox', name: 'Entrada', color: '#8E8E93' };
const isRep = it => !!(it.repeat && it.repeat !== 'none');
function occursOn(it, date) {
  if (!it.date || !date) return false;
  if (it.date === date) return true;
  if (!isRep(it) || date < it.date) return false;
  const a = fromYmd(it.date), b = fromYmd(date);
  switch (it.repeat) {
    case 'daily': return true;
    case 'weekdays': return b.getDay() >= 1 && b.getDay() <= 5;
    case 'weekly': return a.getDay() === b.getDay();
    case 'biweekly': return a.getDay() === b.getDay() && diffDays(it.date, date) % 14 === 0;
    case 'monthly': return a.getDate() === b.getDate();
    case 'yearly': return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
  }
  return false;
}
const isDone = (it, date) => isRep(it) ? !!((it.doneDates || {})[date]) : !!it.done;
const occ = (it, date) => Object.assign({}, it, { occ: date, isDone: isDone(it, date) });
function sortOcc(a, b) { const ta = a.time ? minutes(a.time) : 9999, tb = b.time ? minutes(b.time) : 9999; if (a.isDone !== b.isDone) return a.isDone ? 1 : -1; if (ta !== tb) return ta - tb; return (b.priority || 0) - (a.priority || 0); }
function sortList(a, b) { const da = a.occ || '9999', db = b.occ || '9999'; if (da !== db) return da < db ? -1 : 1; return sortOcc(a, b); }
const itemsOn = date => state.items.filter(it => occursOn(it, date)).map(it => occ(it, date)).sort(sortOcc);
const overdue = () => { const t = todayYmd(); return state.items.filter(it => it.date && it.date < t && !isRep(it) && !it.done && it.type === 'task').map(it => occ(it, it.date)).sort(sortList); };
const undated = () => state.items.filter(it => !it.date && !it.done).map(it => occ(it, null)).sort((a, b) => (b.priority || 0) - (a.priority || 0) || b.created - a.created);
const pendingAll = () => state.items.filter(it => isRep(it) || !it.done);
function nextOcc(it) { if (!it.date) return null; if (!isRep(it)) return it.date; const t = todayYmd(); let d = it.date > t ? it.date : t; for (let i = 0; i < 400; i++) { if (occursOn(it, d) && !isDone(it, d)) return d; d = addDays(d, 1); } return it.date; }

/* ===== añadir rápido en lenguaje natural ===== */
const WD = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
function nextWeekday(name, allowToday) { const w = WD[norm(name)]; if (w == null) return null; const d = new Date(); let n = (w - d.getDay() + 7) % 7; if (n === 0 && !allowToday) n = 7; d.setDate(d.getDate() + n); return ymd(d); }
function parseQuick(text) {
  const r = { type: 'task', title: '', list: 'inbox', priority: 0, date: null, time: null, end: null, repeat: 'none', reminder: null, location: '' };
  let s = ' ' + text.replace(/[ ]+/g, ' ').trim() + ' ';
  const H = (h, m) => pad(Number(h)) + ':' + (m || '00');
  s = s.replace(/ #([^ ]+)/g, (m, name) => { const n = norm(name); const l = state.lists.find(x => norm(x.name) === n) || state.lists.find(x => norm(x.name).startsWith(n)); if (l) { r.list = l.id; return ' '; } return m; });
  s = s.replace(/ !(alta|media|baja|1|2|3)(?= )/gi, (m, p) => { p = p.toLowerCase(); r.priority = (p === 'alta' || p === '3') ? 3 : (p === 'media' || p === '2') ? 2 : 1; return ' '; });
  s = s.replace(/ (?:avisa(?:r|me)?|recuerda(?:me)?|recuérda(?:me)?|aviso) ([0-9]{1,3}) ?(min|minutos|m|h|hora|horas|dia|día|dias|días)? antes(?= )/i, (m, n, u) => { u = norm(u || 'min'); r.reminder = Number(n) * (u.startsWith('h') ? 60 : u.startsWith('d') ? 1440 : 1); return ' '; });
  s = s.replace(/ (?:cada|todos los|todas las) (dia|día|dias|días|semana|semanas|mes|meses|año|años|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|laborables|quince dias|quince días|dos semanas)(?= )/gi, (m, b) => {
    b = norm(b);
    if (b.startsWith('dia')) r.repeat = 'daily'; else if (b.startsWith('semana')) r.repeat = 'weekly'; else if (b.startsWith('mes')) r.repeat = 'monthly'; else if (b.startsWith('ano')) r.repeat = 'yearly'; else if (b === 'laborables') r.repeat = 'weekdays'; else if (b.startsWith('quince') || b.startsWith('dos')) r.repeat = 'biweekly'; else { r.repeat = 'weekly'; r.date = nextWeekday(b, true); }
    return ' ';
  });
  s = s.replace(/ (hoy|mañana|pasado mañana)(?= )/i, (m, w) => { w = w.toLowerCase(); r.date = w === 'hoy' ? todayYmd() : w === 'mañana' ? addDays(todayYmd(), 1) : addDays(todayYmd(), 2); return ' '; });
  if (!r.date) s = s.replace(/ (?:el |este |proximo |próximo )?(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)(?= )/i, (m, w) => { r.date = nextWeekday(w, false); return ' '; });
  if (!r.date) s = s.replace(/ (?:el )?([0-9]{1,2})[/-]([0-9]{1,2})(?:[/-]([0-9]{2,4}))?(?= )/, (m, d, mo, y) => { if (Number(mo) > 12 || Number(d) > 31) return m; let yy = y ? Number(y) : new Date().getFullYear(); if (yy < 100) yy += 2000; const dt = new Date(yy, Number(mo) - 1, Number(d)); if (!y && ymd(dt) < todayYmd()) dt.setFullYear(yy + 1); r.date = ymd(dt); return ' '; });
  if (!r.date) s = s.replace(/ (?:el )?([0-9]{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?: de ([0-9]{4}))?(?= )/i, (m, d, mo, y) => { const mi = MONTHS.indexOf(norm(mo) === 'setiembre' ? 'septiembre' : mo.toLowerCase()); const yy = y ? Number(y) : new Date().getFullYear(); const dt = new Date(yy, mi, Number(d)); if (!y && ymd(dt) < todayYmd()) dt.setFullYear(yy + 1); r.date = ymd(dt); return ' '; });
  if (!r.date) s = s.replace(/ el ([0-9]{1,2})(?= )/i, (m, d) => { if (Number(d) > 31) return m; const now = new Date(); const dt = new Date(now.getFullYear(), now.getMonth(), Number(d)); if (ymd(dt) < todayYmd()) dt.setMonth(dt.getMonth() + 1); r.date = ymd(dt); return ' '; });
  s = s.replace(/ de ([0-9]{1,2})(?:[:.h]([0-9]{2}))? ?(?:a|hasta|-) ?([0-9]{1,2})(?:[:.h]([0-9]{2}))?(?: ?h)?(?= )/i, (m, h1, m1, h2, m2) => { if (Number(h1) > 23 || Number(h2) > 23) return m; r.time = H(h1, m1); r.end = H(h2, m2); return ' '; });
  if (!r.time) s = s.replace(/ ([0-9]{1,2})[:.h]([0-9]{2}) ?- ?([0-9]{1,2})[:.h]([0-9]{2})(?= )/, (m, h1, m1, h2, m2) => { if (Number(h1) > 23 || Number(h2) > 23) return m; r.time = H(h1, m1); r.end = H(h2, m2); return ' '; });
  if (!r.time) s = s.replace(/ (?:a las? )?([0-9]{1,2})[:.]([0-9]{2})(?: ?h)?(?= )/i, (m, h, mm) => { if (Number(h) > 23 || Number(mm) > 59) return m; r.time = H(h, mm); return ' '; });
  if (!r.time) s = s.replace(/ (?:a las? ([0-9]{1,2})|([0-9]{1,2})h(?:([0-9]{2}))?)(?= )/i, (m, h1, h2, mm) => { const h = Number(h1 || h2); if (h > 23 || (h2 && h < 6)) return m; r.time = H(h, mm); return ' '; });
  s = s.replace(/ (?:durante )?([0-9]{1,2}) ?(h|horas?|min|minutos?)(?= )/i, (m, n, u) => { if (!r.time) return m; r.end = addMin(r.time, u.startsWith('h') ? Number(n) * 60 : Number(n)); return ' '; });
  if (r.end || /(reuni|cita|llamada|visita|videollamada|junta|entrevista|comida|cena|consulta|medico|dentista|evento|presentacion|firma|teams|zoom|meet)/.test(norm(s))) r.type = 'event';
  r.title = cap(s.replace(/[ ]+/g, ' ').trim());
  if (r.type === 'event' && r.time && !r.end) r.end = addMin(r.time, 60);
  if (r.reminder == null && r.time) r.reminder = r.type === 'event' ? 15 : 0;
  if (r.type === 'event' && r.list === 'inbox' && state.lists.some(l => l.id === 'reuniones')) r.list = 'reuniones';
  return r;
}
function quickChips(r) {
  const c = [];
  if (r.type === 'event') c.push(['purple', ico('users') + 'Reunión']);
  if (r.date) c.push(['blue', ico('cal') + relDay(r.date)]);
  if (r.time) c.push(['blue', ico('clock') + r.time + (r.end ? '–' + r.end : '')]);
  if (r.list !== 'inbox') { const l = listOf(r.list); c.push(['', '<i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + l.color + '"></i>' + esc(l.name)]); }
  if (r.priority) c.push([r.priority === 3 ? 'red' : r.priority === 2 ? 'orange' : 'blue', ico('flag') + ['', 'Baja', 'Media', 'Alta'][r.priority]]);
  if (r.repeat !== 'none') c.push(['green', ico('repeat') + REPEATS.find(x => x[0] === r.repeat)[1]]);
  if (r.reminder != null) c.push(['orange', ico('bell') + remLabel(r.reminder)]);
  return c;
}
function renderQuickChips() { const v = $('#quickInput').value.trim(); const c = $('#quickChips'); if (!v) { c.innerHTML = ''; return; } c.innerHTML = quickChips(parseQuick(v)).map(x => '<span class="chip ' + x[0] + '">' + x[1] + '</span>').join(''); }
function quickAdd() {
  const inp = $('#quickInput'); const t = inp.value.trim(); if (!t) return;
  const r = parseQuick(t); if (!r.title) { toast('Falta el título', 'Escribe qué quieres añadir', 'info'); return; }
  const it = newItem(r);
  if (!it.date && state.view === 'calendar') it.date = state.sel;
  if (state.view === 'list' && state.listId && r.list === 'inbox') it.list = state.listId;
  state.items.push(it); save(); inp.value = ''; renderQuickChips(); render();
  toast(it.type === 'event' ? 'Reunión añadida' : 'Tarea añadida', it.title + (it.date ? ' · ' + relDay(it.date) + (it.time ? ' ' + it.time : '') : ''), 'ok', 2500); chime('done');
}

/* ===== filas y vistas ===== */
function rowHtml(o, opts) {
  opts = opts || {};
  const l = listOf(o.list); const meta = []; const t = todayYmd();
  if (!opts.noDate && o.occ) meta.push('<span' + (o.occ < t && !o.isDone && o.type === 'task' ? ' style="color:var(--red);font-weight:600"' : '') + '>' + relDay(o.occ) + '</span>');
  if (o.time) meta.push(ico('clock') + o.time + (o.end ? '–' + o.end : ''));
  meta.push('<i class="ldot" style="background:' + l.color + '"></i>' + esc(l.name));
  if (o.location) meta.push(ico('pin') + esc(o.location));
  if (isRep(o)) meta.push(ico('repeat'));
  if (o.reminder != null) meta.push(ico('bell'));
  if (o.notes) meta.push(esc(o.notes.slice(0, 70)));
  const past = o.occ === t && !o.isDone && o.time && (o.end ? minutes(o.end) : minutes(o.time) + 30) < nowMin();
  return '<div class="row' + (o.isDone ? ' done' : '') + (o.type === 'event' ? ' event' : '') + (past ? ' past' : '') + '" data-id="' + o.id + '" data-occ="' + (o.occ || '') + '" draggable="true">' +
    '<button class="chk p' + (o.priority || 0) + '" data-act="toggle" title="Completar">' + ico('check') + '</button>' +
    '<div class="row-body" data-act="open"><div class="row-title">' + esc(o.title) + '</div><div class="row-meta">' + meta.join('<span>·</span>') + '</div></div>' +
    '<div class="row-right">' + (o.priority ? '<svg class="flag p' + o.priority + '"><use href="#i-flag"/></svg>' : '') + '<button class="icon-btn sm del" data-act="menu" title="Opciones">' + ico('more') + '</button></div></div>';
}
function timelineHtml(date) {
  const items = itemsOn(date).filter(o => o.time); const isToday = date === todayYmd();
  if (!items.length) return '<div class="empty"><b>🌤️</b>Nada con hora para ' + (isToday ? 'hoy' : 'este día') + '</div>';
  const nm = nowMin(); let nextDone = false; let nowDrawn = !isToday; let out = '<div class="tl">';
  const hhmm = pad(Math.floor(nm / 60)) + ':' + pad(nm % 60);
  for (const o of items) {
    const st = minutes(o.time); const en = o.end ? minutes(o.end) : st + 30;
    if (!nowDrawn && st > nm) { out += '<div class="nowline">' + hhmm + '</div>'; nowDrawn = true; }
    const isNext = isToday && !nextDone && !o.isDone && en >= nm; if (isNext) nextDone = true;
    const l = listOf(o.list);
    out += '<div class="row' + (o.isDone ? ' done' : '') + (isNext ? ' next' : '') + (o.type === 'event' ? ' event' : '') + (isToday && !o.isDone && en < nm ? ' past' : '') + '" data-id="' + o.id + '" data-occ="' + date + '" draggable="true">' +
      '<div class="time"><b>' + o.time + '</b>' + (o.end ? '<small>' + o.end + '</small>' : '') + '</div><div class="bar" style="background:' + l.color + '"></div>' +
      '<button class="chk p' + (o.priority || 0) + '" data-act="toggle" title="Completar">' + ico('check') + '</button>' +
      '<div class="row-body" data-act="open"><div class="row-title">' + esc(o.title) + '</div><div class="row-meta">' + [o.type === 'event' ? ico('users') + 'Reunión' : 'Tarea', esc(l.name), o.location ? ico('pin') + esc(o.location) : '', o.reminder != null ? ico('bell') + remLabel(o.reminder) : ''].filter(Boolean).join('<span>·</span>') + '</div></div>' +
      '<div class="row-right"><button class="icon-btn sm del" data-act="menu" title="Opciones">' + ico('more') + '</button></div></div>';
  }
  if (!nowDrawn) out += '<div class="nowline">' + hhmm + '</div>';
  return out + '</div>';
}
const stat = (c, n, label, view) => '<div class="stat ' + c + '" data-act="go" data-view="' + view + '"><b>' + n + '</b><span>' + label + '</span></div>';
function viewToday() {
  const t = todayYmd(); const items = itemsOn(t); const od = overdue(); const und = undated();
  const h = new Date().getHours(); const greet = h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const name = state.settings.name ? ', ' + esc(state.settings.name) : '';
  const doneN = items.filter(o => o.isDone).length; const pct = items.length ? Math.round(doneN * 100 / items.length) : 0;
  const meetings = items.filter(o => o.type === 'event'); const tasks = items.filter(o => o.type === 'task');
  let week = 0; for (let i = 0; i < 7; i++) week += itemsOn(addDays(t, i)).filter(o => !o.isDone).length;
  const sub = tasks.filter(o => !o.isDone).length + ' tareas pendientes · ' + meetings.length + (meetings.length === 1 ? ' reunión' : ' reuniones');
  const kpi = (c, n, label, view, filter) => '<div class="kpi ' + c + '" data-act="go" data-view="' + view + '"' + (filter ? ' data-filter="' + filter + '"' : '') + '><b>' + n + '</b>' + label + '</div>';
  let html = '<div class="hero"><div><div class="eyebrow">' + fmtLong(t) + '</div><h1>' + greet + name + '</h1><p class="sub">' + sub + '</p></div>' +
    '<div class="kpis">' + kpi('red', od.length, 'vencidas', 'all', 'overdue') + kpi('blue', items.filter(o => !o.isDone).length, 'para hoy', 'today') + kpi('purple', week, 'esta semana', 'upcoming') + kpi('green', pendingAll().length, 'pendientes', 'all', 'all') + '</div>' +
    '<div class="ring" style="--p:' + pct + '" title="Completado hoy"><span>' + (items.length ? pct + '%' : '—') + '</span><small>hoy</small></div></div>';
  html += '<div class="grid3"><section class="card c1"><div class="card-head"><h2>Agenda de hoy <span class="n">' + items.filter(o => o.time).length + '</span></h2><button class="btn sm" data-act="new-event">' + ico('plus') + 'Reunión</button></div>' + timelineHtml(t) + '</section>';
  html += '<section class="card c2"><div class="card-head"><h2>Tareas</h2><button class="btn sm" data-act="new-task">' + ico('plus') + 'Tarea</button></div>';
  if (od.length) html += '<div class="group-title red">Vencidas <span>' + od.length + '</span></div>' + od.map(o => rowHtml(o)).join('');
  html += '<div class="group-title">Hoy <span>' + tasks.length + '</span></div>' + (tasks.length ? tasks.map(o => rowHtml(o, { noDate: true })).join('') : '<div class="empty">Sin tareas para hoy</div>');
  if (und.length) html += '<div class="group-title">Sin fecha <span>' + und.length + '</span></div>' + und.slice(0, 5).map(o => rowHtml(o)).join('') + (und.length > 5 ? '<button class="btn sm ghost" data-act="go" data-view="all" data-filter="undated">Ver las ' + und.length + '</button>' : '');
  html += '</section><section class="card c3 upc"><div class="card-head"><h2>Próximos días</h2><button class="btn sm ghost" data-act="go" data-view="upcoming">Ver todo</button></div>';
  let any = false;
  for (let i = 1; i <= 7; i++) { const d = addDays(t, i); const its = itemsOn(d).filter(o => !o.isDone); if (!its.length) continue; any = true; html += '<div class="dh">' + relDay(d) + ' <span>' + fmtShort(d) + '</span></div>' + its.map(o => rowHtml(o, { noDate: true })).join(''); }
  if (!any) html += '<div class="empty">Nada en los próximos 7 días</div>';
  return html + '</section></div>';
}
function viewUpcoming() {
  const t = todayYmd(); let html = '<div class="hero"><div><div class="eyebrow">Próximos 30 días</div><h1>Próximos</h1><p class="sub">Todo lo que viene, día a día</p></div></div>';
  const od = overdue(); if (od.length) html += '<div class="card" style="margin-bottom:14px"><div class="group-title red" style="padding-top:0">Vencidas <span>' + od.length + '</span></div>' + od.map(o => rowHtml(o)).join('') + '</div>';
  for (let i = 0; i < 30; i++) {
    const d = addDays(t, i); const items = itemsOn(d); if (!items.length && i > 6) continue;
    html += '<div class="day-block" data-date="' + d + '"><div class="dh' + (i === 0 ? ' today' : '') + '"><b>' + relDay(d) + '</b><span>' + fmtLong(d) + '</span><button class="btn sm ghost add" data-act="new-on" data-date="' + d + '">' + ico('plus') + 'Añadir</button></div>' +
      (items.length ? '<div class="card" style="padding:6px">' + items.map(o => rowHtml(o, { noDate: true })).join('') + '</div>' : '<div class="empty" style="padding:4px 10px 10px;text-align:left">Nada previsto</div>') + '</div>';
  }
  return html;
}

/* ===== calendario ===== */
function monthStart(s) { const d = fromYmd(s); d.setDate(1); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return ymd(d); }
function weekStart(s) { const d = fromYmd(s); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return ymd(d); }
function shiftMonth(s, n) { const d = fromYmd(s); d.setDate(1); d.setMonth(d.getMonth() + n); return ymd(d); }
function shiftCal(n) { state.cursor = state.calMode === 'month' ? shiftMonth(state.cursor, n) : addDays(state.cursor, 7 * n); render(); }
function weekTitle() { const a = weekStart(state.cursor), b = addDays(a, 6); const da = fromYmd(a), db = fromYmd(b); return da.getDate() + (da.getMonth() !== db.getMonth() ? ' ' + MONTHS_S[da.getMonth()] : '') + ' – ' + db.getDate() + ' ' + MONTHS_S[db.getMonth()] + ' ' + db.getFullYear(); }
function viewCalendar() {
  const c = fromYmd(state.cursor); const title = state.calMode === 'month' ? cap(MONTHS[c.getMonth()]) + ' ' + c.getFullYear() : weekTitle();
  let html = '<div class="cal"><div><div class="cal-head"><button class="icon-btn" data-act="cal-prev" title="Anterior">' + ico('left') + '</button><button class="icon-btn" data-act="cal-next" title="Siguiente">' + ico('right') + '</button><h1>' + title + '</h1><button class="btn sm" data-act="cal-today">Hoy</button><span style="flex:1"></span><div class="seg"><button class="' + (state.calMode === 'month' ? 'on' : '') + '" data-act="cal-mode" data-v="month">Mes</button><button class="' + (state.calMode === 'week' ? 'on' : '') + '" data-act="cal-mode" data-v="week">Semana</button></div></div>';
  html += state.calMode === 'month' ? monthHtml() : weekHtml();
  return html + '</div>' + dayPanelHtml(state.sel) + '</div>';
}
function chipHtml(o) { const l = listOf(o.list); return '<div class="cchip' + (o.isDone ? ' done' : '') + (o.type === 'event' ? ' ev' : '') + '" style="--c:' + l.color + '" data-act="open" data-id="' + o.id + '" data-occ="' + o.occ + '" draggable="true" title="' + esc(o.title) + '">' + (o.time ? '<b>' + o.time + '</b> ' : '') + esc(o.title) + '</div>'; }
function monthHtml() {
  const c = fromYmd(state.cursor); const m = c.getMonth(); let d = monthStart(state.cursor); const t = todayYmd();
  let html = '<div class="cal-grid">' + DAYS_S.slice(1).concat(DAYS_S[0]).map(x => '<div class="cal-dow">' + x + '</div>').join('');
  for (let i = 0; i < 42; i++) {
    const dd = fromYmd(d); if (i >= 35 && dd.getMonth() !== m) break;
    const items = itemsOn(d); const cls = ['cal-cell']; if (dd.getMonth() !== m) cls.push('other'); if (d === t) cls.push('today'); if (d === state.sel) cls.push('sel');
    html += '<div class="' + cls.join(' ') + '" data-act="cal-sel" data-date="' + d + '"><div class="cal-n">' + dd.getDate() + '</div>' + items.slice(0, 3).map(chipHtml).join('') + (items.length > 3 ? '<div class="cmore">+' + (items.length - 3) + ' más</div>' : '') + '</div>';
    d = addDays(d, 1);
  }
  return html + '</div>';
}
function weekHtml() {
  const a = weekStart(state.cursor); const t = todayYmd(); const days = []; for (let i = 0; i < 7; i++) days.push(addDays(a, i));
  let html = '<div class="week"><div class="wh"></div>' + days.map(d => { const dd = fromYmd(d); return '<div class="wh' + (d === t ? ' today' : '') + '" data-act="cal-sel" data-date="' + d + '"><small>' + DAYS_S[dd.getDay()] + '</small><b>' + dd.getDate() + '</b></div>'; }).join('');
  html += '<div class="allday"></div>' + days.map(d => '<div class="allday" data-act="cal-sel" data-date="' + d + '">' + itemsOn(d).filter(o => !o.time).map(chipHtml).join('') + '</div>').join('');
  html += '<div class="week-scroll" id="weekScroll"><div class="week-body"><div class="hours">' + Array.from({ length: 24 }, (x, h) => '<div>' + (h ? pad(h) + ':00' : '') + '</div>').join('') + '</div>';
  const nm = nowMin();
  html += days.map(d => {
    const ev = itemsOn(d).filter(o => o.time);
    return '<div class="col' + (d === t ? ' today' : '') + '" data-act="cal-sel" data-date="' + d + '" style="height:' + (24 * HOUR) + 'px">' + (d === t ? '<div class="wnow" style="top:' + (nm / 60 * HOUR) + 'px"></div>' : '') +
      ev.map(o => { const l = listOf(o.list); const st = minutes(o.time); const en = o.end ? minutes(o.end) : st + 45; const top = st / 60 * HOUR; const hgt = Math.max(22, (en - st) / 60 * HOUR - 2); return '<div class="wev' + (o.type === 'event' ? ' ev' : '') + (o.isDone ? ' done' : '') + '" style="--c:' + l.color + ';top:' + top + 'px;height:' + hgt + 'px" data-act="open" data-id="' + o.id + '" data-occ="' + d + '" draggable="true">' + esc(o.title) + '<small>' + o.time + (o.end ? '–' + o.end : '') + '</small></div>'; }).join('') + '</div>';
  }).join('');
  return html + '</div></div></div>';
}
function dayPanelHtml(d) {
  const items = itemsOn(d); const ev = state.lists.some(l => l.id === 'reuniones') ? 'reuniones' : 'inbox';
  return '<aside class="day-panel"><div class="dp-head"><b>' + relDay(d) + '</b><span>' + fmtLong(d) + '</span></div>' + (items.length ? items.map(o => rowHtml(o, { noDate: true })).join('') : '<div class="empty"><b>🗓️</b>Nada para este día</div>') +
    '<div style="margin-top:10px;display:flex;gap:6px"><button class="btn sm" data-act="new-on" data-date="' + d + '">' + ico('plus') + 'Tarea</button><button class="btn sm" data-act="new-on" data-date="' + d + '" data-type="event" data-list="' + ev + '">' + ico('users') + 'Reunión</button></div></aside>';
}
function setupDnD(root) {
  root.addEventListener('dragstart', e => { const el = e.target.closest('[data-id]'); if (!el) return; e.dataTransfer.setData('text/plain', el.dataset.id + '|' + (el.dataset.occ || '')); e.dataTransfer.effectAllowed = 'move'; });
  root.addEventListener('dragover', e => { const cell = e.target.closest('[data-date]'); if (!cell) return; e.preventDefault(); cell.classList.add('drop'); });
  root.addEventListener('dragleave', e => { const cell = e.target.closest('[data-date]'); if (cell) cell.classList.remove('drop'); });
  root.addEventListener('drop', e => {
    const cell = e.target.closest('[data-date]'); if (!cell) return; e.preventDefault(); cell.classList.remove('drop');
    const p = (e.dataTransfer.getData('text/plain') || '').split('|'); const it = byId(p[0]); if (!it || it.date === cell.dataset.date) return;
    if (isRep(it)) { toast('Es una repetición', 'Cambia la fecha desde la ficha para mover toda la serie', 'info'); return; }
    it.date = cell.dataset.date; it.updated = Date.now(); clearFired(it.id); save(); render(); toast('Movido a ' + relDay(it.date), it.title, 'ok', 2000);
  });
}

/* ===== listas, todo, completadas ===== */
function viewList() {
  const l = listOf(state.listId); const all = state.items.filter(it => it.list === l.id);
  const pend = all.filter(it => isRep(it) || !it.done).map(it => occ(it, nextOcc(it))).sort(sortList);
  const done = all.filter(it => !isRep(it) && it.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  let html = '<div class="list-head"><div class="big" style="background:' + l.color + '">' + ico('list') + '</div><div><h1>' + esc(l.name) + '</h1><p class="sub">' + pend.length + ' pendientes · ' + done.length + ' completadas</p></div><span style="flex:1"></span><button class="btn sm" data-act="edit-list">' + ico('edit') + 'Editar lista</button></div>';
  html += '<div class="card">' + (pend.length ? pend.map(o => rowHtml(o)).join('') : '<div class="empty"><b>✨</b>Todo hecho en esta lista</div>') + '</div>';
  if (done.length) html += '<div class="group-title">Completadas <button class="btn sm ghost" data-act="clear-done" data-list="' + l.id + '">Vaciar</button></div><div class="card" style="opacity:.85">' + done.slice(0, 20).map(it => rowHtml(occ(it, it.date))).join('') + '</div>';
  return html;
}
const FILTERS = [['all', 'Todo'], ['task', 'Tareas'], ['event', 'Reuniones'], ['prio', 'Importantes'], ['overdue', 'Vencidas'], ['undated', 'Sin fecha'], ['done', 'Completadas']];
function viewAll() {
  const t = todayYmd(); const f = FILTERS.some(x => x[0] === state.filter) ? state.filter : 'all';
  const filters = '<div class="filters">' + FILTERS.map(x => '<span class="chip' + (f === x[0] ? ' on' : '') + '" data-act="filter" data-v="' + x[0] + '">' + x[1] + '</span>').join('') + '</div>';
  if (f === 'done') {
    const done = state.items.filter(it => !isRep(it) && it.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const g = {}; done.forEach(it => { const k = it.doneAt ? ymd(new Date(it.doneAt)) : '0000'; (g[k] = g[k] || []).push(it); });
    return '<div class="hero"><div><div class="eyebrow">Tareas y reuniones</div><h1>Completadas</h1><p class="sub">' + done.length + ' completadas</p></div>' + (done.length ? '<button class="btn danger sm" data-act="clear-done">' + ico('trash') + 'Vaciar completadas</button>' : '') + '</div>' + filters +
      '<div class="card">' + (done.length ? Object.keys(g).sort().reverse().map(k => '<div class="group-title">' + (k === '0000' ? 'Antes' : relDay(k)) + '</div>' + g[k].map(it => rowHtml(occ(it, it.date))).join('')).join('') : '<div class="empty"><b>🧘</b>Aún no has completado nada</div>') + '</div>';
  }
  let pend = pendingAll();
  if (f === 'task' || f === 'event') pend = pend.filter(it => it.type === f);
  if (f === 'prio') pend = pend.filter(it => it.priority >= 2);
  if (f === 'undated') pend = pend.filter(it => !it.date);
  if (f === 'overdue') pend = pend.filter(it => it.date && it.date < t && !isRep(it) && it.type === 'task');
  const rows = pend.map(it => occ(it, nextOcc(it))).sort(sortList);
  const title = FILTERS.find(x => x[0] === f)[1];
  let html = '<div class="hero"><div><div class="eyebrow">Tareas y reuniones</div><h1>' + (f === 'all' ? 'Todo pendiente' : title) + '</h1><p class="sub">' + rows.length + ' elementos</p></div></div>' + filters;
  const g = { 'Vencidas': [], 'Hoy': [], 'Esta semana': [], 'Más adelante': [], 'Sin fecha': [] };
  rows.forEach(o => { if (!o.occ) g['Sin fecha'].push(o); else if (o.occ < t) g['Vencidas'].push(o); else if (o.occ === t) g['Hoy'].push(o); else if (diffDays(t, o.occ) < 7) g['Esta semana'].push(o); else g['Más adelante'].push(o); });
  html += '<div class="card">' + Object.keys(g).filter(k => g[k].length).map(k => '<div class="group-title' + (k === 'Vencidas' ? ' red' : '') + '">' + k + ' <span>' + g[k].length + '</span></div>' + g[k].map(o => rowHtml(o)).join('')).join('') + (rows.length ? '' : '<div class="empty"><b>🎉</b>Nada pendiente</div>') + '</div>';
  return html;
}
function viewDone() { state.filter = 'done'; return viewAll(); }
function clearDone(listId) {
  const list = state.items.filter(it => !isRep(it) && it.done && (!listId || it.list === listId)); if (!list.length) return;
  if (!confirm('¿Eliminar ' + list.length + ' completadas definitivamente?')) return;
  const ids = new Set(list.map(i => i.id)); state.items = state.items.filter(i => !ids.has(i.id)); save(); render();
}

/* ===== barra lateral ===== */
function renderSidebar() {
  $$('#nav .nav-btn, #tabbar [data-view]').forEach(b => b.classList.toggle('active', state.view === b.dataset.view));
  const t = todayYmd(); const n = itemsOn(t).filter(o => !o.isDone).length + overdue().length;
  $('#badgeToday').textContent = n || ''; $('#badgeAll').textContent = pendingAll().length || '';
  $('#listNav').innerHTML = state.lists.map(l => { const c = state.items.filter(it => it.list === l.id && (isRep(it) || !it.done)).length; return '<button class="nav-btn' + (state.view === 'list' && state.listId === l.id ? ' active' : '') + '" data-list="' + l.id + '"><i class="dot" style="background:' + l.color + ';color:' + l.color + '"></i><span>' + esc(l.name) + '</span><span class="count">' + (c || '') + '</span></button>'; }).join('');
  const now = new Date(); $('#brandDate').textContent = cap(DAYS[now.getDay()]) + ' ' + now.getDate() + ' de ' + MONTHS[now.getMonth()];
  document.title = n ? '(' + n + ') Clanedario' : 'Clanedario';
  renderMini(); renderNextUp();
}
function renderMini() {
  const c = fromYmd(state.miniCursor); let d = monthStart(state.miniCursor); const t = todayYmd();
  let html = '<div class="mini-head"><button data-act="mini-prev">' + ico('left') + '</button><span>' + cap(MONTHS[c.getMonth()]) + ' ' + c.getFullYear() + '</span><button data-act="mini-next">' + ico('right') + '</button></div><div class="mini-grid">' + ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => '<div class="dw">' + x + '</div>').join('');
  for (let i = 0; i < 42; i++) { const dd = fromYmd(d); if (i >= 35 && dd.getMonth() !== c.getMonth()) break; html += '<div class="d' + (dd.getMonth() !== c.getMonth() ? ' o' : '') + (d === t ? ' t' : '') + (itemsOn(d).some(o => !o.isDone) ? ' has' : '') + '" data-act="mini-go" data-date="' + d + '">' + dd.getDate() + '</div>'; d = addDays(d, 1); }
  $('#miniCal').innerHTML = html + '</div>';
}
function nextEvent() {
  const t = todayYmd(); const nm = nowMin(); let best = null;
  [t, addDays(t, 1), addDays(t, 2)].forEach((d, i) => { if (best) return; const c = itemsOn(d).filter(o => o.time && !o.isDone && (i > 0 || (o.end ? minutes(o.end) : minutes(o.time) + 15) >= nm)); if (c.length) best = c[0]; });
  return best;
}
function occDateTime(it, date) { const d = fromYmd(date); const p = (it.time || '09:00').split(':').map(Number); d.setHours(p[0], p[1], 0, 0); return d; }
function renderNextUp() {
  const el = $('#nextUp'); const o = nextEvent(); if (!o) { el.innerHTML = ''; el.className = 'next-up'; delete el.dataset.id; return; }
  const mins = Math.round((occDateTime(o, o.occ).getTime() - Date.now()) / 60000);
  const txt = mins <= 0 ? 'ahora' : mins < 60 ? 'en ' + mins + ' min' : o.occ === todayYmd() ? 'a las ' + o.time : relDay(o.occ) + ' ' + o.time;
  el.className = 'next-up' + (mins < 30 ? ' soon' : ''); el.dataset.id = o.id; el.dataset.occ = o.occ; el.title = o.title;
  el.innerHTML = '<i class="pulse"></i><span>' + (o.type === 'event' ? 'Reunión' : 'Siguiente') + ': <b>' + esc(o.title) + '</b> ' + txt + '</span>';
}
function render() {
  const v = $('#view'); const st = v.scrollTop;
  v.innerHTML = state.view === 'today' ? viewToday() : state.view === 'upcoming' ? viewUpcoming() : state.view === 'calendar' ? viewCalendar() : state.view === 'list' ? viewList() : state.view === 'done' ? viewDone() : viewAll();
  v.scrollTop = st;
  if (state.view === 'calendar' && state.calMode === 'week') { const w = $('#weekScroll'); if (w) w.scrollTop = 7.5 * HOUR; }
  renderSidebar();
}
function go(view, listId, filter) { if (view === 'done') { view = 'all'; filter = 'done'; } if (filter) state.filter = filter; state.view = view; if (listId) state.listId = listId; render(); $('#view').scrollTop = 0; }
function applyDensity() { document.documentElement.dataset.density = state.settings.density === 'comoda' ? 'comoda' : 'compacta'; }

/* ===== menú rápido ===== */
let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
function showMenu(x, y, items) {
  closeMenu(); const m = document.createElement('div'); m.className = 'menu'; menuEl = m;
  m.innerHTML = items.map(it => it === '-' ? '<hr>' : '<button class="' + (it.cls || '') + '" data-m="' + it.k + '">' + (it.icon ? ico(it.icon) : '') + it.label + '</button>').join('');
  document.body.appendChild(m);
  const r = m.getBoundingClientRect(); m.style.left = Math.max(6, Math.min(x, window.innerWidth - r.width - 8)) + 'px'; m.style.top = Math.max(6, Math.min(y, window.innerHeight - r.height - 8)) + 'px';
  m.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; const it = items.find(i => i.k === b.dataset.m); closeMenu(); if (it && it.run) it.run(); });
}
function itemMenu(id, occD, x, y) {
  const it = byId(id); if (!it) return; const t = todayYmd();
  const setDate = d => { it.date = d; if (!d) { it.time = null; it.end = null; } it.updated = Date.now(); clearFired(it.id); save(); render(); toast(d ? 'Movido a ' + relDay(d) : 'Sin fecha', it.title, 'ok', 1500); };
  const nextMon = () => { const d = fromYmd(t); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); return ymd(d); };
  showMenu(x, y, [
    { k: 'open', label: 'Abrir la ficha', icon: 'edit', run: () => openItem(id, occD) },
    { k: 'done', label: isDone(it, occD || t) ? 'Marcar pendiente' : 'Marcar hecha', icon: 'check', run: () => toggleDone(id, occD || t) },
    '-',
    { k: 'today', label: 'Hoy', icon: 'sun', run: () => setDate(t) },
    { k: 'tomorrow', label: 'Mañana', icon: 'next', run: () => setDate(addDays(t, 1)) },
    { k: 'nextweek', label: 'Lunes que viene', icon: 'cal', run: () => setDate(nextMon()) },
    { k: 'nodate', label: 'Quitar la fecha', icon: 'x', run: () => setDate(null) },
    '-',
    { k: 'prio', label: it.priority >= 3 ? 'Quitar prioridad alta' : 'Prioridad alta', icon: 'flag', run: () => { it.priority = it.priority >= 3 ? 0 : 3; it.updated = Date.now(); save(); render(); } },
    { k: 'dup', label: 'Duplicar', icon: 'plus', run: () => { const c = newItem(Object.assign({}, it, { done: false, doneAt: null, doneDates: {}, created: Date.now(), updated: Date.now() })); c.id = uid(); state.items.push(c); save(); render(); toast('Duplicada', c.title, 'ok', 1500); } },
    { k: 'del', label: 'Eliminar', icon: 'trash', cls: 'danger', run: () => delItem(id) }
  ]);
}

/* ===== ficha de tarea / reunión ===== */
let sheetState = null;
function openSheet(html) { $('#sheet').innerHTML = html; $('#sheetWrap').classList.remove('hidden'); }
function closeSheet() { $('#sheetWrap').classList.add('hidden'); $('#sheet').innerHTML = ''; sheetState = null; }
function sel(name, opts, val) { return '<select name="' + name + '">' + opts.map(o => '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>'; }
function clearFired(id) { Object.keys(state.fired).forEach(k => { if (k.startsWith(id + '|')) delete state.fired[k]; }); }
function openItem(id, occDate, preset) {
  const it = id ? byId(id) : newItem(preset || {}); if (!it) return;
  closeSearch();
  sheetState = { id: id || null, draft: Object.assign({}, it), occ: occDate || null };
  const d = sheetState.draft;
  const rem = REMINDERS.map(r => [r[0] == null ? '' : r[0], r[1]]); if (d.reminder != null && !REMINDERS.some(r => r[0] === d.reminder)) rem.push([d.reminder, remLabel(d.reminder)]);
  const html = '<div class="sheet-head"><h2>' + (id ? (d.type === 'event' ? 'Reunión' : 'Tarea') : 'Nuevo') + '</h2><button class="icon-btn" data-act="sheet-close">' + ico('x') + '</button></div>' +
    '<input class="title-in" name="title" placeholder="¿Qué hay que hacer?" value="' + esc(d.title) + '">' +
    '<div class="form">' +
    '<div class="field"><label>Tipo</label><div class="seg" data-seg="type"><button class="' + (d.type === 'task' ? 'on' : '') + '" data-v="task">Tarea</button><button class="' + (d.type === 'event' ? 'on' : '') + '" data-v="event">Reunión</button></div></div>' +
    '<div class="field"><label>Lista</label>' + sel('list', state.lists.map(l => [l.id, l.name]), d.list) + '</div>' +
    '<div class="field"><label>Fecha</label><input type="date" name="date" value="' + (d.date || '') + '"></div>' +
    '<div class="field"><label>Hora · fin</label><div style="display:flex;gap:6px"><input type="time" name="time" value="' + (d.time || '') + '" style="flex:1;min-width:0"><input type="time" name="end" value="' + (d.end || '') + '" style="flex:1;min-width:0" title="Hora de fin"></div></div>' +
    '<div class="field"><label>Aviso</label>' + sel('reminder', rem, d.reminder == null ? '' : d.reminder) + '</div>' +
    '<div class="field"><label>Repetir</label>' + sel('repeat', REPEATS, d.repeat || 'none') + '</div>' +
    '<div class="field full prio"><label>Prioridad</label><div class="seg" data-seg="priority">' + [[0, 'Ninguna'], [1, 'Baja'], [2, 'Media'], [3, 'Alta']].map(p => '<button class="' + (Number(d.priority) === p[0] ? 'on' : '') + '" data-v="' + p[0] + '">' + p[1] + '</button>').join('') + '</div></div>' +
    '<div class="field full"><label>Lugar</label><input name="location" placeholder="Oficina, Teams, dirección…" value="' + esc(d.location || '') + '"></div>' +
    '<div class="field full"><label>Notas</label><textarea name="notes" placeholder="Detalles, enlace de la videollamada, asistentes…">' + esc(d.notes || '') + '</textarea></div>' +
    '</div><div class="sheet-foot">' + (id ? '<button class="btn danger" data-act="sheet-del">' + ico('trash') + 'Eliminar</button>' : '') + '<span class="spacer"></span><span class="hint">Ctrl+Enter guarda</span><button class="btn" data-act="sheet-close">Cancelar</button><button class="btn primary" data-act="sheet-save">' + ico('check') + 'Guardar</button></div>';
  openSheet(html); setTimeout(() => { const i = $('#sheet .title-in'); if (i) { i.focus(); if (!id) i.select(); } }, 60);
}
function readSheet() {
  const d = sheetState.draft; const f = n => $('#sheet [name="' + n + '"]');
  d.title = f('title').value.trim(); d.list = f('list').value; d.date = f('date').value || null; d.time = f('time').value || null; d.end = f('end').value || null;
  d.reminder = f('reminder').value === '' ? null : Number(f('reminder').value); d.repeat = f('repeat').value; d.location = f('location').value.trim(); d.notes = f('notes').value.trim();
  d.type = $('#sheet [data-seg="type"] .on').dataset.v; d.priority = Number($('#sheet [data-seg="priority"] .on').dataset.v);
  if (!d.time) d.end = null;
  if (d.type === 'event' && d.time && !d.end) d.end = addMin(d.time, 60);
  if (d.end && d.time && minutes(d.end) <= minutes(d.time)) d.end = addMin(d.time, 60);
  if (!d.date && (d.time || d.repeat !== 'none')) d.date = todayYmd();
  return d;
}
function saveSheet() {
  if (!sheetState || !sheetState.draft) return;
  const d = readSheet(); if (!d.title) { $('#sheet .title-in').focus(); return; }
  d.updated = Date.now(); const isNew = !sheetState.id;
  if (isNew) state.items.push(d); else { const it = byId(sheetState.id); const changed = it.date !== d.date || it.time !== d.time || it.reminder !== d.reminder; Object.assign(it, d); if (changed) clearFired(it.id); }
  save(); closeSheet(); render(); toast(isNew ? 'Añadido' : 'Guardado', d.title, 'ok', 1800);
}
function delItem(id) {
  const it = byId(id); if (!it) return; if (!confirm('¿Eliminar «' + it.title + '»?')) return;
  state.items = state.items.filter(i => i.id !== id); clearFired(id); save(); closeSheet(); render(); toast('Eliminado', it.title, 'info', 1800);
}

/* ===== listas ===== */
function openListSheet(id) {
  const l = id ? listOf(id) : { id: null, name: '', color: COLORS[state.lists.length % COLORS.length] };
  sheetState = { listId: id || null, color: l.color };
  openSheet('<div class="sheet-head"><h2>' + (id ? 'Editar lista' : 'Nueva lista') + '</h2><button class="icon-btn" data-act="sheet-close">' + ico('x') + '</button></div><input class="title-in" name="lname" placeholder="Nombre de la lista" value="' + esc(l.name) + '"><div class="field"><label>Color</label><div class="colors">' + COLORS.map(c => '<button style="background:' + c + '" class="' + (c === l.color ? 'on' : '') + '" data-act="pick-color" data-v="' + c + '"></button>').join('') + '</div></div><div class="sheet-foot">' + (id && id !== 'inbox' ? '<button class="btn danger" data-act="list-del">' + ico('trash') + 'Eliminar</button>' : '') + '<span class="spacer"></span><button class="btn" data-act="sheet-close">Cancelar</button><button class="btn primary" data-act="list-save">Guardar</button></div>');
  setTimeout(() => $('#sheet [name="lname"]').focus(), 60);
}
function saveList() {
  const name = $('#sheet [name="lname"]').value.trim(); if (!name) return;
  if (sheetState.listId) { const l = listOf(sheetState.listId); l.name = name; l.color = sheetState.color; }
  else { const l = { id: uid(), name: name, color: sheetState.color }; state.lists.push(l); state.view = 'list'; state.listId = l.id; }
  save(); closeSheet(); render();
}
function delList(id) {
  const l = listOf(id); const n = state.items.filter(i => i.list === id).length;
  if (!confirm('¿Eliminar la lista «' + l.name + '»?' + (n ? ' Sus ' + n + ' elementos pasarán a Entrada.' : ''))) return;
  state.items.forEach(i => { if (i.list === id) i.list = 'inbox'; }); state.lists = state.lists.filter(x => x.id !== id); if (state.listId === id) state.view = 'today';
  save(); closeSheet(); render();
}

/* ===== ajustes y datos ===== */
function openSettings() {
  const s = state.settings; const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  openSheet('<div class="sheet-head"><h2>Ajustes</h2><button class="icon-btn" data-act="sheet-close">' + ico('x') + '</button></div><div class="form">' +
    '<div class="field full"><label>Tu nombre (para el saludo)</label><input name="sname" value="' + esc(s.name || '') + '" placeholder="Nombre"></div>' +
    '<div class="field"><label>Tema</label>' + sel('stheme', [['auto', 'Como el sistema'], ['light', 'Claro'], ['dark', 'Oscuro']], s.theme) + '</div>' +
    '<div class="field"><label>Densidad</label>' + sel('sdensity', [['compacta', 'Compacta'], ['comoda', 'Cómoda']], s.density || 'compacta') + '</div>' +
    '<div class="field full"><label>Sonido</label><div class="toggle' + (s.sound ? ' on' : '') + '" data-act="toggle-sound"><span>Sonido en los avisos</span><i class="sw"></i></div></div>' +
    '<div class="field full"><label>Avisos de Windows</label><div class="toggle' + (perm === 'granted' ? ' on' : '') + '" data-act="ask-notif"><span>' + (perm === 'granted' ? 'Activados' : perm === 'denied' ? 'Bloqueados en el navegador (candado de la barra de direcciones)' : 'Pulsa para activar') + '</span><i class="sw"></i></div><p class="hint" style="margin-top:6px">Con la app abierta (aunque esté minimizada o detrás) los avisos salen como notificaciones de Windows con sonido. Si la cierras del todo no puede avisarte.</p></div>' +
    '<div class="field full"><label>Datos</label><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="export-json">Copia de seguridad (.json)</button><button class="btn sm" data-act="import-json">Restaurar copia</button><button class="btn sm" data-act="export-ics">Exportar a Outlook / Google (.ics)</button></div><input type="file" id="importFile" accept=".json" class="hidden"></div>' +
    '<div class="field full"><label>Atajos</label><p class="hint"><code>N</code> añadir · <code>Ctrl+K</code> buscar · <code>Esc</code> cerrar · <code>Ctrl+Enter</code> guardar la ficha · <code>1</code>–<code>5</code> cambiar de vista</p></div>' +
    '</div><div class="sheet-foot"><span class="spacer"></span><button class="btn primary" data-act="settings-save">Guardar</button></div>');
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/octet-stream' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
function exportJson() { download('clanedario-copia-' + todayYmd() + '.json', JSON.stringify({ v: 1, items: state.items, lists: state.lists, settings: state.settings }, null, 1), 'application/json'); toast('Copia descargada', 'Guárdala donde quieras', 'ok'); }
function exportIcs() {
  const NL = String.fromCharCode(10); const CRLF = String.fromCharCode(13, 10); const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Clanedario//ES', 'CALSCALE:GREGORIAN'];
  const dt = (d, t) => d.replace(/-/g, '') + (t ? 'T' + t.replace(':', '') + '00' : '');
  const RR = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };
  state.items.filter(it => it.date && !(it.done && !isRep(it))).forEach(it => {
    lines.push('BEGIN:VEVENT', 'UID:' + it.id + '@clanedario', 'DTSTAMP:' + dt(todayYmd(), '00:00'), 'SUMMARY:' + it.title.replace(/[,;]/g, ' '));
    if (it.time) lines.push('DTSTART:' + dt(it.date, it.time), 'DTEND:' + dt(it.date, it.end || addMin(it.time, 60))); else lines.push('DTSTART;VALUE=DATE:' + dt(it.date), 'DTEND;VALUE=DATE:' + dt(addDays(it.date, 1)));
    if (it.location) lines.push('LOCATION:' + it.location.replace(/[,;]/g, ' '));
    if (it.notes) lines.push('DESCRIPTION:' + it.notes.split(NL).join(' ').replace(/[,;]/g, ' '));
    if (RR[it.repeat]) lines.push('RRULE:' + RR[it.repeat]);
    if (it.reminder != null) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + it.title, 'TRIGGER:-PT' + it.reminder + 'M', 'END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR'); download('clanedario.ics', lines.join(CRLF), 'text/calendar'); toast('Calendario exportado', 'Ábrelo con Outlook o impórtalo en Google Calendar', 'ok');
}
function importJson(file) {
  const rd = new FileReader();
  rd.onload = () => { try { const d = JSON.parse(rd.result); if (!Array.isArray(d.items)) throw new Error('El archivo no es una copia de Clanedario'); if (!confirm('Se sustituirán los datos actuales por los de la copia (' + d.items.length + ' elementos). ¿Seguir?')) return; state.items = d.items; state.lists = d.lists && d.lists.length ? d.lists : state.lists; Object.assign(state.settings, d.settings || {}); state.fired = {}; save(); closeSheet(); applyTheme(); render(); toast('Copia restaurada', d.items.length + ' elementos', 'ok'); } catch (e) { toast('No se pudo importar', String(e.message || e), 'info'); } };
  rd.readAsText(file);
}

/* ===== buscador ===== */
function openSearch() { $('#searchWrap').classList.remove('hidden'); const i = $('#searchInput'); i.value = ''; renderSearch(''); setTimeout(() => i.focus(), 30); }
function closeSearch() { $('#searchWrap').classList.add('hidden'); }
function renderSearch(q) {
  q = norm(q.trim()); const res = $('#searchRes');
  if (!q) { res.innerHTML = '<div class="empty">Busca en títulos, notas y lugares</div>'; return; }
  const hits = state.items.filter(it => norm(it.title + ' ' + it.notes + ' ' + it.location).includes(q)).slice(0, 40).map(it => occ(it, nextOcc(it))).sort(sortList);
  res.innerHTML = hits.length ? hits.map(o => rowHtml(o)).join('') : '<div class="empty">Sin resultados para «' + esc(q) + '»</div>';
}

/* ===== avisos en pantalla ===== */
function toast(title, sub, kind, ms) {
  const t = document.createElement('div'); t.className = 'toast ' + (kind || 'info');
  t.innerHTML = '<div class="t-head"><div class="t-ic">' + ico(kind === 'ok' ? 'check' : 'bell') + '</div><div style="min-width:0"><div class="t-title">' + esc(title) + '</div>' + (sub ? '<div class="t-sub">' + esc(sub) + '</div>' : '') + '</div></div>';
  t.addEventListener('click', () => dismiss(t)); $('#toasts').appendChild(t); setTimeout(() => dismiss(t), ms || 3500); return t;
}
function dismiss(t) { if (!t || !t.parentNode) return; t.classList.add('out'); setTimeout(() => t.remove(), 260); }
function showReminder(it, date) {
  const t = document.createElement('div'); t.className = 'toast'; const l = listOf(it.list);
  t.innerHTML = '<div class="t-head"><div class="t-ic" style="background:' + l.color + '">' + ico('bell') + '</div><div style="min-width:0"><div class="t-title">' + esc(it.title) + '</div><div class="t-sub">' + (it.type === 'event' ? 'Reunión · ' : 'Tarea · ') + relDay(date) + (it.time ? ' a las ' + it.time : '') + (it.location ? ' · ' + esc(it.location) : '') + '</div></div></div>' +
    '<div class="t-actions"><button class="btn sm" data-r="open">Ver</button><button class="btn sm" data-r="s5">' + ico('zzz') + '5 min</button><button class="btn sm" data-r="s15">15 min</button><button class="btn sm primary" data-r="done">' + ico('check') + 'Hecho</button></div>';
  t.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; const r = b.dataset.r; if (r === 'open') openItem(it.id, date); else if (r === 's5') snooze(it, date, 5); else if (r === 's15') snooze(it, date, 15); else if (r === 'done') toggleDone(it.id, date); dismiss(t); });
  $('#toasts').appendChild(t);
}

/* ===== sonido ===== */
let actx = null;
function chime(kind) {
  if (!state.settings.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    const notes = kind === 'alert' ? [[880, 0], [1174.7, 0.16], [1568, 0.32]] : [[659.3, 0], [880, 0.09]];
    notes.forEach(n => { const o = actx.createOscillator(), g = actx.createGain(); const t0 = actx.currentTime + n[1]; o.type = 'sine'; o.frequency.value = n[0]; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4); o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + 0.45); });
  } catch (e) { }
}

/* ===== recordatorios ===== */
function checkReminders() {
  const now = Date.now(); const t = todayYmd(); const days = [addDays(t, -1), t, addDays(t, 1), addDays(t, 2)]; let dirty = false;
  state.items.forEach(it => {
    if (it.reminder == null || it.reminder < 0 || !it.date) return;
    days.forEach(date => {
      if (!occursOn(it, date) || isDone(it, date)) return;
      const key = it.id + '|' + date; const f = state.fired[key]; const at = occDateTime(it, date).getTime() - it.reminder * 60000;
      if (f) { if (f.snooze && now >= f.snooze) { fire(it, date); dirty = true; } return; }
      if (now >= at && now < at + 12 * 3600000) { fire(it, date); dirty = true; }
    });
  });
  if (dirty) save();
  renderNextUp();
}
function fire(it, date) {
  state.fired[it.id + '|' + date] = { at: Date.now() }; showReminder(it, date); chime('alert');
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body: (it.type === 'event' ? 'Reunión' : 'Tarea') + ' · ' + relDay(date) + (it.time ? ' a las ' + it.time : '') + (it.location ? ' · ' + it.location : ''), tag: it.id + '|' + date, requireInteraction: true, icon: 'icon-192.png', badge: 'icon-192.png', data: { id: it.id, date: date } };
  const legacy = () => { try { const n = new Notification(it.title, opts); n.onclick = () => { window.focus(); openItem(it.id, date); n.close(); }; } catch (e) { } };
  if (navigator.serviceWorker && location.protocol.startsWith('http')) navigator.serviceWorker.getRegistration().then(r => { if (r && r.active) return r.showNotification(it.title, opts); legacy(); }).catch(legacy);
  else legacy();
}
function snooze(it, date, min) { state.fired[it.id + '|' + date] = { snooze: Date.now() + min * 60000 }; save(); toast('Pospuesto ' + min + ' min', it.title, 'info', 2000); }
function askNotif() {
  if (!('Notification' in window)) { toast('Sin soporte', 'Este navegador no permite notificaciones', 'info'); return; }
  if (Notification.permission === 'granted') { toast('Avisos de Windows activados', 'Te avisaré aunque la ventana esté detrás', 'ok'); return; }
  Notification.requestPermission().then(p => { updateNotifBtn(); if (p === 'granted') toast('Avisos de Windows activados', 'Te avisaré aunque la ventana esté detrás', 'ok'); else toast('Avisos no activados', 'Actívalos desde el candado de la barra de direcciones', 'info'); if ($('#sheet [data-act="ask-notif"]')) openSettings(); });
}
function updateNotifBtn() { const b = $('#notifBtn'); const ok = ('Notification' in window) && Notification.permission === 'granted'; b.classList.toggle('on', ok); b.title = ok ? 'Avisos de Windows activados' : 'Activar avisos de Windows'; }
function applyTheme() { const t = state.settings.theme; const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('#themeBtn').innerHTML = ico(dark ? 'sun' : 'moon'); }
function toggleDone(id, date) {
  const it = byId(id); if (!it) return; let nowDone;
  if (isRep(it)) { it.doneDates = it.doneDates || {}; if (it.doneDates[date]) { delete it.doneDates[date]; nowDone = false; } else { it.doneDates[date] = Date.now(); nowDone = true; } }
  else { it.done = !it.done; it.doneAt = it.done ? Date.now() : null; nowDone = it.done; }
  it.updated = Date.now(); save(); render(); if (nowDone) chime('done');
}
function nextHour() { const d = new Date(); return pad(Math.min(23, d.getHours() + 1)) + ':00'; }

/* ===== acciones ===== */
function onAction(e) {
  const el = e.target.closest('[data-act]'); if (!el) return; const act = el.dataset.act;
  const row = e.target.closest('[data-id]'); const id = row ? row.dataset.id : null; const occD = row && row.dataset.occ ? row.dataset.occ : null;
  const evList = state.lists.some(l => l.id === 'reuniones') ? 'reuniones' : 'inbox';
  switch (act) {
    case 'toggle': toggleDone(id, occD || todayYmd()); break;
    case 'open': openItem(id, occD); break;
    case 'del': delItem(id); break;
    case 'go': go(el.dataset.view, null, el.dataset.filter || null); break;
    case 'menu': { const r = el.getBoundingClientRect(); itemMenu(id, occD, r.left - 150, r.bottom + 4); break; }
    case 'new-task': openItem(null, null, { date: todayYmd(), list: state.view === 'list' ? state.listId : 'inbox' }); break;
    case 'new-event': openItem(null, null, { type: 'event', date: todayYmd(), time: nextHour(), end: addMin(nextHour(), 60), reminder: 15, list: evList }); break;
    case 'new-on': openItem(null, null, el.dataset.type === 'event' ? { type: 'event', date: el.dataset.date, time: '10:00', end: '11:00', reminder: 15, list: evList } : { date: el.dataset.date, list: state.view === 'list' ? state.listId : 'inbox' }); break;
    case 'cal-prev': shiftCal(-1); break;
    case 'cal-next': shiftCal(1); break;
    case 'cal-today': state.cursor = todayYmd(); state.sel = todayYmd(); render(); break;
    case 'cal-mode': state.calMode = el.dataset.v; render(); break;
    case 'cal-sel': state.sel = el.dataset.date; if (state.calMode === 'month' && fromYmd(state.sel).getMonth() !== fromYmd(state.cursor).getMonth()) state.cursor = state.sel; render(); break;
    case 'mini-prev': state.miniCursor = shiftMonth(state.miniCursor, -1); renderMini(); break;
    case 'mini-next': state.miniCursor = shiftMonth(state.miniCursor, 1); renderMini(); break;
    case 'mini-go': state.sel = el.dataset.date; state.cursor = el.dataset.date; go('calendar'); break;
    case 'filter': state.filter = el.dataset.v; render(); break;
    case 'edit-list': openListSheet(state.listId); break;
    case 'clear-done': clearDone(el.dataset.list); break;
    case 'sheet-close': closeSheet(); break;
    case 'sheet-save': saveSheet(); break;
    case 'sheet-del': if (sheetState && sheetState.id) delItem(sheetState.id); break;
    case 'pick-color': sheetState.color = el.dataset.v; $$('#sheet .colors button').forEach(b => b.classList.toggle('on', b === el)); break;
    case 'list-save': saveList(); break;
    case 'list-del': delList(sheetState.listId); break;
    case 'toggle-sound': state.settings.sound = !state.settings.sound; el.classList.toggle('on', state.settings.sound); save(); if (state.settings.sound) chime('done'); break;
    case 'ask-notif': askNotif(); break;
    case 'settings-save': state.settings.name = $('#sheet [name="sname"]').value.trim(); state.settings.theme = $('#sheet [name="stheme"]').value; state.settings.density = $('#sheet [name="sdensity"]').value; save(); applyTheme(); applyDensity(); closeSheet(); render(); break;
    case 'export-json': exportJson(); break;
    case 'export-ics': exportIcs(); break;
    case 'import-json': $('#importFile').click(); break;
    case 'more': openMoreSheet(); break;
    case 'more-go': closeSheet(); if (el.dataset.v === 'search') openSearch(); else if (el.dataset.v === 'theme') $('#themeBtn').click(); else if (el.dataset.v === 'settings') openSettings(); else go(el.dataset.v); break;
    case 'more-newlist': closeSheet(); openListSheet(null); break;
    case 'go-list': closeSheet(); go('list', el.dataset.list); break;
  }
}
function openMoreSheet() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const items = [['done', 'Completadas', 'done', 'var(--green)'], ['search', 'Buscar', 'search', 'var(--blue)'], ['theme', dark ? 'Tema claro' : 'Tema oscuro', dark ? 'sun' : 'moon', 'var(--indigo)'], ['settings', 'Ajustes', 'gear', 'var(--gray)']];
  openSheet('<div class="sheet-head"><h2>Más</h2><button class="icon-btn" data-act="sheet-close">' + ico('x') + '</button></div>' +
    '<div class="more-grid">' + items.map(x => '<button data-act="more-go" data-v="' + x[0] + '"><span class="nav-ic" style="background:' + x[3] + '">' + ico(x[2]) + '</span><span>' + x[1] + '</span></button>').join('') + '</div>' +
    '<div class="group-title">Mis listas <button class="btn sm ghost" data-act="more-newlist">' + ico('plus') + 'Nueva</button></div><div class="more-lists">' +
    state.lists.map(l => { const c = state.items.filter(it => it.list === l.id && (isRep(it) || !it.done)).length; return '<button class="nav-btn" data-act="go-list" data-list="' + l.id + '"><i class="dot" style="background:' + l.color + ';color:' + l.color + '"></i><span>' + esc(l.name) + '</span><span class="count">' + (c || '') + '</span></button>'; }).join('') + '</div>');
}

/* ===== arranque ===== */
function init() {
  load(); applyTheme(); applyDensity(); updateNotifBtn();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  document.addEventListener('click', e => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }, true);
  document.body.addEventListener('click', onAction);
  $('#view').addEventListener('contextmenu', e => { const row = e.target.closest('[data-id]'); if (!row) return; e.preventDefault(); itemMenu(row.dataset.id, row.dataset.occ || null, e.clientX, e.clientY); });
  $('#view').addEventListener('scroll', closeMenu);
  $('#nav').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) go(b.dataset.view, null, b.dataset.view === 'all' ? 'all' : null); });
  $('#listNav').addEventListener('click', e => { const b = e.target.closest('[data-list]'); if (b) go('list', b.dataset.list); });
  $('#tabbar').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) go(b.dataset.view, null, b.dataset.view === 'all' ? 'all' : null); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { });
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'open' && e.data.id) openItem(e.data.id, e.data.date || null); });
  }
  $('#addList').addEventListener('click', () => openListSheet(null));
  $('#themeBtn').addEventListener('click', () => { state.settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); });
  $('#notifBtn').addEventListener('click', askNotif);
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#searchBtn').addEventListener('click', openSearch);
  $('#newBtn').addEventListener('click', () => openItem(null, null, { date: state.view === 'calendar' ? state.sel : todayYmd(), list: state.view === 'list' ? state.listId : 'inbox' }));
  $('#nextUp').addEventListener('click', e => { const el = e.currentTarget; if (el.dataset.id) openItem(el.dataset.id, el.dataset.occ); });
  const qi = $('#quickInput');
  qi.addEventListener('input', renderQuickChips);
  qi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } if (e.key === 'Escape') { qi.value = ''; renderQuickChips(); qi.blur(); } });
  $('#searchInput').addEventListener('input', e => renderSearch(e.target.value));
  $('#searchWrap').addEventListener('click', e => { if (e.target.id === 'searchWrap') closeSearch(); });
  $('#sheetWrap').addEventListener('click', e => {
    if (e.target.id === 'sheetWrap') { closeSheet(); return; }
    const sb = e.target.closest('[data-seg] button'); if (!sb) return;
    $$('button', sb.parentNode).forEach(b => b.classList.toggle('on', b === sb));
    if (sb.parentNode.dataset.seg === 'type' && sb.dataset.v === 'event') { const r = $('#sheet [name="reminder"]'); if (r && r.value === '') r.value = '15'; const tm = $('#sheet [name="time"]'); if (tm && !tm.value) tm.value = nextHour(); const en = $('#sheet [name="end"]'); if (en && !en.value) en.value = addMin(tm.value, 60); }
  });
  document.body.addEventListener('change', e => { if (e.target.id === 'importFile' && e.target.files[0]) { importJson(e.target.files[0]); e.target.value = ''; } });
  document.addEventListener('keydown', e => {
    const tag = document.activeElement ? document.activeElement.tagName : ''; const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(tag);
    if (e.key === 'Escape') { if (menuEl) closeMenu(); else if (!$('#sheetWrap').classList.contains('hidden')) closeSheet(); else if (!$('#searchWrap').classList.contains('hidden')) closeSearch(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && sheetState && sheetState.draft) { e.preventDefault(); saveSheet(); return; }
    if (inField) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); qi.focus(); return; }
    if (e.key >= '1' && e.key <= '5') go(['today', 'upcoming', 'calendar', 'all', 'done'][Number(e.key) - 1]);
  });
  setupDnD($('#view'));
  render(); renderQuickChips(); checkReminders();
  setInterval(checkReminders, 20000);
  setInterval(() => { if (!sheetState) { if (state.view === 'today' || state.view === 'calendar') render(); else renderSidebar(); } }, 60000);
  let last = todayYmd(); setInterval(() => { if (todayYmd() !== last) { last = todayYmd(); state.sel = last; render(); } }, 30000);
  window.addEventListener('storage', e => { if (e.key === KEY && !sheetState) { load(); render(); } });
  window.addEventListener('error', e => toast('Error en la app', e.message, 'info', 6000));
}
document.addEventListener('DOMContentLoaded', init);
