'use strict';
// A control's placement/display is separate from its action, time records and outputs.
(function (root) {
  const clone = x => JSON.parse(JSON.stringify(x));
  const object = x => x && typeof x === 'object' && !Array.isArray(x);
  const fail = text => { throw Error(text); };
  const empty = () => ({ version: 1, tracks: [], bindings: [] });
  function rate(value) {
    if (!object(value) || !Number.isFinite(value.amount) || value.amount <= 0 || value.amount > 1e9 ||
        !Number.isSafeInteger(value.intervalMs) || value.intervalMs < 1000 || value.intervalMs > 31622400000 ||
        typeof value.currency !== 'string' || !value.currency.trim() || value.currency.length > 8) fail('Укажи положительную ставку, интервал от секунды до года и валюту.');
    return value;
  }
  function display(value) {
    if (!object(value) || !['money', 'time'].includes(value.primary) || ![2, 4].includes(value.decimals) || typeof value.wholeHours !== 'boolean') fail('Неизвестный формат отображения.');
    return value;
  }
  function validate(journal) {
    if (!object(journal) || journal.version !== 1 || !Array.isArray(journal.tracks) || !Array.isArray(journal.bindings)) fail('Эта версия модульных кнопок не поддерживается.');
    const ids = new Set(), records = new Set(), controls = new Set();
    for (const t of journal.tracks) {
      if (!object(t) || typeof t.id !== 'string' || !t.id || ids.has(t.id) || t.action !== 'duration.toggle' || t.preset !== 'work-pay' || typeof t.name !== 'string' || !Array.isArray(t.sessions) || !Number.isInteger(t.revision) || t.revision < 0) fail('Повреждена запись модульного таймера.');
      ids.add(t.id); rate(t.rate);
      let end = 0;
      for (const s of [...t.sessions, ...(t.running ? [t.running] : [])]) {
        if (!object(s) || typeof s.id !== 'string' || !s.id || records.has(s.id) || !Number.isFinite(s.start) || s.start <= 0 || s.start < end || !object(s.source) || ![0, 1, 2].includes(s.source.pin) || typeof s.source.cellId !== 'string') fail('Повреждён рабочий отрезок.');
        rate(s.rate); if (s.rate.currency !== t.rate.currency) fail('Нельзя складывать разные валюты.');
        if (s === t.running) { if (s.end !== null) fail('Некорректный запущенный отрезок.'); }
        else if (!Number.isFinite(s.end) || s.end <= s.start) fail('Окончание отрезка должно быть позже начала.');
        records.add(s.id); end = s.end ?? Infinity;
      }
      if (t.running !== null && !object(t.running)) fail('Некорректное состояние таймера.');
    }
    for (const b of journal.bindings) {
      if (!object(b) || ![0, 1, 2].includes(b.pin) || typeof b.cellId !== 'string' || !/^cell(?:\d+|-[a-z0-9-]+)$/i.test(b.cellId) || !ids.has(b.trackId) || controls.has(`${b.pin}/${b.cellId}`)) fail('Повреждена связь кнопки с таймером.');
      display(b.display); controls.add(`${b.pin}/${b.cellId}`);
    }
    for (const t of journal.tracks) if (t.running && !journal.bindings.some(b => b.trackId === t.id)) fail('Запущенному таймеру нужна кнопка управления.');
    return journal;
  }
  const binding = (j, pin, cellId) => j.bindings.find(b => b.pin === pin && b.cellId === cellId);
  const track = (j, id) => j.tracks.find(t => t.id === id) || fail('Таймер больше не существует.');
  const editorStamp = (j, pin, cellId, trackId) => JSON.stringify([binding(j, pin, cellId) || null, trackId ? j.tracks.find(t => t.id === trackId) || null : null]);
  function configure(journal, { pin, cellId, trackId, name, rate: nextRate, display: nextDisplay, expected }) {
    validate(journal); rate(nextRate); display(nextDisplay);
    if (expected !== undefined && expected !== editorStamp(journal, pin, cellId, trackId)) fail('Таймер изменился. Закрой настройки и открой их заново; записи сохранены.');
    const j = clone(journal), old = binding(j, pin, cellId);
    if (old && old.trackId !== trackId && track(j, old.trackId).running) fail('Сначала останови текущую работу, затем меняй связь кнопки.');
    let t;
    if (trackId) {
      t = track(j, trackId);
      if (t.running && ['amount', 'intervalMs', 'currency'].some(key => nextRate[key] !== t.rate[key])) fail('Сначала останови работу, затем меняй ставку.');
      if ((t.sessions.length || t.running) && nextRate.currency !== t.rate.currency) fail('Для другой валюты создай отдельный рабочий таймер.');
      t.rate = clone(nextRate); t.revision++;
    } else {
      t = { id: crypto.randomUUID(), action: 'duration.toggle', preset: 'work-pay', name: String(name || 'Работа').trim().slice(0, 160), rate: clone(nextRate), revision: 0, sessions: [], running: null };
      j.tracks.push(t);
    }
    if (old) Object.assign(old, { trackId: t.id, display: clone(nextDisplay) });
    else j.bindings.push({ pin, cellId, trackId: t.id, display: clone(nextDisplay) });
    return validate(j);
  }
  function toggle(journal, pin, cellId, at = Date.now(), expected) {
    validate(journal); const j = clone(journal), b = binding(j, pin, cellId); if (!b) fail('Сначала настрой модульную кнопку.');
    const t = track(j, b.trackId);
    if (expected !== undefined && t.revision !== expected) fail('Состояние таймера изменилось. Проверь его перед новым нажатием.');
    if (!Number.isFinite(at) || at <= 0) fail('Проверь часы устройства.');
    if (t.running) {
      if (at <= t.running.start) fail('Остановка должна быть позже начала. Проверь часы устройства.');
      t.sessions.push({ ...t.running, end: at }); t.running = null;
    } else {
      if (t.sessions.at(-1)?.end > at) fail('Новая работа не может начаться раньше предыдущей.');
      t.running = { id: crypto.randomUUID(), start: at, end: null, rate: clone(t.rate), source: { pin, cellId } };
    }
    t.revision++; return validate(j);
  }
  function totals(t, now = Date.now(), from = 0, until = Infinity) {
    let milliseconds = 0, money = 0;
    for (const s of [...t.sessions, ...(t.running ? [t.running] : [])]) {
      const ms = Math.max(0, Math.min(s.end ?? now, until) - Math.max(s.start, from));
      milliseconds += ms; money += ms / s.rate.intervalMs * s.rate.amount;
    }
    return { milliseconds, seconds: milliseconds / 1000, completeHours: Math.floor(milliseconds / 3600000), money, currency: t.rate.currency };
  }
  const api = { empty, validate, rate, display, binding, track, editorStamp, configure, toggle, totals };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SstmModules = api;
})(globalThis);
