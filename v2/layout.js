'use strict';
// Pure placement planning: reserve the requested rectangle, then move only
// intersecting neighbours along one axis. Nothing is committed by a preview.
(function (root) {
  const overlaps = (a, b) => a.row < b.row + b.rowSpan && b.row < a.row + a.rowSpan && a.col < b.col + b.colSpan && b.col < a.col + a.colSpan;
  const inside = (r, limit) => ['row', 'col', 'rowSpan', 'colSpan'].every(k => Number.isInteger(r[k]) && r[k] > 0) && r.row + r.rowSpan - 1 <= limit && r.col + r.colSpan - 1 <= limit;
  function plan(cells, id, target, limit = 200) {
    if (!inside(target, limit)) return null;
    const others = cells.filter(c => c.id !== id && c.layout.visible !== false);
    const attempt = axis => {
      const span = axis === 'col' ? 'colSpan' : 'rowSpan', cross = axis === 'col' ? 'row' : 'col';
      const placed = [target], changes = { [id]: { ...target } }; let distance = 0;
      for (const cell of [...others].sort((a, b) => a.layout[axis] - b.layout[axis] || a.layout[cross] - b.layout[cross] || a.id.localeCompare(b.id))) {
        const next = { ...cell.layout };
        let hits;
        while ((hits = placed.filter(r => overlaps(next, r))).length) {
          next[axis] = Math.max(...hits.map(r => r[axis] + r[span]));
          if (!inside(next, limit)) return null;
        }
        placed.push(next);
        if (next[axis] !== cell.layout[axis]) { changes[cell.id] = next; distance += next[axis] - cell.layout[axis]; }
      }
      return { changes, distance };
    };
    const right = attempt('col'), down = attempt('row');
    return (!right ? down : !down || right.distance <= down.distance ? right : down)?.changes || null;
  }
  const api = { plan, overlaps };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TRCKNG_LAYOUT = api;
})(globalThis);
