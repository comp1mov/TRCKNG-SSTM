'use strict';

// Read-only projections. Stored weekly totals remain authoritative legacy data.
(function (root) {
  const timeTypes = new Set(['duration_sec', 'duration_min', 'duration_sec_count', 'sleep']);
  const countTypes = new Set(['counter', 'unit', 'value', 'money_income', 'money_budget']);
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function weekDays(startMs) {
    return Array.from({ length: 7 }, (_, index) => {
      const start = new Date(startMs);
      start.setDate(start.getDate() + index);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { startMs: +start, endMs: +end };
    });
  }

  function buildWeek({ startMs, weekKey, habits, sessions = [], changes = [], totals = {}, running = {}, now = Date.now() }) {
    const days = weekDays(startMs);
    const rows = habits.map(habit => {
      const timed = timeTypes.has(habit.type);
      const counted = countTypes.has(habit.type);
      const records = timed
        ? sessions.filter(s => s.habit === habit.id && s.endTime > s.startTime)
        : counted ? changes.filter(e => e.habit === habit.id && !e.undoneAt && Number.isFinite(Number(e.at))) : [];
      const state = running[habit.id];
      const live = timed && state?.isRunning && state.startTime && now > state.startTime
        ? { id: '__running__', habit: habit.id, label: habit.label, startTime: Number(state.startTime), endTime: now, running: true } : null;
      const buckets = days.map(day => {
        const entries = timed
          ? records.filter(s => s.endTime > day.startMs && s.startTime < day.endMs)
          : records.filter(e => e.at >= day.startMs && e.at < day.endMs);
        const value = entries.reduce((sum, entry) => sum + (timed
          ? (Math.min(entry.endTime, day.endMs) - Math.max(entry.startTime, day.startMs)) / 1000
          : number(entry.nextValue) - number(entry.previousValue)), 0);
        const liveSeconds = live ? Math.max(0, Math.min(live.endTime, day.endMs) - Math.max(live.startTime, day.startMs)) / 1000 : 0;
        // An empty retained log cannot prove zero, even when its net sum matches a total.
        return { ...day, value: entries.length ? value : null, entries, liveSeconds };
      });
      const storedTotal = Object.hasOwn(totals, habit.id) ? number(totals[habit.id]) : null;
      return { ...habit, timed, counted, storedTotal, buckets, live,
        active: buckets.some(b => b.entries.length || b.liveSeconds) || (storedTotal !== null && storedTotal !== 0),
        recorded: buckets.reduce((sum, b) => sum + (b.value || 0), 0),
        weekKey };
    });
    return { days, rows };
  }

  function matchesFilter(row, filter) {
    return filter === 'time' ? row.timed : filter === 'counts' ? row.counted : filter === 'active' ? row.active : true;
  }

  // Correct only the changed sessions; never rebuild an archive from a capped log.
  function correctionDelta(before, after, habit, week) {
    const seconds = records => records.filter(s => s.habit === habit && s.week === week)
      .reduce((sum, s) => sum + Math.max(0, Math.floor((s.endTime - s.startTime) / 1000)), 0);
    return seconds(after) - seconds(before);
  }

  const api = { weekDays, buildWeek, matchesFilter, correctionDelta };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HistoryMatrix = api;
})(globalThis);
