'use strict';
// Timestamped observations share the recording journal, but never split its intervals.
(function (root) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const fail = message => { throw Error(message); };
  const defaults = [
    ['good', 'Хорошо'], ['calm', 'Спокойно'], ['joy', 'Радостно'], ['energy', 'Есть силы'],
    ['tired', 'Усталость'], ['worry', 'Тревожно'], ['sad', 'Грустно'], ['unsure', 'Неясно']
  ].map(([id, label]) => ({ id, label }));
  const key = word => word.normalize('NFKC').trim().toLocaleLowerCase('ru-RU');
  const options = journal => [...defaults, ...(journal.stateOptions || [])];
  function tags(text) {
    const result = [...new Set(String(text).normalize('NFKC').split(/[\s,#]+/u).map(key).filter(Boolean))];
    if (result.length > 12 || result.some(t => t.length > 40 || /[\p{Cc}\p{Cf}]/u.test(t))) fail('До 12 слов через пробел, каждое — до 40 символов.');
    return result;
  }
  function validate(journal) {
    if (!Array.isArray(journal.moments) || !Array.isArray(journal.stateOptions) || journal.stateOptions.length > 32) fail('Не удалось прочитать отметки и состояния.');
    const choices = new Set(defaults.map(o => o.id)), labels = new Set(defaults.map(o => key(o.label)));
    for (const o of journal.stateOptions) {
      if (!o || typeof o.id !== 'string' || !o.id || choices.has(o.id) || typeof o.label !== 'string' || !o.label.trim() || o.label.length > 40 || labels.has(key(o.label)) || /[\p{Cc}\p{Cf}]/u.test(o.label)) fail('Не удалось прочитать список состояний.');
      choices.add(o.id); labels.add(key(o.label));
    }
    const ids = new Set();
    for (const m of journal.moments) {
      if (!m || typeof m.id !== 'string' || !m.id || ids.has(m.id) || !['tag', 'state'].includes(m.kind) || !Number.isFinite(m.at) || m.at <= 0 || !Number.isFinite(m.createdAt) || m.createdAt < m.at || !Number.isInteger(m.offsetMinutes) || Math.abs(m.offsetMinutes) > 840 || !m.source || ![0, 1, 2].includes(m.source.pin) || typeof m.source.cellId !== 'string' || typeof m.source.label !== 'string' || !Array.isArray(m.tags) || JSON.stringify(tags(m.tags.join(' '))) !== JSON.stringify(m.tags)) fail('Не удалось прочитать отметку времени.');
      if (m.kind === 'tag' ? !m.tags.length || m.state !== null : !m.state || !choices.has(m.state.id) || typeof m.state.label !== 'string' || !m.state.label.trim() || m.state.label.length > 40 || m.tags.length) fail('Не удалось прочитать содержимое отметки.');
      if (m.deletedAt !== undefined && (!Number.isFinite(m.deletedAt) || m.deletedAt < m.createdAt)) fail('Не удалось прочитать отмену отметки.');
      ids.add(m.id);
    }
    return journal;
  }
  function upgrade(journal) {
    const next = clone(journal);
    if (next.version === 1) { next.version = 2; next.moments = []; next.stateOptions = []; }
    if (next.version !== 2) fail('Обнови приложение для отметок.');
    return validate(next);
  }
  function addOption(journal, label, id = crypto.randomUUID()) {
    const next = upgrade(journal), text = String(label).normalize('NFKC').trim();
    if (!text || text.length > 40) fail('Название — от 1 до 40 символов.');
    if (options(next).some(o => key(o.label) === key(text))) fail('Такое состояние уже есть в меню.');
    if (next.stateOptions.length >= 32) fail('В меню уже 32 своих состояния.');
    next.stateOptions.push({ id, label: text }); return validate(next);
  }
  function record(journal, { id = crypto.randomUUID(), kind, text = '', stateId, at, source, now = Date.now(), offsetMinutes = new Date(at).getTimezoneOffset() }) {
    const next = upgrade(journal);
    if (next.moments.some(m => m.id === id)) return next; // A repeated submit of one draft is idempotent.
    const state = kind === 'state' ? options(next).find(o => o.id === stateId) : null;
    if (kind === 'tag' && !tags(text).length) fail('Введи хотя бы одно слово.');
    if (kind === 'state' && !state) fail('Выбери состояние из меню.');
    next.moments.push({ id, kind, at, createdAt: now, offsetMinutes, source: clone(source), tags: kind === 'tag' ? tags(text) : [], state: state ? clone(state) : null });
    return validate(next);
  }
  function remove(journal, id, now = Date.now()) {
    const next = upgrade(journal), m = next.moments.find(m => m.id === id);
    if (!m) fail('Отметка больше не найдена.');
    m.deletedAt ??= Math.max(now, m.createdAt); return validate(next);
  }
  // Half-open boundaries put a mark at a change of activity into the new interval.
  function intervalAt(journal, at, now = Date.now()) {
    for (const c of journal.cycles) for (let i = 0; i < c.points.length; i++) {
      const p = c.points[i], end = c.points[i + 1]?.at ?? (c.endedAt === null ? now + 1 : p.at);
      if (at >= p.at && at < end) return { cycleId: c.id, pointId: p.id, name: c.names[p.id] || `отрезок ${i + 1}` };
    }
    return null;
  }
  function weekBounds(at) {
    const start = new Date(at); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    const end = new Date(start); end.setDate(end.getDate() + 7); return { start: +start, end: +end };
  }
  function week(journal, at, now = Date.now()) {
    const { start, end } = weekBounds(at), entries = [], counts = new Map();
    for (const m of journal.moments || []) if (!m.deletedAt && m.at >= start && m.at < end) {
      entries.push({ id: m.id, at: m.at, kind: m.kind, tags: m.kind === 'state' ? [key(m.state.label)] : m.tags, label: m.kind === 'state' ? m.state.label : m.tags.map(t => `#${t}`).join(' '), source: m.source, interval: intervalAt(journal, m.at, now) });
    }
    for (const c of journal.cycles) for (let i = 0; i < c.points.length; i++) {
      const p = c.points[i], until = c.points[i + 1]?.at ?? (c.endedAt === null ? now : p.at), words = c.tags?.[p.id] || [];
      if (words.length && until > start && p.at < end) entries.push({ id: `interval:${c.id}/${p.id}`, at: p.at, kind: 'interval', tags: words, label: c.names[p.id] || `отрезок ${i + 1}`, until });
    }
    entries.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
    for (const e of entries) for (const tag of new Set(e.tags)) counts.set(tag, (counts.get(tag) || 0) + 1);
    return { start, end, entries, tags: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru')) };
  }
  const api = { defaults, options, key, tags, validate, upgrade, addOption, record, remove, intervalAt, weekBounds, week };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SstmMoments = api;
})(globalThis);
