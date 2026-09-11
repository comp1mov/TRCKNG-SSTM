'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const field = $('#field'), viewport = $('#fieldViewport'), layer = $('#moduleLayer');
  const panelHost = $('#panelHost');
  const UI_KEY = 'trckng_v2_alpha_ui';
  const names = { points: 'ТОЧКИ', count: 'СЧЁТЧИК', value: 'ЗНАЧЕНИЕ', timer: 'ТАЙМЕР' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const duration = milliseconds => {
    const s = Math.max(0, Math.floor(milliseconds / 1000));
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  const timestamp = at => new Date(at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let world, active = null, selected = null, arranging = false, drag = null, pending = 0, scrollTimer;
  const windows = new Map();
  let ui = { pinId: null, cameras: {}, drafts: {}, docks: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY));
    if (saved && Array.isArray(saved.docks) && saved.cameras && saved.drafts) ui = saved;
  } catch (_) { /* A malformed local camera/draft must not affect the database. */ }
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('trckng-v2-alpha') : null;
  const pin = () => world.pins.find(p => p.id === ui.pinId) || world.pins[0];
  const moduleById = id => world.modules.find(m => m.id === id);
  const trackOf = module => world.tracks.find(t => t.id === module?.trackId);
  const camera = () => {
    const c = ui.cameras[pin().id] ||= { x: 0, y: 0, zoom: 64 };
    c.zoom = [48, 64, 80, 96].includes(c.zoom) ? c.zoom : 64;
    c.x = Math.max(0, Math.min(pin().columns - 1, Number(c.x) || 0));
    c.y = Math.max(0, Math.min(pin().rows - 1, Number(c.y) || 0));
    return c;
  };
  const step = () => camera().zoom;
  const descriptor = w => ({ key: w.key, kind: w.kind, pinId: w.pinId, moduleId: w.moduleId, eventId: w.eventId, intervalId: w.intervalId, trackId: w.trackId });

  function notice(message = '') { $('#notice').textContent = message; $('#notice').hidden = !message; }
  function saveUI() {
    try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); }
    catch (_) { notice('Не удалось сохранить положение окон и черновики. Записи хранятся отдельно.'); }
  }
  async function commit(command) {
    pending++; $('#saveState').textContent = 'СОХРАНЕНИЕ…'; notice();
    let failed = false;
    try {
      const saved = await SstmStore.transact({ at: Date.now(), ...command });
      accept(saved.world);
      channel?.postMessage(saved.world.revision);
      return saved.result || true;
    } catch (error) { failed = true; notice(error.message || 'Не удалось сохранить. Повтори действие.'); return false; }
    finally { pending--; $('#saveState').textContent = pending ? 'СОХРАНЕНИЕ…' : failed ? 'НЕ СОХРАНЕНО' : 'ЛОКАЛЬНО'; }
  }
  function accept(next) {
    if (world && next.revision < world.revision) return;
    world = next;
    ui.pinId = pin().id;
    if (!drag) renderField();
    renderChrome();
    for (const w of windows.values()) if (w.kind === 'history') renderHistory(w);
    updateClocks();
  }
  async function refresh() {
    if (!world) return;
    try { accept((await SstmStore.transact(null)).world); } catch (error) { notice(error.message); }
  }
  if (channel) channel.onmessage = refresh;
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); updateClocks(); } });

  function renderChrome() {
    $('#pins').innerHTML = world.pins.map(p => `<button type="button" data-pin="${p.id}" aria-pressed="${p.id === pin().id}">${escape(p.name)}</button>`).join('');
    $('#pins').querySelectorAll('button').forEach(b => b.onclick = () => switchPin(b.dataset.pin));
    const select = $('#areaSelect');
    const value = select.value;
    select.innerHTML = '<option value="home">НАЧАЛО</option>' + world.views.filter(v => v.pinId === pin().id)
      .map(v => `<option value="${v.id}">${escape(v.name)}</option>`).join('');
    if ([...select.options].some(option => option.value === value)) select.value = value;
    $('#zoomValue').textContent = `${Math.round(step() / 64 * 100)}%`;
    $('#zoomOut').disabled = step() <= 48;
    $('#zoomIn').disabled = step() >= 96;
    $('#arrangeButton').setAttribute('aria-pressed', String(arranging));
    $('#arrangeButton').textContent = arranging ? 'ГОТОВО' : 'РАССТАВИТЬ';
    $('#modeHint').textContent = arranging ? 'Тяни кнопку · нажми для настроек' : '';
    document.body.classList.toggle('arranging', arranging);
    updateCoordinates();
  }
  function renderField() {
    const focused = document.activeElement?.dataset.moduleId;
    const p = pin();
    field.style.setProperty('--step', `${step()}px`);
    field.style.width = `${p.columns * step()}px`;
    field.style.height = `${p.rows * step()}px`;
    layer.replaceChildren();
    world.modules.filter(m => m.pinId === p.id).forEach(module => {
      const track = trackOf(module);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'pad'; button.dataset.moduleId = module.id;
      button.dataset.kind = track.kind; button.dataset.selected = String(selected === module.id);
      Object.assign(button.style, { left: `${module.x * step()}px`, top: `${module.y * step()}px`, width: `${module.width * step()}px`, height: `${module.height * step()}px` });
      button.innerHTML = `<span class="pad-inner"><span class="pad-value"></span>${track.kind === 'points' && module.height > 1 ? '<span class="pad-status"></span>' : ''}<span class="pad-label">${escape(module.title)}</span></span>`;
      button.setAttribute('aria-label', `${module.title} · ${names[track.kind]}`);
      button.onclick = event => {
        if (button.dataset.dragged === 'true') { delete button.dataset.dragged; return; }
        selected = module.id;
        if (arranging) openWindow({ kind: 'settings', moduleId: module.id, pinId: module.pinId });
        else if (track.kind === 'value') openWindow({ kind: 'value', moduleId: module.id, pinId: module.pinId });
        else commit({ type: 'capture', moduleId: module.id, at: Date.now() });
      };
      button.addEventListener('pointerdown', event => startDrag(event, module, button));
      button.addEventListener('keydown', async event => {
        if (!arranging || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const current = moduleById(module.id);
        selected = module.id;
        const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
        const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
        await commit({ type: 'layout', moduleId: current.id, version: current.version, ...layoutOf(current), x: current.x + dx, y: current.y + dy });
        revealModule(moduleById(module.id));
      });
      layer.append(button);
    });
    if (focused) layer.querySelector(`[data-module-id="${focused}"]`)?.focus({ preventScroll: true });
    updateClocks();
  }
  function updateClocks() {
    if (!world || document.hidden) return;
    const now = Date.now();
    layer.querySelectorAll('.pad').forEach(button => {
      const module = moduleById(button.dataset.moduleId), track = trackOf(module);
      let value, running = false;
      if (track.kind === 'points') {
        const cycle = world.cycles.find(c => c.id === track.activeCycleId);
        value = cycle ? duration(now - cycle.startedAt) : 'СТАРТ';
        running = Boolean(cycle);
        const status = button.querySelector('.pad-status');
        if (status) status.textContent = cycle ? `${SstmModel.points(world, track.id, cycle.id).length} ТОЧЕК · + ТОЧКА` : 'ПЕРВОЕ НАЖАТИЕ';
      } else if (track.kind === 'timer') {
        running = track.runningSince !== null;
        value = duration(track.accumulatedMs + (running ? now - track.runningSince : 0));
      } else value = String(track.value || 0);
      button.querySelector('.pad-value').textContent = value;
      button.dataset.running = String(running);
      button.title = `${module.title} · ${value}${running ? ' · идёт' : ''}`;
    });
    const module = moduleById(selected) || world.modules.find(m => m.pinId === pin().id && trackOf(m)?.kind === 'points');
    const track = trackOf(module), cycle = world.cycles.find(c => c.id === track?.activeCycleId);
    $('#cycleClock').textContent = cycle ? `ЦИКЛ +${duration(now - cycle.startedAt)}` : 'ПОЛЕ';
    for (const w of windows.values()) if (w.kind === 'history' && w.el.isConnected) {
      const clock = w.el.querySelector('[data-live-cycle]');
      const activeCycle = world.cycles.find(c => c.id === clock?.dataset.liveCycle);
      if (clock && activeCycle) clock.textContent = `ЦИКЛ +${duration(now - activeCycle.startedAt)}`;
    }
  }
  function layoutOf(module) { return { x: module.x, y: module.y, width: module.width, height: module.height, title: module.title }; }
  function rememberCamera() {
    if (!world || !viewport.clientWidth) return;
    Object.assign(camera(), { x: viewport.scrollLeft / step(), y: viewport.scrollTop / step() });
  }
  function restoreCamera() { viewport.scrollTo({ left: camera().x * step(), top: camera().y * step(), behavior: 'instant' }); updateCoordinates(); }
  function updateCoordinates() {
    if (!world) return;
    const c = camera();
    $('#coordinates').textContent = `${Math.floor(c.x) + 1}:${Math.floor(c.y) + 1} / ${pin().columns}×${pin().rows}`;
    document.querySelectorAll('[data-pan]').forEach(b => {
      const [dx, dy] = b.dataset.pan.split(',').map(Number);
      b.disabled = !viewport.clientWidth || (dx < 0 && viewport.scrollLeft <= 0) || (dy < 0 && viewport.scrollTop <= 0) ||
        (dx > 0 && viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 1) || (dy > 0 && viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1);
    });
  }
  viewport.addEventListener('scroll', () => {
    rememberCamera(); updateCoordinates(); clearTimeout(scrollTimer); scrollTimer = setTimeout(saveUI, 150);
  });
  new ResizeObserver(() => { if (world && viewport.clientWidth) restoreCamera(); }).observe(viewport);
  function revealModule(module) {
    if (!module) return;
    camera().x = module.x; camera().y = module.y;
    restoreCamera(); rememberCamera(); saveUI();
  }
  function switchPin(pinId) {
    if (!world.pins.some(p => p.id === pinId)) return;
    rememberCamera(); if (active) parkWindow(false, false);
    ui.pinId = pinId; selected = null;
    renderField(); renderChrome(); restoreCamera(); saveUI();
  }
  function startDrag(event, module, button) {
    if (!arranging || event.button !== 0 || drag) return;
    selected = module.id;
    drag = { id: module.id, version: module.version, button, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY,
      startScrollX: viewport.scrollLeft, startScrollY: viewport.scrollTop, original: layoutOf(module), layout: layoutOf(module), moved: false };
    button.setPointerCapture(event.pointerId);
    const move = e => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.clientX + viewport.scrollLeft - drag.startScrollX;
      const dy = e.clientY - drag.clientY + viewport.scrollTop - drag.startScrollY;
      if (Math.hypot(dx, dy) < 6 && !drag.moved) return;
      drag.moved = true;
      drag.layout.x = drag.original.x + Math.round(dx / step());
      drag.layout.y = drag.original.y + Math.round(dy / step());
      const ghost = $('#dragGhost'); ghost.hidden = false;
      Object.assign(ghost.style, { left: `${drag.layout.x * step()}px`, top: `${drag.layout.y * step()}px`, width: `${module.width * step()}px`, height: `${module.height * step()}px` });
      ghost.dataset.valid = String(SstmModel.canPlace(world, module.pinId, drag.layout, module.id));
    };
    const finish = async e => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const finished = drag; drag = null;
      button.removeEventListener('pointermove', move); button.removeEventListener('pointerup', finish); button.removeEventListener('pointercancel', finish);
      button.removeEventListener('lostpointercapture', finish);
      $('#dragGhost').hidden = true;
      if (finished.moved) {
        button.dataset.dragged = 'true';
        if (e.type === 'pointerup') await commit({ type: 'layout', moduleId: module.id, version: finished.version, ...finished.layout });
        renderField();
      }
    };
    button.addEventListener('pointermove', move); button.addEventListener('pointerup', finish); button.addEventListener('pointercancel', finish); button.addEventListener('lostpointercapture', finish);
  }

  function windowTitle(w) {
    const module = moduleById(w.moduleId);
    return ({ settings: module?.title || 'НАСТРОЙКИ', value: module?.title || 'ЗНАЧЕНИЕ', add: '+ КНОПКА', history: 'ИСТОРИЯ',
      menu: 'МЕНЮ', area: 'ЗАПОМНИТЬ ОБЛАСТЬ', record: 'НАЗВАНИЕ ТОЧКИ', interval: 'НАЗВАНИЕ ОТРЕЗКА' })[w.kind];
  }
  function openWindow(spec) {
    spec = { pinId: pin().id, ...spec };
    spec.key ||= `${spec.kind}:${spec.moduleId || spec.eventId || spec.intervalId || spec.pinId}`;
    if (active?.key === spec.key) return;
    if (active && active.key !== spec.key) parkWindow(false, false);
    if (spec.pinId !== pin().id) switchPin(spec.pinId);
    let w = windows.get(spec.key);
    if (!w) {
      w = { ...spec, opener: document.activeElement };
      w.el = document.createElement('section'); w.el.className = 'panel';
      w.el.innerHTML = `<div class="panel-head"><h1>${escape(windowTitle(w))}</h1><button type="button" data-minimize aria-label="Свернуть окно">—</button><button type="button" data-close aria-label="Закрыть окно">×</button></div><div class="panel-body"></div>`;
      w.body = w.el.querySelector('.panel-body'); windows.set(w.key, w);
      w.el.querySelector('[data-minimize]').onclick = () => parkWindow(false);
      w.el.querySelector('[data-close]').onclick = () => parkWindow(true);
      buildWindow(w);
    }
    if (!ui.docks.some(d => d.key === w.key)) ui.docks.push(descriptor(w));
    active = w; panelHost.replaceChildren(w.el); panelHost.hidden = false;
    renderTabs(); saveUI(); updateCoordinates();
    requestAnimationFrame(() => {
      w.body.scrollTop = w.scrollTop || 0;
      w.el.querySelector('input, select, button')?.focus({ preventScroll: true });
      updateClocks();
    });
  }
  function parkWindow(close, returnFocus = true) {
    if (!active) return;
    const w = active; w.scrollTop = w.body.scrollTop; w.el.remove(); active = null;
    if (close) ui.docks = ui.docks.filter(d => d.key !== w.key);
    panelHost.hidden = true; renderTabs(); saveUI();
    requestAnimationFrame(() => { restoreCamera(); if (returnFocus) (w.opener?.isConnected && w.opener.offsetParent !== null ? w.opener : $('#historyButton')).focus({ preventScroll: true }); });
  }
  function renderTabs() {
    const tabs = $('#windowTabs'); tabs.replaceChildren();
    ui.docks.filter(d => d.key !== active?.key).forEach(d => {
      const w = windows.get(d.key) || d;
      const p = world.pins.find(p => p.id === w.pinId);
      if (!p) return;
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = `${windowTitle(w)} / ${p.name}${ui.drafts[w.key] ? ' *' : ''} ↗`;
      button.onclick = () => { openWindow(w); if (w.body) w.body.scrollTop = w.scrollTop || 0; };
      tabs.append(button);
    });
    tabs.hidden = tabs.childElementCount === 0;
  }
  function finishForm(w) {
    delete ui.drafts[w.key]; ui.docks = ui.docks.filter(d => d.key !== w.key);
    if (active?.key === w.key) parkWindow(true);
    windows.delete(w.key); renderTabs(); saveUI();
  }
  function form(w, markup, defaults, submit) {
    const retained = ui.drafts[w.key];
    const initial = retained?.values || defaults;
    w.body.innerHTML = `<div class="draft-label" ${retained ? '' : 'hidden'}>ЧЕРНОВИК · не применён</div><form>${markup}<div class="panel-actions"><button class="primary" type="submit">СОХРАНИТЬ</button><button type="button" data-discard>ЗАГРУЗИТЬ СОХРАНЁННОЕ</button></div></form>`;
    const f = w.body.querySelector('form');
    const read = () => Object.fromEntries([...f.elements].filter(el => el.name).map(el => [el.name, el.value]));
    Object.entries(initial).forEach(([key, value]) => { if (f.elements.namedItem(key)) f.elements.namedItem(key).value = value; });
    w.baseVersion = retained?.version ?? defaults.version;
    const saveDraft = () => {
      ui.drafts[w.key] = { ...descriptor(w), version: w.baseVersion, values: read() };
      w.body.querySelector('.draft-label').hidden = false; saveUI(); renderTabs();
    };
    f.addEventListener('input', saveDraft); f.addEventListener('change', saveDraft);
    f.onsubmit = async event => {
      event.preventDefault(); const button = f.querySelector('[type=submit]');
      if (button.disabled) return; button.disabled = true;
      try { await submit(read(), w.baseVersion); } finally { button.disabled = false; }
    };
    f.querySelector('[data-discard]').onclick = () => { delete ui.drafts[w.key]; saveUI(); buildWindow(w); renderTabs(); };
    return f;
  }
  const input = (name, label, type = 'text', attrs = '') => `<label>${label}<input name="${name}" type="${type}" ${attrs}></label>`;
  function buildWindow(w) {
    if (w.kind === 'settings') {
      const module = moduleById(w.moduleId);
      form(w, `${input('title', 'Название кнопки', 'text', 'maxlength="60"')}<p>${names[trackOf(module).kind]} · поле ${escape(world.pins.find(p => p.id === module.pinId).name)}</p>
        <div class="pair">${input('column', 'Колонка', 'number', 'min="1" max="200" required')}${input('row', 'Строка', 'number', 'min="1" max="200" required')}</div>
        <div class="pair">${input('width', 'Ширина в клетках', 'number', 'min="1" max="4" required')}${input('height', 'Высота в клетках', 'number', 'min="1" max="4" required')}</div>`,
      { ...layoutOf(module), column: module.x + 1, row: module.y + 1, version: module.version }, async (values, version) => {
        if (await commit({ type: 'layout', moduleId: module.id, version, title: values.title, x: Number(values.column) - 1, y: Number(values.row) - 1, width: Number(values.width), height: Number(values.height) })) {
          finishForm(w); revealModule(moduleById(module.id));
        }
      });
    } else if (w.kind === 'add') {
      const markup = `<label>Тип<select name="kind">${SstmModel.KINDS.map(kind => `<option value="${kind}">${names[kind]}</option>`).join('')}</select></label>
        <label>Что отслеживать<select name="trackId"><option value="">НОВЫЙ ПОКАЗАТЕЛЬ</option>${world.tracks.map(t => `<option value="${t.id}">${escape(t.name)} · ${names[t.kind]}</option>`).join('')}</select></label>${input('title', 'Название кнопки', 'text', 'maxlength="60" placeholder="Можно оставить пустым"')}`;
      const f = form(w, markup, { kind: 'count', title: '', trackId: '' }, async values => {
        const module = await commit({ type: 'add', pinId: w.pinId, kind: values.kind, title: values.title, trackId: values.trackId,
          origin: { x: Math.floor(camera().x), y: Math.floor(camera().y) } });
        if (module) { finishForm(w); selected = module.id; revealModule(module); renderField(); }
      });
      const syncKind = () => {
        const track = world.tracks.find(t => t.id === f.elements.trackId.value);
        f.elements.kind.disabled = Boolean(track); if (track) f.elements.kind.value = track.kind;
      };
      f.elements.trackId.addEventListener('change', syncKind); syncKind();
    } else if (w.kind === 'value') {
      const module = moduleById(w.moduleId), track = trackOf(module);
      form(w, input('value', 'Новое значение', 'number', 'step="any" required'), { value: track.value || 0, version: track.version }, async (values, version) => {
        if (await commit({ type: 'setValue', moduleId: module.id, value: values.value, version })) finishForm(w);
      });
    } else if (w.kind === 'history') {
      w.trackId ||= trackOf(moduleById(selected))?.id || trackOf(world.modules.find(m => m.pinId === w.pinId))?.id;
      w.body.innerHTML = '<label>Кнопка / показатель<select data-history-track></select></label><div data-history-content></div>';
      w.body.querySelector('select').onchange = e => { w.trackId = e.target.value; renderHistory(w); };
      renderHistory(w);
    } else if (w.kind === 'record' || w.kind === 'interval') {
      const interval = w.kind === 'interval' ? SstmModel.intervals(world, w.trackId).find(i => i.id === w.intervalId) : null;
      const event = w.kind === 'record' ? world.events.find(e => e.id === w.eventId) : null;
      if (!interval && !event) { w.body.textContent = 'Запись недоступна.'; return; }
      const data = event || world.intervalNotes[interval.id] || { name: '', version: 0 };
      const meta = interval ? `${timestamp(interval.start.at)} → ${timestamp(interval.end.at)} · ${duration(interval.milliseconds)}` : timestamp(event.at);
      form(w, `<p>${escape(meta)}</p>${input('name', 'Название', 'text', 'maxlength="60" placeholder="Можно оставить пустым"')}`,
        { name: data.name || '', version: data.version }, async (values, version) => {
          const command = interval ? { type: 'annotateInterval', trackId: w.trackId, intervalId: interval.id } : { type: 'annotate', eventId: event.id };
          if (await commit({ ...command, name: values.name, version })) finishForm(w);
        });
    } else if (w.kind === 'area') {
      const c = ui.drafts[w.key]?.values || { ...camera() };
      form(w, `<p>Область от ${Math.floor(c.x) + 1}:${Math.floor(c.y) + 1}. Масштаб ${Math.round(c.zoom / 64 * 100)}%.</p><input name="x" type="hidden"><input name="y" type="hidden"><input name="zoom" type="hidden">${input('name', 'Название области', 'text', 'maxlength="60" required')}`, { name: '', x: c.x, y: c.y, zoom: c.zoom }, async values => {
        if (await commit({ type: 'view', pinId: w.pinId, name: values.name, x: Number(values.x), y: Number(values.y), zoom: Number(values.zoom) })) finishForm(w);
      });
    } else if (w.kind === 'menu') {
      w.body.innerHTML = `<div class="menu-actions"><button type="button" data-action="area">ЗАПОМНИТЬ ОБЛАСТЬ</button><button type="button" data-action="grow">УВЕЛИЧИТЬ ПОЛЕ +5</button><button type="button" data-action="backup">СКАЧАТЬ КОПИЮ ПРОБЫ</button><a href="../">ОТКРЫТЬ v1 ↗</a></div><hr><p>v2 / 0.1 · локальная проба</p><p>Записи сохраняются в этом браузере. Перенос из v1, восстановление копии и синхронизация устройств ещё не подключены.</p><p>Точки, счётчик, значение, таймер. Остальные типы добавим следующими этапами.</p>`;
      w.body.querySelector('[data-action=area]').onclick = () => openWindow({ kind: 'area' });
      w.body.querySelector('[data-action=grow]').onclick = async () => {
        if (await commit({ type: 'grow', pinId: w.pinId })) { parkWindow(true); notice(`Поле увеличено до ${pin().columns}×${pin().rows}.`); }
      };
      w.body.querySelector('[data-action=backup]').onclick = () => {
        const blob = new Blob([JSON.stringify({ format: 'sstm-local-alpha-backup', exportedAt: Date.now(), world }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = `sstm-v2-probe-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
    }
  }
  function renderHistory(w) {
    const select = w.body.querySelector('[data-history-track]'); if (!select) return;
    const modules = world.modules.filter(m => m.pinId === w.pinId);
    const tracks = [...new Set(modules.map(m => m.trackId))].map(id => world.tracks.find(t => t.id === id));
    select.innerHTML = tracks.map(t => `<option value="${t.id}">${escape(modules.find(m => m.trackId === t.id).title)}</option>`).join('');
    if (!tracks.some(t => t.id === w.trackId)) w.trackId = tracks[0]?.id;
    select.value = w.trackId || '';
    const host = w.body.querySelector('[data-history-content]');
    const track = world.tracks.find(t => t.id === w.trackId);
    if (!track) { host.innerHTML = '<p>На этом поле пока нет кнопок.</p>'; return; }
    const events = world.events.filter(e => e.trackId === track.id).slice().sort((a, b) => b.at - a.at);
    if (track.kind === 'points') {
      const cycle = world.cycles.find(c => c.id === track.activeCycleId);
      const intervals = SstmModel.intervals(world, track.id);
      host.innerHTML = `${cycle ? `<p data-live-cycle="${cycle.id}">ЦИКЛ +${duration(Date.now() - cycle.startedAt)}</p><button type="button" data-end-cycle>ЗАВЕРШИТЬ ЦИКЛ</button><p>Добавит конечную точку. Следующее нажатие на поле начнёт новый цикл.</p>` : '<p>Нажатие на кнопку начинает цикл.</p>'}
        ${events.length ? '<ul class="history-items"></ul>' : '<p>Пока нет точек. Первое нажатие запустит отсчёт.</p>'}`;
      const list = host.querySelector('ul');
      let lastCycle = null;
      for (const event of events) {
        if (event.cycleId !== lastCycle) {
          const cycles = world.cycles.filter(c => c.trackId === track.id);
          const c = cycles.find(c => c.id === event.cycleId);
          const heading = document.createElement('li'); heading.className = 'cycle-heading';
          heading.textContent = `ЦИКЛ ${String(cycles.indexOf(c) + 1).padStart(2, '0')} · ${c.endedAt ? duration(c.endedAt - c.startedAt) : 'ИДЁТ'}`;
          list.append(heading); lastCycle = event.cycleId;
        }
        const interval = intervals.find(i => i.end.id === event.id);
        if (interval) addRecordButton(list, interval.name || 'ОТРЕЗОК', `${duration(interval.milliseconds)} · ${timestamp(interval.start.at)} → ${timestamp(interval.end.at)}`, () => openWindow({ kind: 'interval', pinId: w.pinId, intervalId: interval.id, trackId: track.id }));
        addRecordButton(list, event.name || 'ТОЧКА', `${timestamp(event.at)} · ${escapePin(event.pinId)}`, () => openWindow({ kind: 'record', pinId: w.pinId, eventId: event.id }));
      }
      host.querySelector('[data-end-cycle]')?.addEventListener('click', async e => {
        e.currentTarget.disabled = true;
        const module = modules.find(m => m.trackId === track.id);
        await commit({ type: 'endCycle', moduleId: module.id }); renderHistory(w);
      });
    } else {
      host.innerHTML = '<ul class="history-items"></ul>';
      if (!events.length) host.innerHTML = '<p>Пока нет завершённых записей.</p>';
      const list = host.querySelector('ul');
      for (const event of events) {
        const li = document.createElement('li');
        li.className = 'record-button';
        li.textContent = event.kind === 'duration' ? `${duration(event.end - event.at)} · ${timestamp(event.at)} → ${timestamp(event.end)}` : `${event.previous} → ${event.value} · ${timestamp(event.at)}`;
        list.append(li);
      }
      if (track.kind === 'timer' && track.runningSince !== null) host.insertAdjacentHTML('afterbegin', '<p>Таймер идёт. Завершить отрезок можно повторным нажатием на кнопку поля.</p>');
    }
    updateClocks();
  }
  function escapePin(pinId) { return world.pins.find(p => p.id === pinId)?.name || ''; }
  function addRecordButton(list, title, subtitle, action) {
    const li = document.createElement('li'), button = document.createElement('button');
    button.type = 'button'; button.className = 'record-button';
    button.append(document.createTextNode(title));
    const span = document.createElement('span'); span.textContent = subtitle; button.append(span);
    button.onclick = action; li.append(button); list.append(li);
  }

  $('#menuButton').onclick = () => openWindow({ kind: 'menu' });
  $('#addButton').onclick = () => openWindow({ kind: 'add' });
  $('#historyButton').onclick = () => openWindow({ kind: 'history' });
  $('#arrangeButton').onclick = () => { arranging = !arranging; if (active) parkWindow(false); renderChrome(); };
  $('#areaSelect').onchange = event => {
    const view = world.views.find(v => v.id === event.target.value);
    Object.assign(camera(), view ? { x: view.x, y: view.y, zoom: view.zoom } : { x: 0, y: 0 });
    renderField(); renderChrome(); restoreCamera(); saveUI();
  };
  function zoom(delta) { rememberCamera(); camera().zoom = Math.max(48, Math.min(96, step() + delta)); renderField(); renderChrome(); restoreCamera(); saveUI(); }
  $('#zoomOut').onclick = () => zoom(-16); $('#zoomIn').onclick = () => zoom(16);
  document.querySelectorAll('[data-pan]').forEach(button => button.onclick = () => {
    const [dx, dy] = button.dataset.pan.split(',').map(Number); viewport.scrollBy({ left: dx * step() * 2, top: dy * step() * 2, behavior: 'instant' });
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) { event.preventDefault(); parkWindow(false); } });
  window.addEventListener('pagehide', () => { rememberCamera(); saveUI(); });
  SstmStore.open().then(saved => {
    accept(saved.world); restoreCamera(); renderTabs(); $('#saveState').textContent = 'ЛОКАЛЬНО'; $('#app').inert = false;
    setInterval(updateClocks, 250);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => notice('Офлайн-оболочка пока не сохранилась. Записи продолжают сохраняться на устройстве.'));
  }).catch(error => {
    $('#app').inert = false;
    notice(`Хранилище недоступно. ${error.message}`); $('#saveState').textContent = 'НЕ СОХРАНЕНО';
    document.querySelectorAll('button,select').forEach(element => element.disabled = true);
  });
})();
