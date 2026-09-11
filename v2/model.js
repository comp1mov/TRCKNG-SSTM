'use strict';

(function (root) {
  const KINDS = ['points', 'count', 'value', 'timer'];
  const id = () => crypto.randomUUID();
  const fail = message => { throw new Error(message); };
  const integer = (value, min, max) => Number.isInteger(Number(value)) && value >= min && value <= max;
  const title = value => String(value || '').trim().slice(0, 60);

  function createWorld() {
    const pins = Array.from({ length: 3 }, (_, i) => ({ id: id(), name: `PIN 0${i + 1}`, columns: 10, rows: 10 }));
    const track = { id: id(), name: 'ТОЧКИ', kind: 'points', version: 0, activeCycleId: null };
    return { schema: 1, stage: 'local-alpha', id: id(), revision: 0, createdAt: Date.now(),
      pins, tracks: [track], modules: [{ id: id(), pinId: pins[0].id, trackId: track.id, title: 'ТОЧКИ', x: 0, y: 0, width: 2, height: 2, version: 0 }],
      events: [], cycles: [], intervalNotes: {}, views: [] };
  }

  function find(items, key) { return items.find(item => item.id === key) || fail('Элемент больше не существует.'); }
  function points(world, trackId, cycleId) {
    return world.events.filter(e => e.trackId === trackId && e.kind === 'point' && (!cycleId || e.cycleId === cycleId))
      .sort((a, b) => a.at - b.at);
  }
  function intervals(world, trackId) {
    return world.cycles.filter(c => c.trackId === trackId).flatMap(c => {
      const list = points(world, trackId, c.id);
      return list.slice(1).map((end, i) => ({ id: `${list[i].id}:${end.id}`, kind: 'interval', trackId,
        cycleId: c.id, start: list[i], end, milliseconds: end.at - list[i].at,
        name: world.intervalNotes[`${list[i].id}:${end.id}`]?.name || '' }));
    });
  }
  function canPlace(world, pinId, layout, exceptId) {
    const pin = find(world.pins, pinId);
    if (!integer(layout.x, 0, pin.columns - 1) || !integer(layout.y, 0, pin.rows - 1) ||
      !integer(layout.width, 1, 4) || !integer(layout.height, 1, 4) ||
      layout.x + layout.width > pin.columns || layout.y + layout.height > pin.rows) return false;
    return !world.modules.some(m => m.pinId === pinId && m.id !== exceptId &&
      layout.x < m.x + m.width && layout.x + layout.width > m.x && layout.y < m.y + m.height && layout.y + layout.height > m.y);
  }
  function freePlace(world, pinId, width, height, origin = { x: 0, y: 0 }) {
    const pin = find(world.pins, pinId);
    const candidates = [];
    for (let y = 0; y < pin.rows; y++) for (let x = 0; x < pin.columns; x++) candidates.push({ x, y, width, height });
    candidates.sort((a, b) => (Math.abs(a.x - origin.x) + Math.abs(a.y - origin.y)) - (Math.abs(b.x - origin.x) + Math.abs(b.y - origin.y)));
    return candidates.find(layout => canPlace(world, pinId, layout)) || fail('Нет свободного места. Увеличь поле через меню.');
  }
  function expectVersion(actual, expected) {
    if (expected !== undefined && actual !== expected) fail('Данные уже изменились. Загрузите сохранённое и повторите правку.');
  }
  function point(world, module, track, at) {
    let cycle = world.cycles.find(c => c.id === track.activeCycleId);
    if (!cycle) {
      cycle = { id: id(), trackId: track.id, startedAt: at, endedAt: null };
      world.cycles.push(cycle);
      track.activeCycleId = cycle.id;
    }
    const previous = points(world, track.id, cycle.id).at(-1);
    if (previous && at <= previous.at) fail('Точка должна идти после предыдущей. Проверь часы устройства.');
    const event = { id: id(), kind: 'point', trackId: track.id, moduleId: module.id, pinId: module.pinId,
      cycleId: cycle.id, at, label: module.title, name: '', version: 0 };
    world.events.push(event);
    return event;
  }

  function apply(world, command) {
    if (world.schema !== 1 || world.stage !== 'local-alpha') fail('Эта версия данных не поддерживается.');
    const at = command.at ?? Date.now();
    if (!Number.isFinite(at) || at <= 0) fail('Не удалось определить время.');
    let result;
    if (command.type === 'add') {
      find(world.pins, command.pinId);
      let track = command.trackId ? find(world.tracks, command.trackId) : null;
      const kind = track?.kind || command.kind;
      if (!KINDS.includes(kind)) fail('Неизвестный тип кнопки.');
      const label = title(command.title) || ({ points: 'ТОЧКИ', count: 'СЧЁТЧИК', value: 'ЗНАЧЕНИЕ', timer: 'ТАЙМЕР' })[kind];
      const layout = freePlace(world, command.pinId, kind === 'points' || kind === 'timer' ? 2 : 1, kind === 'points' ? 2 : 1, command.origin);
      if (!track) {
        track = { id: id(), name: label, kind, version: 0, value: 0, accumulatedMs: 0, runningSince: null, activeCycleId: null };
        world.tracks.push(track);
      }
      result = { id: id(), pinId: command.pinId, trackId: track.id, title: label, ...layout, version: 0 };
      world.modules.push(result);
    } else if (command.type === 'layout') {
      const module = find(world.modules, command.moduleId);
      expectVersion(module.version, command.version);
      const layout = { x: Number(command.x), y: Number(command.y), width: Number(command.width), height: Number(command.height) };
      if (!canPlace(world, module.pinId, layout, module.id)) fail('Модуль пересекается с другим или выходит за край поля.');
      Object.assign(module, layout, { title: title(command.title) || module.title, version: module.version + 1 });
    } else if (command.type === 'grow') {
      const pin = find(world.pins, command.pinId);
      if (pin.columns >= 200 || pin.rows >= 200) fail('В этой сборке предел поля — 200×200.');
      pin.columns += 5; pin.rows += 5;
    } else if (command.type === 'view') {
      const pin = find(world.pins, command.pinId);
      if (!title(command.name)) fail('Введите имя области.');
      if (!Number.isFinite(command.x) || !Number.isFinite(command.y) || command.x < 0 || command.y < 0 ||
        command.x >= pin.columns || command.y >= pin.rows || ![48, 64, 80, 96].includes(command.zoom)) fail('Некорректная область поля.');
      world.views.push({ id: id(), pinId: command.pinId, name: title(command.name), x: command.x, y: command.y, zoom: command.zoom });
    } else if (command.type === 'annotate') {
      const event = find(world.events, command.eventId);
      expectVersion(event.version, command.version);
      event.name = title(command.name); event.version++;
    } else if (command.type === 'annotateInterval') {
      if (!intervals(world, command.trackId).some(i => i.id === command.intervalId)) fail('Отрезок больше не существует.');
      const note = world.intervalNotes[command.intervalId] || { version: 0 };
      expectVersion(note.version, command.version);
      world.intervalNotes[command.intervalId] = { name: title(command.name), version: note.version + 1 };
    } else {
      const module = find(world.modules, command.moduleId);
      const track = find(world.tracks, module.trackId);
      if (command.type === 'capture') {
        if (track.kind === 'points') result = point(world, module, track, at);
        else if (track.kind === 'count') {
          const previous = track.value || 0;
          track.value = previous + 1;
          world.events.push({ id: id(), kind: 'value', trackId: track.id, moduleId: module.id, pinId: module.pinId, at, previous, value: track.value, label: module.title, version: 0 });
        } else if (track.kind === 'timer') {
          if (track.runningSince !== null) {
            if (at <= track.runningSince) fail('Окончание должно быть позже начала.');
            world.events.push({ id: id(), kind: 'duration', trackId: track.id, moduleId: module.id, pinId: module.pinId,
              at: track.runningSince, end: at, label: module.title, version: 0 });
            track.accumulatedMs += at - track.runningSince; track.runningSince = null;
          } else track.runningSince = at;
        } else fail('Введите значение в окне.');
      } else if (command.type === 'setValue' && track.kind === 'value') {
        expectVersion(track.version, command.version);
        const value = Number(command.value);
        if (String(command.value).trim() === '' || !Number.isFinite(value)) fail('Введите число.');
        world.events.push({ id: id(), kind: 'value', trackId: track.id, moduleId: module.id, pinId: module.pinId,
          at, previous: track.value || 0, value, label: module.title, version: 0 });
        track.value = value;
      } else if (command.type === 'endCycle' && track.kind === 'points') {
        if (!track.activeCycleId) fail('Цикл уже завершён.');
        point(world, module, track, at);
        find(world.cycles, track.activeCycleId).endedAt = at;
        track.activeCycleId = null;
      } else fail('Неизвестное действие.');
      track.version++;
    }
    world.revision++;
    world.updatedAt = at;
    return result;
  }

  const api = { KINDS, createWorld, apply, points, intervals, canPlace, freePlace };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SstmModel = api;
})(globalThis);
