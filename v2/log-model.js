'use strict';
// A read-only projection of the same records used by sync, exports and statistics.
(function (root) {
  function entries(snapshot, now = Date.now()) {
    const result = [], cycles = (snapshot.cycleJournal?.cycles || []).filter(c => !c.deletedAt);
    const add = entry => { if (Number.isFinite(entry.at) && entry.at > 0) result.push(entry); };
    for (const cycle of cycles) {
      cycle.points.forEach((point, i) => {
        const end = cycle.endedAt !== null && i === cycle.points.length - 1;
        if (cycle.deletedIntervals?.[point.id] && !end) return;
        const mark = (cycle.checkpoints || []).find(p => p.at === point.at) || point;
        add({ id: `point:${cycle.id}:${mark.id}`, at: point.at, kind: i === 0 ? 'cycle-start' : end ? 'cycle-end' : 'interval',
          text: mark.name, stage: end ? '' : cycle.names[point.id] || '', tags: [...new Set([...(mark.tags || []), ...(point.tags || []), ...(cycle.tags?.[point.id] || [])])], cycleId: cycle.id, pointId: mark.id });
      });
      for (const point of cycle.checkpoints || []) {
        if (cycle.points.some(p => p.at === point.at)) continue;
        const boundary = [...cycle.points].reverse().find(p => p.at <= point.at);
        if (cycle.deletedIntervals?.[boundary?.id]) continue;
        add({ id: `point:${cycle.id}:${point.id}`, at: point.at, kind: 'point', text: point.name, tags: point.tags, cycleId: cycle.id, pointId: point.id });
      }
    }
    for (const moment of snapshot.cycleJournal?.moments || []) if (!moment.deletedAt) {
      add({ id: `moment:${moment.id}`, at: moment.at, kind: moment.kind, text: moment.state?.label || moment.source.label,
        tags: moment.tags, pin: moment.source.pin, cellId: moment.source.cellId });
    }
    for (const pin of snapshot.pinData || []) {
      for (const change of pin.counterChangeLog || []) {
        const entry = { id: `count:${pin.pin}:${change.id}`, at: change.at, kind: 'value', text: change.label || pin.habitLabels?.[change.habit] || change.habit,
          before: change.previousValue, value: change.nextValue, delta: change.nextValue - change.previousValue, pin: pin.pin, cellId: change.habit, undone: Boolean(change.undoneAt) };
        add(entry);
        if (change.undoneAt) add({ ...entry, id: `${entry.id}:undo`, at: change.undoneAt, kind: 'undo', undone: false });
      }
      const starts = new Set();
      for (const session of pin.durationSessions || []) {
        const common = { text: session.label || pin.habitLabels?.[session.habit] || session.habit, pin: pin.pin, cellId: session.habit };
        const startKey = `${session.habit}:${session.startTime}`; starts.add(startKey);
        add({ ...common, id: `timer:${pin.pin}:${startKey}`, at: session.startTime, kind: 'timer-start' });
        add({ ...common, id: `timer-end:${pin.pin}:${session.id}`, at: session.endTime, kind: 'timer-end', duration: session.endTime - session.startTime });
      }
      for (const [id, state] of Object.entries(pin.durationStates || {})) if (state.isRunning) {
        const at = state.sessionStartedAt || state.startTime, key = `${id}:${at}`;
        if (!starts.has(key)) add({ id: `timer:${pin.pin}:${key}`, at, kind: 'timer-start', text: pin.habitLabels?.[id] || id, pin: pin.pin, cellId: id, running: true });
      }
    }
    for (const track of snapshot.moduleJournal?.tracks || []) for (const session of [...track.sessions, ...(track.running ? [track.running] : [])]) {
      const common = { text: track.name, pin: session.source.pin, cellId: session.source.cellId };
      add({ ...common, id: `module:${session.id}:start`, at: session.start, kind: 'timer-start', running: session.end === null });
      if (session.end !== null) add({ ...common, id: `module:${session.id}:end`, at: session.end, kind: 'timer-end', duration: session.end - session.start });
    }
    for (const entry of result) {
      const cycle = entry.cycleId ? cycles.find(c => c.id === entry.cycleId) : cycles.find(c => entry.at >= c.startedAt && entry.at < (c.endedAt ?? now + 1));
      entry.elapsed = cycle ? entry.at - cycle.startedAt : null;
      entry.cycleId ??= cycle?.id || null;
      entry.pinName = entry.pin !== undefined ? snapshot.pinNames?.[entry.pin] || `PIN ${entry.pin + 1}` : '';
    }
    return result.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
  }
  function clock(ms) {
    if (ms === null || !Number.isFinite(ms)) return '—';
    const s = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
  }
  const api = { entries, clock }; root.SstmLog = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'object' ? window : globalThis);
