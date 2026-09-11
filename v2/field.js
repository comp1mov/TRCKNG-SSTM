'use strict';

// Interaction for the shared legacy engine. Only the engine commits mutations:
// pointer previews and camera growth never enter account snapshots.
(() => {
  const $ = selector => document.querySelector(selector);
  const grid = $('#layoutGrid'), view = $('#layoutView');
  const cells = () => window.getCellsSnapshot().filter(cell => cell.layout.visible !== false);
  const step = () => Number(document.body.dataset.cellSize || 128);
  const pin = () => $('.pin.active').dataset.pin;
  const stamp = () => JSON.stringify(cells().map(cell => [cell.id, cell.layout]));
  const say = text => { $('#surfaceHint').textContent = text; };
  const limit = 200;
  let drag = null, frame = 0, suppressClick = false, press = null;
  let columns = 5, rows = 5;

  function bounds(extraRow = 0, extraCol = 0) {
    const current = cells();
    columns = Math.min(limit, Math.max(5, extraCol, ...current.map(cell => cell.layout.col + cell.layout.colSpan)));
    rows = Math.min(limit, Math.max(5, extraRow, ...current.map(cell => cell.layout.row + cell.layout.rowSpan)));
    for (const field of [grid, $('#habitsGrid')]) {
      field.style.setProperty('--field-columns', columns);
      field.style.setProperty('--field-rows', rows);
    }
  }

  function decorate() {
    if (drag) cancel();
    bounds();
    const current = cells();
    $('#layoutMeta').textContent = `${current.filter(cell => cell.label.trim()).length} кнопок · поле ${columns * 2} × ${rows * 2}`;
    for (const tile of grid.querySelectorAll('.layout-cell')) {
      if (tile.querySelector('.field-grip')) continue;
      const actions = tile.querySelector('.layout-cell-actions');
      const edit = actions.children[1];
      edit.textContent = tile.dataset.empty === 'true' ? 'СОЗДАТЬ' : 'ПРАВИТЬ';
      const grip = document.createElement('button');
      grip.type = 'button'; grip.className = 'layout-action field-grip'; grip.textContent = '⠿';
      grip.setAttribute('aria-label', 'Переместить кнопку');
      grip.title = 'Потяни за ручку. Или используй стрелки на клавиатуре.';
      // Keep the original editor as the second action for keyboard/UI continuity.
      actions.replaceChildren(grip, edit);
    }
  }

  const add = document.createElement('button'); add.type = 'button'; add.id = 'surfaceAddCell';
  add.className = 'layout-toolbar-btn'; add.textContent = '+ КНОПКА';
  add.onclick = () => window.openNewCellModal();
  $('.layout-actions').prepend(add);
  $('#btnLayoutPack').hidden = true; // Free placement replaces implicit reordering here.
  $('#btnLayoutInfo').hidden = true;
  $('#btnLayoutTheme').textContent = 'ЦВЕТА'; $('#btnLayoutDash').textContent = 'ШКАЛЫ';
  const help = document.createElement('p'); help.className = 'field-help';
  help.textContent = 'Потяни за ⠿, чтобы переместить. На другую кнопку — поменять местами. На пустое поле — добавить.';
  $('.layout-toolbar').append(help);
  $('#surfaceHint').setAttribute('aria-live', 'polite');
  const ruler = document.createElement('div'); ruler.className = 'surface-time-ruler';
  ruler.setAttribute('aria-label', 'Часы календарного дня');
  for (const hour of ['00', '06', '12', '18', '24']) {
    const label = document.createElement('span'); label.textContent = hour; ruler.append(label);
  }
  $('#dayStrip').after(ruler);

  function finish() {
    cancelAnimationFrame(frame);
    const previous = drag; drag = null;
    previous?.ghost.remove(); previous?.tile.classList.remove('field-dragging');
    if (previous?.handle.hasPointerCapture(previous.pointer)) previous.handle.releasePointerCapture(previous.pointer);
    document.body.classList.remove('field-moving');
    bounds();
    return previous;
  }
  function cancel() { if (drag) { suppressClick = drag.moved; finish(); say('Перемещение отменено'); } }

  function preview() {
    if (!drag) return;
    const rect = grid.getBoundingClientRect(), unit = step();
    drag.col = Math.max(1, Math.min(limit - drag.layout.colSpan + 1, Math.round((drag.x - rect.left - drag.offsetX) / unit) + 1));
    drag.row = Math.max(1, Math.min(limit - drag.layout.rowSpan + 1, Math.round((drag.y - rect.top - drag.offsetY) / unit) + 1));
    bounds(Math.max(rows, drag.row + drag.layout.rowSpan), Math.max(columns, drag.col + drag.layout.colSpan));
    const changes = window.getCellMove(drag.id, drag.row, drag.col);
    drag.ghost.style.left = `${(drag.col - 1) * unit}px`; drag.ghost.style.top = `${(drag.row - 1) * unit}px`;
    drag.ghost.style.width = `${drag.layout.colSpan * unit}px`; drag.ghost.style.height = `${drag.layout.rowSpan * unit}px`;
    drag.ghost.dataset.valid = String(Boolean(changes));
    drag.ghost.textContent = changes ? Object.keys(changes).length > 1 ? 'ОБМЕН' : `${drag.col} : ${drag.row}` : 'ЗАНЯТО';
  }
  function autoPan() {
    if (!drag) return;
    if (drag.moved) {
      const rect = view.getBoundingClientRect();
      const speed = (value, low, high) => value < low + 44 ? -12 : value > high - 44 ? 12 : 0;
      const dx = speed(drag.x, rect.left, rect.right), dy = speed(drag.y, rect.top, rect.bottom);
      if (dx > 0 && view.scrollLeft + view.clientWidth >= view.scrollWidth - 24) bounds(rows, columns + 1);
      if (dy > 0 && view.scrollTop + view.clientHeight >= view.scrollHeight - 24) bounds(rows + 1, columns);
      if (dx || dy) { view.scrollBy(dx, dy); preview(); }
    }
    frame = requestAnimationFrame(autoPan);
  }
  grid.addEventListener('pointerdown', event => {
    suppressClick = false;
    press = { x: event.clientX, y: event.clientY };
    if (event.button !== 0) return;
    const tile = event.target.closest('.layout-cell'); if (!tile) return;
    const grip = event.target.closest('.field-grip');
    if (event.target.closest('button') && !grip || event.pointerType === 'touch' && !grip) return;
    const handle = grip || tile, cell = cells().find(item => item.id === tile.dataset.cellId);
    if (!cell) return;
    const rect = tile.getBoundingClientRect(), ghost = document.createElement('div');
    ghost.className = 'field-ghost'; ghost.hidden = true; grid.append(ghost);
    drag = { id: cell.id, layout: cell.layout, pin: pin(), stamp: stamp(), pointer: event.pointerId,
      x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, tile, handle, ghost, moved: false };
    handle.setPointerCapture(event.pointerId);
    frame = requestAnimationFrame(autoPan);
  });
  grid.addEventListener('pointermove', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.moved && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
    drag.moved = true; drag.ghost.hidden = false; drag.tile.classList.add('field-dragging');
    document.body.classList.add('field-moving'); preview();
  });
  grid.addEventListener('pointerup', event => {
    if (!drag || drag.pointer !== event.pointerId) { setTimeout(() => { suppressClick = false; }, 0); return; }
    const previous = finish();
    if (!previous.moved) return;
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    if (previous.pin !== pin() || previous.stamp !== stamp()) { say('Поле изменилось. Повтори перемещение.'); return; }
    const ok = window.moveCellTo(previous.id, previous.row, previous.col);
    say(ok ? 'Расположение сохранено' : 'Здесь не хватает места — выбери свободный участок');
    requestAnimationFrame(() => grid.querySelector(`[data-cell-id="${previous.id}"] .field-grip`)?.focus({ preventScroll: true }));
  });
  grid.addEventListener('pointercancel', cancel);
  grid.addEventListener('lostpointercapture', cancel);
  grid.addEventListener('click', event => {
    if (suppressClick || event.target.closest('.field-grip')) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (event.target !== grid || press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) return;
    const rect = grid.getBoundingClientRect();
    window.openNewCellModal(Math.floor((event.clientY - rect.top) / step()) + 1, Math.floor((event.clientX - rect.left) / step()) + 1);
  }, true);
  grid.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancel(); return; }
    const tile = event.target.closest('.layout-cell');
    if (!tile || event.target.closest('button:not(.field-grip)')) return;
    const delta = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
    if (!delta) return;
    event.preventDefault(); cancel();
    const cell = cells().find(item => item.id === tile.dataset.cellId);
    if (!cell) return;
    const ok = window.moveCellTo(cell.id, cell.layout.row + delta[0], cell.layout.col + delta[1]);
    say(ok ? 'Расположение сохранено' : 'Здесь не хватает места');
    decorate();
    grid.querySelector(`[data-cell-id="${cell.id}"] .field-grip`)?.focus();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
  window.addEventListener('blur', cancel);
  document.querySelectorAll('.pin,.view-tab').forEach(button => button.addEventListener('pointerdown', cancel));
  // Ignore our own ghost additions; only an engine rerender replaces real cells.
  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.classList?.contains('layout-cell')))) decorate();
  }).observe(grid, { childList: true });
  new MutationObserver(() => { cancel(); bounds(); }).observe(document.body, { attributes: true, attributeFilter: ['data-cell-size', 'data-view'] });
  decorate();
})();
