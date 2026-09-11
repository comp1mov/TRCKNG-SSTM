'use strict';
(function (root) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const emptyJournal = () => ({ version: 1, active: null, cycles: [] });
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  function validateJournal(journal) {
    const fail = () => { throw new Error('Журнал циклов повреждён или создан другой версией.'); };
    if (!object(journal) || ![1, 2].includes(journal.version) || !Array.isArray(journal.cycles)) fail();
    if (journal.version === 2) {
      const moments = root.SstmMoments || (typeof require === 'function' ? require('./moments.js') : null);
      if (!moments) fail(); moments.validate(journal);
    } else if (journal.moments !== undefined || journal.stateOptions !== undefined) fail();
    const ids = new Set(), open = [];
    let previousEnd = 0;
    for (const cycle of journal.cycles) {
      if (!object(cycle) || typeof cycle.id !== 'string' || !cycle.id || ids.has(cycle.id) || !object(cycle.names) || !Array.isArray(cycle.points) || !cycle.points.length) fail();
      ids.add(cycle.id);
      if (!Number.isFinite(cycle.startedAt) || cycle.startedAt <= 0 || cycle.startedAt < previousEnd) fail();
      const points = new Set(); let last = 0;
      for (const point of cycle.points) {
        if (!object(point) || typeof point.id !== 'string' || !point.id || points.has(point.id) || !Number.isFinite(point.at) || point.at <= last || typeof point.name !== 'string') fail();
        points.add(point.id); last = point.at;
      }
      if (cycle.points[0].at !== cycle.startedAt || Object.entries(cycle.names).some(([key, value]) => !points.has(key) || typeof value !== 'string')) fail();
      if (cycle.tags !== undefined && (!object(cycle.tags) || Object.entries(cycle.tags).some(([key, value]) => !points.has(key) || !Array.isArray(value) || value.length > 12 || value.some(tag => typeof tag !== 'string' || !tag || tag.length > 40)))) fail();
      if (cycle.endedAt === null) open.push(cycle.id);
      else if (cycle.endedAt !== last || cycle.points.length < 2) fail();
      previousEnd = cycle.endedAt ?? Infinity;
    }
    if (open.length > 1 || (open[0] || null) !== journal.active) fail();
    if (journal.edits !== undefined && (!Array.isArray(journal.edits) || journal.edits.some(edit => !object(edit) || !['time', 'remove-last'].includes(edit.type) || typeof edit.id !== 'string' || typeof edit.cycleId !== 'string' || typeof edit.pointId !== 'string' || !Number.isFinite(edit.at) || !object(edit.before) ||
        (edit.type === 'time' ? !Number.isFinite(edit.before.at) || !object(edit.after) || !Number.isFinite(edit.after.at) : !object(edit.before.point) || !Number.isFinite(edit.before.point.at) || typeof edit.before.point.name !== 'string' || typeof edit.before.intervalName !== 'string' || !Array.isArray(edit.before.tags) || edit.before.tags.some(tag => typeof tag !== 'string'))))) fail();
    return journal;
  }
  function validate(snapshot) {
    if (!snapshot || snapshot.snapshotType !== 'fullApp' || !Array.isArray(snapshot.pinData) || snapshot.pinData.length !== 3 ||
        snapshot.pinData.some(pin => !object(pin) || ![0, 1, 2].includes(pin.pin)) || new Set(snapshot.pinData.map(pin => pin.pin)).size !== 3) throw new Error('Нужна полная копия всех трёх PIN.');
    if (snapshot.dataset && (snapshot.dataset !== 'sstm-v2' || ![1, 2].includes(snapshot.dataVersion))) throw new Error('Эта версия данных пока не поддерживается.');
    if (!Number.isInteger(snapshot.schemaVersion) || snapshot.schemaVersion < 1 || snapshot.schemaVersion > 4) throw new Error('Версия исходных данных пока не поддерживается.');
    for (const pin of snapshot.pinData) {
      if (!object(pin.habitLabels) || !object(pin.habitTypes) || !object(pin.weekData) || Object.values(pin.habitLabels).some(value => typeof value !== 'string')) throw new Error('В копии не хватает данных PIN.');
      for (const [key, value] of Object.entries(pin)) {
        if (key === 'pin') continue;
        if (['durationSessions', 'counterChangeLog'].includes(key) ? !Array.isArray(value) : !object(value)) throw new Error('Некорректные настройки PIN.');
      }
    }
    if (snapshot.dataset) {
      validateJournal(snapshot.cycleJournal);
      if (snapshot.cycleJournal.version === 2 && snapshot.dataVersion !== 2) throw new Error('Для отметок нужна версия данных 2.');
    }
    if (snapshot.dataset && (snapshot.dataVersion === 2 || snapshot.moduleJournal)) {
      const modules = root.SstmModules || (typeof require === 'function' ? require('./modules.js') : null);
      if (!modules) throw new Error('Обнови приложение для модульных кнопок.');
      modules.validate(snapshot.moduleJournal);
      if (snapshot.moduleJournal.tracks.length && snapshot.dataVersion !== 2) throw new Error('Для модульных записей нужна версия данных 2.');
    }
    for (const pin of snapshot.pinData) for (const [cellId, type] of Object.entries(pin.habitTypes)) {
      if (type === 'modular' && !snapshot.moduleJournal?.bindings.some(b => b.pin === pin.pin && b.cellId === cellId)) throw new Error('В копии не хватает источника модульной кнопки.');
      if (['tag', 'state'].includes(type) && snapshot.cycleJournal?.version !== 2) throw new Error('В копии не хватает журнала отметок.');
    }
    return snapshot;
  }
  function migrate(snapshot, sourceAt, now = Date.now()) {
    validate(snapshot);
    if (snapshot.dataset) throw new Error('Это уже копия v2.');
    return { ...clone(snapshot), dataset: 'sstm-v2', dataVersion: 1,
      migration: { version: 1, source: 'v1', sourceUpdatedAt: sourceAt || null, copiedAt: new Date(now).toISOString() }, cycleJournal: emptyJournal() };
  }
  function storage(backing, owner) {
    const key = `trckng_v2_account_${owner || 'guest'}`;
    let batch = null;
    function read() {
      if (batch) return batch;
      const raw = backing.getItem(key);
      if (!raw) return { version: 1, values: {} };
      const parsed = JSON.parse(raw);
      if (![1, 2, 3].includes(parsed.version) || !parsed.values || typeof parsed.values !== 'object' || Array.isArray(parsed.values)) throw new Error('Локальная копия v2 не распознана. Она оставлена без изменений.');
      return parsed;
    }
    const commit = value => {
      // Older clients reject this envelope before running their engine offline.
      if (JSON.parse(value.values.sstm_v2_modules || 'null')?.tracks?.length) value.version = Math.max(value.version, 2);
      if (JSON.parse(value.values.sstm_v2_cycles || 'null')?.version === 2) value.version = Math.max(value.version, 3);
      backing.setItem(key, JSON.stringify(value));
    };
    const write = value => { if (!batch) commit(value); };
    return {
      keyName: key,
      getItem(name) { return read().values[name] ?? null; },
      setItem(name, value) { const data = read(); data.values[name] = String(value); write(data); },
      removeItem(name) { const data = read(); delete data.values[name]; write(data); },
      clear() { const data = read(); data.values = {}; write(data); },
      key(index) { return Object.keys(read().values)[index] ?? null; },
      get length() { return Object.keys(read().values).length; },
      transaction(fn) {
        if (batch) return fn();
        const value = read(); batch = clone(value);
        try { const result = fn(); commit(batch); return result; }
        finally { batch = null; }
      }
    };
  }
  function point(journal, at, end = false, id = () => crypto.randomUUID()) {
    validateJournal(journal);
    const next = clone(journal);
    let cycle = next.cycles.find(cycle => cycle.id === next.active);
    if (end && !cycle) throw new Error('Нет активного цикла.');
    if (!Number.isFinite(at) || at <= 0) throw new Error('Проверь часы устройства.');
    if (!cycle) {
      if (next.cycles.at(-1)?.endedAt > at) throw new Error('Новый цикл не может начаться раньше предыдущего. Проверь часы устройства.');
      cycle = { id: id(), startedAt: at, endedAt: null, points: [], names: {} };
      next.cycles.push(cycle); next.active = cycle.id;
    }
    if (cycle.points.at(-1)?.at >= at) throw new Error('Точка должна быть позже предыдущей. Проверь часы устройства.');
    cycle.points.push({ id: id(), at, name: '' });
    if (end) { cycle.endedAt = at; next.active = null; }
    return next;
  }
  function annotate(journal, cycleId, pointId, kind, name) {
    const next = clone(journal), cycle = next.cycles.find(c => c.id === cycleId);
    const point = cycle?.points.find(p => p.id === pointId);
    if (!point || !['point', 'interval'].includes(kind)) throw new Error('Запись больше не существует.');
    if (kind === 'point') point.name = String(name).trim().slice(0, 160);
    else cycle.names[pointId] = String(name).trim().slice(0, 160);
    return next;
  }
  function tagInterval(journal, cycleId, pointId, tags) {
    validateJournal(journal);
    const next = clone(journal), cycle = next.cycles.find(c => c.id === cycleId);
    if (!cycle?.points.some(p => p.id === pointId) || (cycle.endedAt !== null && cycle.points.at(-1).id === pointId)) throw new Error('Отрезок больше не существует.');
    const values = [...new Set(String(tags).split(/[\s,#]+/u).map(tag => tag.trim().toLocaleLowerCase()).filter(Boolean))];
    if (values.length > 12 || values.some(tag => tag.length > 40)) throw new Error('До 12 тегов, не длиннее 40 символов каждый.');
    cycle.tags ||= {}; cycle.tags[pointId] = values;
    return next;
  }
  function unchanged(cycle, expected) {
    if (expected !== undefined && JSON.stringify(cycle) !== expected) throw new Error('Запись уже изменилась. Открой исправление заново: твой ввод сохранён.');
  }
  function changeTime(journal, cycleId, pointId, at, expected, now = Date.now()) {
    validateJournal(journal);
    const next = clone(journal), index = next.cycles.findIndex(c => c.id === cycleId), cycle = next.cycles[index];
    const n = cycle?.points.findIndex(p => p.id === pointId), p = cycle?.points[n];
    if (!p) throw new Error('Точка больше не существует.');
    unchanged(cycle, expected);
    if (!Number.isFinite(at) || at <= 0 || at > now) throw new Error('Выбери прошедшее время, не позже текущего.');
    if ((n > 0 && at <= cycle.points[n - 1].at) || (n + 1 < cycle.points.length && at >= cycle.points[n + 1].at)) throw new Error('Точка должна оставаться между соседними точками.');
    if ((n === 0 && index > 0 && at < next.cycles[index - 1].endedAt) || (n === cycle.points.length - 1 && next.cycles[index + 1] && at > next.cycles[index + 1].startedAt)) throw new Error('Запись не может пересекаться с соседней записью.');
    if (p.at === at) return next;
    (next.edits ||= []).push({ id: crypto.randomUUID(), type: 'time', at: now, cycleId, pointId, before: { at: p.at }, after: { at } });
    p.at = at;
    if (n === 0) cycle.startedAt = at;
    if (cycle.endedAt !== null && n === cycle.points.length - 1) cycle.endedAt = at;
    return validateJournal(next);
  }
  function removeLastPoint(journal, cycleId, expected, now = Date.now()) {
    validateJournal(journal);
    const next = clone(journal), cycle = next.cycles.at(-1);
    if (!cycle || cycle.id !== cycleId) throw new Error('Отменить можно последнюю точку последней записи.');
    unchanged(cycle, expected);
    const p = cycle.points.pop();
    (next.edits ||= []).push({ id: crypto.randomUUID(), type: 'remove-last', at: now, cycleId, pointId: p.id,
      before: { point: clone(p), intervalName: cycle.names[p.id] || '', tags: cycle.tags?.[p.id] || [], startedAt: cycle.startedAt, endedAt: cycle.endedAt } });
    delete cycle.names[p.id]; if (cycle.tags) delete cycle.tags[p.id];
    if (cycle.points.length) { cycle.endedAt = null; next.active = cycle.id; }
    else { next.cycles.pop(); next.active = null; }
    return validateJournal(next);
  }
  const api = { validate, validateJournal, migrate, storage, emptyJournal, point, annotate, tagInterval, changeTime, removeLastPoint };
  if (typeof module !== 'undefined') module.exports = api;
  else root.SstmData = api;
})(typeof window !== 'undefined' ? window : globalThis);
