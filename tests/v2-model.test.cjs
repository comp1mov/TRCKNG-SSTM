const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../v2/model.js');
const at = 1000000;

test('point presses keep one total clock; end is explicit and names do not create time', () => {
  const world = M.createWorld(), module = world.modules[0], track = world.tracks[0];
  M.apply(world, { type: 'capture', moduleId: module.id, at });
  M.apply(world, { type: 'capture', moduleId: module.id, at: at + 10000 });
  assert.equal(world.cycles.length, 1);
  assert.equal(world.cycles[0].startedAt, at);
  const interval = M.intervals(world, track.id)[0];
  M.apply(world, { type: 'annotateInterval', trackId: track.id, intervalId: interval.id, name: 'Transit', version: 0 });
  assert.equal(M.intervals(world, track.id)[0].milliseconds, 10000);
  assert.equal(world.events.length, 2);
  M.apply(world, { type: 'endCycle', moduleId: module.id, at: at + 20000 });
  assert.equal(track.activeCycleId, null);
  assert.equal(world.events.length, 3);
  M.apply(world, { type: 'capture', moduleId: module.id, at: at + 30000 });
  assert.equal(world.cycles.length, 2);
  assert.equal(M.intervals(world, track.id).length, 2, 'No interval across separate cycles');
});

test('another control across PINs uses the same track without duplicate records', () => {
  const world = M.createWorld();
  const a = M.apply(world, { type: 'add', pinId: world.pins[0].id, kind: 'count', title: 'Count' });
  const b = M.apply(world, { type: 'add', pinId: world.pins[1].id, trackId: a.trackId, title: 'Count elsewhere' });
  M.apply(world, { type: 'capture', moduleId: a.id, at });
  M.apply(world, { type: 'capture', moduleId: b.id, at: at + 1 });
  assert.equal(world.tracks.find(t => t.id === a.trackId).value, 2);
  assert.equal(world.events.length, 2);
  assert.notEqual(a.id, b.id);
  assert.notEqual(world.events[0].pinId, world.events[1].pinId);
});

test('layout edits reject collisions and stale drafts without changing records', () => {
  const world = M.createWorld(), module = world.modules[0];
  const other = M.apply(world, { type: 'add', pinId: module.pinId, kind: 'count' });
  assert.throws(() => M.apply(world, { type: 'layout', moduleId: other.id, x: 0, y: 0, width: 1, height: 1, version: 0 }), /пересекается/);
  M.apply(world, { type: 'layout', moduleId: module.id, x: 4, y: 4, width: 2, height: 2, title: 'Changed', version: 0 });
  assert.throws(() => M.apply(world, { type: 'layout', moduleId: module.id, x: 6, y: 6, width: 2, height: 2, version: 0 }), /изменились/);
  assert.equal(module.x, 4);
  assert.equal(world.events.length, 0);
});

test('timer survives serialized reload and only stopping records its interval', () => {
  let world = M.createWorld();
  const module = M.apply(world, { type: 'add', pinId: world.pins[0].id, kind: 'timer' });
  M.apply(world, { type: 'capture', moduleId: module.id, at });
  assert.equal(world.events.length, 0);
  world = JSON.parse(JSON.stringify(world));
  M.apply(world, { type: 'capture', moduleId: module.id, at: at + 60000 });
  const track = world.tracks.find(t => t.id === module.trackId);
  assert.equal(track.accumulatedMs, 60000);
  assert.equal(track.runningSince, null);
  assert.equal(world.events.length, 1);
});

test('value writes preserve zero, reject empty input, and check concurrent edits', () => {
  const world = M.createWorld();
  const module = M.apply(world, { type: 'add', pinId: world.pins[0].id, kind: 'value' });
  assert.throws(() => M.apply(world, { type: 'setValue', moduleId: module.id, value: '' }), /число/);
  M.apply(world, { type: 'setValue', moduleId: module.id, value: 0, version: 0 });
  assert.equal(world.events[0].value, 0);
  assert.throws(() => M.apply(world, { type: 'setValue', moduleId: module.id, value: 10, version: 0 }), /изменились/);
});
