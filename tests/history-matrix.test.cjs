const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildWeek, weekDays, matchesFilter, correctionDelta } = require('../history-matrix.js');
const startMs = +new Date(2026, 0, 5);
const day = 86400000;
const habit = { id: 'cell01', label: 'Current label', type: 'duration_min' };
const build = overrides => buildWeek({ startMs, weekKey: '2026W01', habits: [habit], ...overrides }).rows[0];

test('splits a session across midnight and week boundaries without duplicating time', () => {
  const sessions = [{ id: 'a', habit: habit.id, label: 'Old label', startTime: startMs - 3600000, endTime: startMs + 3600000 },
    { id: 'b', habit: habit.id, startTime: startMs + day - 1800000, endTime: startMs + day + 1800000 }];
  const row = build({ sessions });
  assert.equal(row.buckets[0].value, 5400);
  assert.equal(row.buckets[1].value, 1800);
  assert.equal(row.recorded, 7200);
  assert.equal(row.buckets[0].entries[0].label, 'Old label');
  assert.equal(row.label, 'Current label');
  assert.equal(row.buckets[2].value, null);
});

test('retains weekly-only totals and unknown days, even when stored total is zero', () => {
  const row = build({ totals: { cell01: 300 } });
  assert.equal(row.storedTotal, 300);
  assert.ok(row.buckets.every(b => b.value === null));
  assert.equal(build({ totals: { cell01: 0 } }).buckets[0].value, null);
  assert.equal(build({}).storedTotal, null);
});

test('buckets signed value changes, excludes undo, distinguishes recorded zero', () => {
  const changes = [
    { id: 'a', habit: habit.id, at: startMs, previousValue: 0, nextValue: 3 },
    { id: 'b', habit: habit.id, at: startMs + 1, previousValue: 3, nextValue: 0 },
    { id: 'undo', habit: habit.id, at: startMs + 2, previousValue: 0, nextValue: 9, undoneAt: startMs + 3 },
    { id: 'c', habit: habit.id, at: startMs + day, previousValue: 0, nextValue: -2 },
    { id: 'outside', habit: habit.id, at: startMs + 7 * day, previousValue: 0, nextValue: 10 }
  ];
  const row = build({ habits: [{ ...habit, type: 'value' }], changes });
  assert.equal(row.buckets[0].value, 0);
  assert.equal(row.buckets[0].entries.length, 2);
  assert.equal(row.buckets[1].value, -2);
  assert.equal(row.recorded, -2);
  assert.equal(matchesFilter(row, 'counts'), true);
  assert.equal(matchesFilter(row, 'time'), false);
});

test('running time is separate from saved records and totals', () => {
  const row = build({ running: { cell01: { isRunning: true, startTime: startMs + 3600000 } }, now: startMs + 7200000 });
  assert.equal(row.buckets[0].value, null);
  assert.equal(row.buckets[0].liveSeconds, 3600);
  assert.equal(row.recorded, 0);
  assert.equal(matchesFilter(row, 'active'), true);
});

test('correction moves only the edited contribution between legacy weeks', () => {
  const before = [{ habit: habit.id, week: '2026W01', startTime: startMs, endTime: startMs + 3600000 }];
  const after = [{ ...before[0], week: '2026W02', endTime: startMs + 7200000 }];
  assert.equal(correctionDelta(before, after, habit.id, '2026W01'), -3600);
  assert.equal(correctionDelta(before, after, habit.id, '2026W02'), 7200);
  assert.equal(correctionDelta(before, after, 'cell02', '2026W01'), 0);
});

test('local calendar days survive daylight saving changes', () => {
  const previousZone = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const days = weekDays(+new Date(2026, 2, 2));
    assert.equal(days[6].endMs - days[6].startMs, 23 * 3600000);
    assert.equal(new Date(days[6].endMs).getHours(), 0);
    const row = buildWeek({ startMs: days[0].startMs, weekKey: 'spring', habits: [habit], sessions: [
      { id: 'dst', habit: habit.id, startTime: days[6].startMs, endTime: days[6].endMs }
    ] }).rows[0];
    assert.equal(row.recorded, 23 * 3600);
    const autumn = weekDays(+new Date(2026, 9, 26));
    assert.equal(autumn[6].endMs - autumn[6].startMs, 25 * 3600000);
  } finally {
    if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone;
  }
});
