'use strict';
(() => {
  const store = window.TRCKNG_STORAGE, data = window.SstmData;
  const read = () => JSON.parse(store.getItem('sstm_v2_cycles') || 'null') || data.emptyJournal();
  const $ = id => document.getElementById(id);
  const elapsed = ms => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const wallTime = at => new Date(at).toLocaleTimeString(window.SstmI18n?.locale || 'ru-RU', { hour12: false });
  const calendar = at => new Date(at).toLocaleString(window.SstmI18n?.locale || 'ru-RU');
  const localInput = at => {
    const d = new Date(at), pad = (n, size = 2) => String(n).padStart(size, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  };
  const scale = ms => { const h = ms / 3600000; return h < 1 ? 1 : h < 2 ? 2 : h < 6 ? 6 : Math.max(12, Math.ceil(h / 6) * 6); };
  const active = journal => journal.cycles.find(cycle => cycle.id === journal.active);
  const make = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
  const button = (label, handler, className = '') => { const el = make('button', className, label); el.type = 'button'; el.onclick = handler; return el; };
  let selected = null, editing = null;
  const drafts = JSON.parse(store.getItem('sstm_v2_cycle_drafts') || '{}');
  const saveDrafts = () => store.setItem('sstm_v2_cycle_drafts', JSON.stringify(drafts));
  function write(journal) {
    store.setItem('sstm_v2_cycles', JSON.stringify(journal));
    window.markCloudDirty('recording interval'); render(); renderHistory();
    window.dispatchEvent(new Event('sstm-v2-recordings-changed'));
  }
  function capture(end = false) {
    if (window.TRCKNG_ACCOUNT && !window.TRCKNG_ACCOUNT.ready) return;
    try { write(data.point(read(), Date.now(), end)); }
    catch (error) { $('surfaceHint').textContent = error.message; }
  }
  function open(cycleId, pointId) {
    const journal = read(); selected = cycleId || journal.active || data.visibleCycles(journal).at(-1)?.id || null;
    renderHistory(); $('cycleModal').classList.add('visible');
    if (pointId) requestAnimationFrame(() => document.getElementById(`record-${pointId}`)?.scrollIntoView({ block: 'center' }));
  }
  const type = button('ТОЧКИ'); type.className = 'type-btn'; type.dataset.type = 'points';
  document.querySelector('#cellEditModal .type-selector').prepend(type);
  const typeHelp = make('p', 'cycle-explanation', 'Общая запись с верхней шкалой. Нажатие отмечает границу отрезка. Подходит и для короткого занятия, и для целого дня.'); typeHelp.hidden = true;
  document.querySelector('#cellEditModal .type-selector').after(typeHelp);
  new MutationObserver(() => { typeHelp.hidden = !type.classList.contains('active'); }).observe(type, { attributes: true, attributeFilter: ['class'] });
  const clock = make('section'); clock.id = 'cycleClock';
  clock.innerHTML = '<div class="cycle-top"><button id="cycleCapture" type="button">НАЧАТЬ</button><button id="cycleOpen" class="cycle-running-clock" type="button" aria-label="Открыть отрезки записи"><span id="cycleElapsed">00:00:00</span><small class="cycle-open-label">ОТРЕЗКИ ↗</small><small id="cycleContext"></small></button><div class="cycle-now"><small>СЕЙЧАС</small><time id="cycleWallClock"></time></div><button id="cycleCalendar" type="button" aria-label="Показать календарную шкалу">КАЛЕНДАРЬ</button></div><div id="cycleStrip" aria-label="Отрезки текущей записи"></div><div id="cycleRuler" class="cycle-ruler"></div>';
  document.querySelector('.header').prepend(clock);
  const back = button('К ЗАПИСИ'); back.id = 'cycleReturn'; document.querySelector('.header').append(back);
  const modal = make('div', 'modal'); modal.id = 'cycleModal';
  modal.innerHTML = `<div>
    <div class="recording-summary"><strong id="cycleTitle"></strong><span id="cycleRange"></span><small id="cycleRecorded"></small></div>
    <p class="cycle-explanation">Между точками — отрезок. Нажми на подпись, чтобы назвать; на время точки — чтобы исправить.</p>
    <details id="cycleArchive"><summary id="cycleArchiveTitle">Найти / другие записи</summary><input id="cycleSearch" type="search" aria-label="Поиск отрезков по названию или тегу" placeholder="Название или #тег"><div id="cycleSearchResults"></div><label class="cycle-select-label">Показать запись <select id="cycleSelect"></select></label><div id="cycleComparison"></div></details>
    <div id="cycleRows"></div><p id="cycleEmpty" class="cycle-explanation">Нажми «НАЧАТЬ» на поле. Следующее нажатие поставит точку и начнёт следующий отрезок. Названия необязательны.</p>
    <div id="cycleStopArea"><button id="cycleEnd" class="modal-btn" type="button">ОСТАНОВИТЬ ЗАПИСЬ</button><p class="cycle-explanation">Последний отрезок сохранится. Следующее нажатие начнёт отдельную запись.</p></div>
    <button id="cycleDeleteRecord" type="button">Удалить всю запись…</button><div id="cycleDeleteReview" hidden></div>
    <details id="cycleTrash"><summary>Корзина записей</summary><div id="cycleTrashRows"></div></details>
    <details id="cycleRepair"><summary>Исправления</summary><div id="cycleUndoArea"></div><div id="cycleEditLog"></div></details>
    <details class="recording-help"><summary>Запись или личный цикл?</summary><p class="cycle-explanation">Запись — от первого нажатия до остановки. Можно записать десять минут занятия или весь день. Остановить можно в любой момент: это не дедлайн, отрезки сохранятся.</p><p class="cycle-explanation">Личный цикл — выбранный тобой ритм, например от сна до следующего сна. Такая запись может длиться меньше или больше 24 часов. Полночь ничего не сбрасывает. Отдельные таймеры на поле работают независимо.</p></details>
  </div>`;
  document.body.append(modal);
  $('cycleOpen').setAttribute('aria-controls', 'cycleModal'); $('cycleOpen').setAttribute('aria-expanded', 'false');
  new MutationObserver(() => {
    const shown = modal.classList.contains('visible'); document.body.classList.toggle('surface-intervals-open', shown);
    $('cycleOpen').setAttribute('aria-expanded', String(shown)); $('cycleOpen').setAttribute('aria-label', shown ? 'Закрыть отрезки записи' : 'Открыть отрезки записи');
    $('cycleOpen').querySelector('.cycle-open-label').textContent = shown ? 'ОТРЕЗКИ ×' : 'ОТРЕЗКИ ↗';
  }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  $('cycleCapture').onclick = () => capture(); $('cycleOpen').onclick = () => {
    if (modal.classList.contains('visible')) modal.classList.remove('visible'); else open();
  };
  const historyLink = button('ЗАПИСИ / ОТРЕЗКИ', () => open()); historyLink.id = 'historyCycles'; $('historyView').prepend(historyLink);
  $('cycleEnd').onclick = () => { capture(true); selected = read().cycles.at(-1)?.id; renderHistory(); };
  $('cycleSelect').onchange = event => { selected = event.target.value; editing = null; $('cycleArchive').open = false; renderHistory(); };
  function searchRecords() {
    const results = $('cycleSearchResults'), query = $('cycleSearch').value.trim().toLocaleLowerCase(); results.replaceChildren();
    if (!query) return;
    for (const [index, c] of read().cycles.entries()) {
      for (const [n, part] of segments(c).entries()) {
        const tags = (c.tags?.[part.point.id] || []).map(t => `#${t}`).join(' '), text = `${part.name} ${part.point.name} ${tags}`.toLocaleLowerCase();
        if (!text.includes(query)) continue;
        results.append(button(`#${index + 1} · ${part.name || `отрезок ${n + 1}`} · ${elapsed(part.end - part.start)} ${tags}`, () => { editing = null; $('cycleArchive').open = false; open(c.id, part.point.id); }));
      }
    }
    if (!results.childElementCount) results.append(make('p', 'cycle-explanation', 'Совпадений пока нет.'));
  }
  $('cycleSearch').oninput = searchRecords;
  function mode(value) { document.body.classList.toggle('personal-cycle', value === 'cycle'); store.setItem('sstm_v2_time_view', value); }
  $('cycleCalendar').onclick = () => mode('calendar'); $('cycleReturn').onclick = () => mode('cycle');
  mode(store.getItem('sstm_v2_time_view') || 'cycle');
  function segments(cycle, now = Date.now()) {
    if (!cycle) return [];
    return cycle.points.map((point, index) => ({ point, start: point.at, end: cycle.points[index + 1]?.at ?? cycle.endedAt ?? now,
      name: cycle.names[point.id] || '', live: cycle.endedAt === null && index === cycle.points.length - 1 })).filter(part => !data.intervalDeleted(cycle, part.point.id) && (part.live || part.end > part.start));
  }
  function draw(host, cycle, hours) {
    host.replaceChildren(); if (!cycle) return;
    for (const [index, part] of segments(cycle).entries()) {
      const bar = button('', () => open(cycle.id, part.point.id), `cycle-segment${part.live ? ' live' : ''}`);
      bar.style.left = `${(part.start - cycle.startedAt) / (hours * 3600000) * 100}%`;
      bar.style.width = `${Math.max(.2, (part.end - part.start) / (hours * 3600000) * 100)}%`;
      bar.style.setProperty('--segment-color', ['#d1f55a', '#65bdc6', '#c898ef', '#d19b69'][index % 4]);
      bar.title = `${part.name || `Отрезок ${index + 1}`} · ${elapsed(part.end - part.start)}${part.live ? ' · сейчас' : ''}`;
      bar.setAttribute('aria-label', bar.title); host.append(bar);
    }
  }
  function render() {
    const journal = read(), cycle = active(journal), shown = cycle || data.visibleCycles(journal).at(-1), now = Date.now();
    const total = shown ? (shown.endedAt ?? now) - shown.startedAt : 0;
    $('cycleCapture').textContent = cycle ? '+ ТОЧКА' : 'НАЧАТЬ';
    $('cycleElapsed').textContent = elapsed(total);
    $('cycleContext').textContent = cycle ? `Вся запись · отрезок ${elapsed(now - cycle.points.at(-1).at)}` : shown ? 'Запись сохранена · можно начать новую' : 'Начни запись любой длины';
    $('cycleWallClock').textContent = wallTime(now); $('cycleWallClock').dateTime = new Date(now).toISOString(); $('cycleWallClock').title = calendar(now);
    document.querySelectorAll('[data-live-start]').forEach(label => { label.textContent = `${elapsed(now - Number(label.dataset.liveStart))} · идёт`; });
    const hours = scale(total); draw($('cycleStrip'), shown, hours);
    $('cycleRuler').replaceChildren(...[0, 1, 2, 3, 4].map(i => make('span', '', hours <= 2 ? `${hours * 60 * i / 4} м` : `${hours * i / 4} ч`)));
    document.querySelectorAll('.btn-habit[data-type=points]').forEach(el => {
      el.querySelector('.btn-value').textContent = elapsed(cycle ? total : 0);
      el.querySelector('.btn-breakdown').textContent = cycle ? `${cycle.points.length} точек · отрезок ${elapsed(now - cycle.points.at(-1).at)}` : 'Нажми, чтобы начать';
      el.classList.toggle('running', Boolean(cycle));
    });
  }
  function startEdit(cycle, point, kind) {
    editing = { cycleId: cycle.id, pointId: point.id, kind }; renderHistory();
    const form = document.getElementById(`record-${point.id}`)?.querySelector('.cycle-inline-editor');
    form?.querySelector('input:not([hidden])')?.focus({ preventScroll: true }); form?.scrollIntoView({ block: 'nearest' });
  }
  function namesEditor(row, cycle, point, index, hasInterval) {
    const key = `${cycle.id}/${point.id}`, original = drafts[key]?.original || JSON.stringify([point.name, cycle.names[point.id] || '']);
    const originalTags = drafts[key]?.originalTags ?? JSON.stringify(cycle.tags?.[point.id] || []);
    const kind = editing.kind, form = make('form', 'cycle-inline-editor');
    const fields = [
      ['point', `Название точки ${index + 1}`, drafts[key]?.point ?? point.name],
      ['interval', `Название отрезка ${index + 1}`, drafts[key]?.interval ?? cycle.names[point.id] ?? ''],
      ['tags', `Теги отрезка ${index + 1}`, drafts[key]?.tags ?? (cycle.tags?.[point.id] || []).join(' ')]
    ];
    const inputs = {};
    for (const [field, label, value] of fields) {
      const input = make('input'); input.value = value; input.maxLength = field === 'tags' ? 500 : 160; input.setAttribute('aria-label', label); input.hidden = field !== kind;
      input.dataset.draftField = field;
      input.placeholder = field === 'tags' ? '#работа #проект' : 'Необязательно'; inputs[field] = input;
      input.oninput = () => { drafts[key] = { original, originalTags, point: inputs.point.value, interval: inputs.interval.value, tags: inputs.tags.value }; saveDrafts(); };
      form.append(input);
    }
    if (kind === 'tags') {
      const input = inputs.tags, hints = make('div', 'cycle-tag-hints');
      const caption = make('p', 'cycle-explanation', 'Ранее использованные теги');
      const choices = make('div', 'cycle-tag-choices'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', 'Подсказки тегов');
      choices.setAttribute('data-no-i18n', '');
      const empty = make('p', 'cycle-explanation');
      let composing = false, caret = input.value.length;
      input.autocomplete = 'off';
      function refreshHints() {
        caret = input.selectionStart ?? input.value.length;
        const words = composing ? [] : window.SstmTagInput?.suggest(read(), input.value, caret) || [];
        choices.replaceChildren(...words.map(word => button(`#${word}`, () => {
          const result = window.SstmTagInput.complete(input.value, caret, word);
          input.value = result.text; input.focus({ preventScroll: true }); input.setSelectionRange(result.caret, result.caret);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        })));
        empty.textContent = window.SstmI18n.text(input.value.trim() ? 'Можно добавить новое слово или продолжить ввод.' : 'Пока нет прошлых тегов. Введи первый — он появится в подсказках.');
        empty.hidden = words.length > 0 || composing; caption.hidden = !words.length;
      }
      input.addEventListener('input', refreshHints); input.addEventListener('click', refreshHints); input.addEventListener('focus', refreshHints);
      input.addEventListener('compositionstart', () => { composing = true; refreshHints(); });
      input.addEventListener('compositionend', () => { composing = false; refreshHints(); });
      input.addEventListener('keydown', event => {
        if (!event.isComposing && event.key === 'ArrowDown' && choices.firstElementChild) { event.preventDefault(); choices.firstElementChild.focus(); }
      });
      input.addEventListener('keyup', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) refreshHints(); });
      hints.append(caption, choices, empty); form.append(hints); refreshHints();
    }
    form.prepend(make('label', 'cycle-explanation', kind === 'tags' ? 'Теги через пробел. Они помогают найти отрезок; время кнопкам пока не начисляют.' : kind === 'point' ? `Точка ${index + 1} · название необязательно` : `Отрезок ${index + 1} · название необязательно`));
    const error = make('p', 'cycle-edit-error'); error.setAttribute('role', 'alert');
    const save = button('СОХРАНИТЬ', () => saveNames());
    const dismiss = button('СВЕРНУТЬ', () => { editing = null; renderHistory(); });
    function saveNames(replaceChanged = false) {
      try {
        const latest = read(), c = latest.cycles.find(c => c.id === cycle.id), p = c?.points.find(p => p.id === point.id);
        if (!p) throw Error('Точка больше не существует. Текст остался в черновике.');
        if (!replaceChanged && (JSON.stringify([p.name, c.names[p.id] || '']) !== original || JSON.stringify(c.tags?.[p.id] || []) !== originalTags)) {
          form.querySelector('.cycle-name-conflict')?.remove();
          const conflict = make('div', 'cycle-name-conflict'); conflict.setAttribute('role', 'alert');
          conflict.append(make('p', 'cycle-explanation', `Подписи изменились. Сохранено: «${p.name || 'без названия'}» / «${c.names[p.id] || 'без названия'}» / ${(c.tags?.[p.id] || []).join(' ') || 'без тегов'}. Твой текст оставлен в черновике.`),
            button('СОХРАНИТЬ МОЙ ТЕКСТ', () => saveNames(true)), button('ПРИНЯТЬ СОХРАНЁННОЕ', () => { delete drafts[key]; saveDrafts(); editing = null; renderHistory(); }));
          form.append(conflict); return;
        }
        let changed = data.annotate(latest, cycle.id, point.id, 'point', inputs.point.value);
        if (hasInterval) { changed = data.annotate(changed, cycle.id, point.id, 'interval', inputs.interval.value); changed = data.tagInterval(changed, cycle.id, point.id, inputs.tags.value); }
        write(changed); delete drafts[key]; saveDrafts(); editing = null; renderHistory();
      } catch (err) { error.textContent = err.message; }
    }
    form.onsubmit = event => { event.preventDefault(); saveNames(); };
    const actions = make('div', 'cycle-edit-actions'); actions.append(save, dismiss); form.append(error, actions); row.append(form);
  }
  function timeEditor(row, cycle, point, index) {
    const key = `${cycle.id}/${point.id}/time`, baseline = drafts[key]?.original || JSON.stringify(cycle);
    const form = make('form', 'cycle-inline-editor'), label = make('label', 'cycle-explanation', `Время точки ${index + 1} · местное время устройства`);
    const input = make('input'); input.type = 'datetime-local'; input.dataset.draftField = 'time'; input.step = '.001'; input.value = drafts[key]?.value || localInput(point.at); input.setAttribute('aria-label', `Время точки ${index + 1}`);
    const preview = make('div', 'cycle-time-preview'), error = make('p', 'cycle-edit-error'); error.setAttribute('role', 'alert');
    const save = button('ПРИМЕНИТЬ ВРЕМЯ', apply);
    function proposed() {
      const at = new Date(input.value).getTime();
      if (!input.value || !Number.isFinite(at) || !localInput(at).startsWith(input.value)) throw Error('Проверь дату и местное время.');
      return data.changeTime(read(), cycle.id, point.id, at, baseline);
    }
    function showPreview() {
      preview.replaceChildren(); error.textContent = '';
      try {
        const c = proposed().cycles.find(c => c.id === cycle.id), now = Date.now();
        preview.append(make('p', 'cycle-explanation', `${calendar(point.at)} → ${calendar(c.points[index].at)}`));
        for (const n of [index - 1, index]) if (n >= 0 && (n < c.points.length - 1 || c.endedAt === null)) {
          const before = (cycle.points[n + 1]?.at ?? now) - cycle.points[n].at, after = (c.points[n + 1]?.at ?? now) - c.points[n].at;
          preview.append(make('p', '', `Отрезок ${n + 1}: ${elapsed(before)} → ${elapsed(after)}`));
        }
        save.disabled = false;
      } catch (err) { error.textContent = err.message; save.disabled = true; }
    }
    function apply() {
      try { write(proposed()); delete drafts[key]; saveDrafts(); editing = null; renderHistory(); }
      catch (err) { error.textContent = err.message; }
    }
    input.oninput = () => { drafts[key] = { original: baseline, value: input.value }; saveDrafts(); showPreview(); };
    form.onsubmit = event => { event.preventDefault(); apply(); };
    label.append(input); form.append(label, preview, error);
    const actions = make('div', 'cycle-edit-actions'); actions.append(save, button('СВЕРНУТЬ', () => { editing = null; renderHistory(); }), button('СБРОСИТЬ ПРАВКУ', () => { delete drafts[key]; saveDrafts(); editing = null; renderHistory(); }));
    form.append(actions); row.append(form); showPreview();
  }
  function repairs(journal, cycle) {
    const area = $('cycleUndoArea'), log = $('cycleEditLog'); area.replaceChildren(); log.replaceChildren();
    if (cycle && !cycle.deletedAt && !Object.keys(cycle.deletedIntervals || {}).length && cycle.id === journal.cycles.at(-1)?.id) {
      const expected = JSON.stringify(cycle), last = cycle.points.at(-1), n = cycle.points.length;
      const message = n === 1 ? 'Единственная точка будет убрана, запись исчезнет из списка.' : cycle.endedAt !== null ? 'Последняя точка остановки будет убрана. Запись продолжится с предыдущей точки.' : `Последняя точка будет убрана. Отрезки ${n - 1} и ${n} соединятся; название и теги первого сохранятся.`;
      area.append(make('p', 'cycle-explanation', `${message} Исходная точка и её подписи останутся в истории исправлений.`));
      const undo = button(`УБРАТЬ ПОСЛЕДНЮЮ ТОЧКУ ${String(n).padStart(2, '0')}`, () => {
        try { write(data.removeLastPoint(read(), cycle.id, expected)); editing = null; renderHistory(); }
        catch (err) { error.textContent = err.message; }
      }); undo.id = 'cycleUndo';
      const error = make('p', 'cycle-edit-error'); error.setAttribute('role', 'alert');
      area.append(make('small', '', `${wallTime(last.at)} · ${last.name || `точка ${n}`}`), undo, error);
    } else if (cycle) area.append(make('p', 'cycle-explanation', Object.keys(cycle.deletedIntervals || {}).length ? 'Сначала восстанови удалённые отрезки этой записи.' : 'Убрать последнюю точку можно только у последней записи. Время и подписи предыдущих записей можно исправить нажатием на них.'));
    const edits = (journal.edits || []).slice().reverse();
    if (edits.length) {
      const details = make('details'); details.append(make('summary', '', `История исправлений · все записи · ${edits.length}`));
      for (const edit of edits) details.append(make('p', 'cycle-explanation', edit.type === 'time' ? `${calendar(edit.at)} · время: ${calendar(edit.before.at)} → ${calendar(edit.after.at)}` : `${calendar(edit.at)} · убрана точка ${calendar(edit.before.point.at)} «${edit.before.point.name || 'без названия'}», отрезок «${edit.before.intervalName || 'без названия'}» ${(edit.before.tags || []).map(t => `#${t}`).join(' ')}`));
      log.append(details);
    }
  }
  function restore(cycle, pointId = null) {
    try { write(data.setDeleted(read(), cycle.id, pointId, false, JSON.stringify(cycle))); $('surfaceHint').textContent = cycle.endedAt === null ? 'Восстановлено.' : 'Восстановлено. Запись остаётся остановленной.'; }
    catch (err) { $('surfaceHint').textContent = err.message; }
  }
  function reviewDelete(cycle, pointId = null) {
    const review = $('cycleDeleteReview'), index = cycle.points.findIndex(p => p.id === pointId), live = cycle.endedAt === null && (pointId === null || index === cycle.points.length - 1);
    const start = pointId === null ? cycle.startedAt : cycle.points[index].at, end = pointId === null ? cycle.endedAt : cycle.points[index + 1]?.at;
    review.replaceChildren(); review.hidden = false;
    review.append(make('strong', '', pointId === null ? 'Удалить всю запись?' : 'Удалить этот отрезок?'));
    const name = make('p', '', pointId === null ? '' : cycle.names[pointId] || `отрезок ${index + 1}`); name.dataset.noI18n = ''; review.append(name);
    review.append(make('p', '', `${calendar(start)} → ${end ? calendar(end) : 'сейчас'} · ${elapsed((end ?? Date.now()) - start)}`));
    review.append(make('p', 'cycle-explanation', pointId === null ? 'Запись уйдёт в корзину. Состояния, слова и отдельные таймеры сохранятся.' : 'На шкале останется промежуток. Время соседних занятий не изменится. Состояния и слова сохранятся.'));
    if (live) review.append(make('p', 'cycle-explanation', 'Текущая запись остановится сейчас. Восстановление не запустит её снова.'));
    const error = make('p', 'cycle-edit-error'); error.setAttribute('role', 'alert');
    const actions = make('div', 'cycle-edit-actions');
    actions.append(button(live ? 'ОСТАНОВИТЬ И УДАЛИТЬ' : 'В КОРЗИНУ', () => {
      try { const next = data.setDeleted(read(), cycle.id, pointId, true, JSON.stringify(cycle)); editing = null; review.hidden = true; write(next); $('surfaceHint').textContent = 'Удалено. Можно восстановить из корзины записей.'; }
      catch (err) { error.textContent = err.message; }
    }), button('ОТМЕНА', () => { review.hidden = true; }));
    review.append(error, actions); review.scrollIntoView({ block: 'nearest' }); actions.firstChild.focus({ preventScroll: true });
  }
  function renderTrash(journal) {
    const rows = $('cycleTrashRows'); rows.replaceChildren();
    for (const c of journal.cycles) {
      const removed = c.deletedAt ? [null] : Object.keys(c.deletedIntervals || {});
      for (const pointId of removed) {
        const p = c.points.find(p => p.id === pointId), row = make('div', 'cycle-trash-row');
        const label = make('span', '', `${calendar(p?.at ?? c.startedAt)} · ${pointId === null ? 'ЗАПИСЬ' : c.names[pointId] || 'ОТРЕЗОК'}`); label.dataset.noI18n = '';
        const action = button('ВОССТАНОВИТЬ', () => restore(c, pointId)); action.dataset.restoreCycle = c.id; action.dataset.restorePoint = pointId || '';
        row.append(label, action); rows.append(row);
      }
    }
    if (!rows.childElementCount) rows.append(make('p', 'cycle-explanation', 'Корзина пуста.'));
  }
  function renderHistory() {
    const focus = $('cycleRows').contains(document.activeElement) ? { record: document.activeElement.closest('.cycle-record')?.id, field: document.activeElement.dataset.draftField } : null;
    const selection = focus && document.activeElement.type === 'text' ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const journal = read(), visible = data.visibleCycles(journal);
    if (!visible.some(c => c.id === selected)) selected = journal.active || visible.at(-1)?.id;
    const select = $('cycleSelect'); select.replaceChildren();
    visible.forEach(c => { const option = make('option', '', `Запись ${journal.cycles.indexOf(c) + 1} · ${calendar(c.startedAt)}${c.endedAt === null ? ' · идёт' : ''}`); option.value = c.id; select.append(option); }); select.value = selected || '';
    const cycle = journal.cycles.find(c => c.id === selected), rows = $('cycleRows'); rows.replaceChildren();
    $('cycleTitle').textContent = cycle ? `ЗАПИСЬ ${String(journal.cycles.indexOf(cycle) + 1).padStart(2, '0')} · ${cycle.endedAt === null ? 'ИДЁТ' : 'СОХРАНЕНА'}` : 'НОВАЯ ЗАПИСЬ';
    $('cycleRange').textContent = cycle ? `${calendar(cycle.startedAt)} → ${cycle.endedAt === null ? 'сейчас' : calendar(cycle.endedAt)}` : '';
    $('cycleRecorded').textContent = cycle && Object.keys(cycle.deletedIntervals || {}).length ? `Без удалённых отрезков: ${elapsed(segments(cycle).reduce((sum, part) => sum + part.end - part.start, 0))}` : '';
    $('cycleDeleteRecord').hidden = !cycle; $('cycleDeleteRecord').onclick = () => reviewDelete(cycle);
    $('cycleEmpty').hidden = Boolean(cycle); $('cycleStopArea').hidden = !cycle || cycle.id !== journal.active;
    $('cycleArchiveTitle').textContent = `Найти / другие записи · ${visible.length}`; $('cycleArchive').hidden = visible.length === 0;
    const comparison = $('cycleComparison'); comparison.replaceChildren();
    const recent = visible.slice(-7), now = Date.now(), hours = scale(Math.max(0, ...recent.map(c => (c.endedAt ?? now) - c.startedAt)));
    for (const item of recent) {
      const row = make('div', 'cycle-comparison-row'), title = button(`#${journal.cycles.indexOf(item) + 1} · ${elapsed((item.endedAt ?? now) - item.startedAt)}`, () => { selected = item.id; editing = null; $('cycleArchive').open = false; renderHistory(); });
      const strip = make('div', 'cycle-mini-strip'); draw(strip, item, hours); row.append(title, strip); comparison.append(row);
    }
    if (recent.length) comparison.append(make('p', 'cycle-explanation', `Последние ${recent.length} записей · общая шкала 0–${hours} ч`));
    for (const [index, point] of (cycle?.points || []).entries()) {
      const row = make('div', 'cycle-record'); row.id = `record-${point.id}`;
      const head = make('div', 'cycle-point-line');
      head.append(make('span', 'cycle-point-time', `${String(index + 1).padStart(2, '0')} / +${elapsed(point.at - cycle.startedAt)}`));
      const stamp = button(wallTime(point.at), () => startEdit(cycle, point, 'time'), 'cycle-calendar-time'); stamp.title = calendar(point.at); stamp.setAttribute('aria-label', `Исправить время точки ${index + 1}`); head.append(stamp);
      stamp.disabled = Boolean(cycle.deletedIntervals?.[point.id] || cycle.deletedIntervals?.[cycle.points[index - 1]?.id]);
      const name = button(point.name || `точка ${index + 1}`, () => startEdit(cycle, point, 'point'), `cycle-name${point.name ? '' : ' unnamed'}`); name.setAttribute('aria-label', `Переименовать точку ${index + 1}`);
      head.insertBefore(name, stamp); row.append(head);
      const end = cycle.points[index + 1]?.at ?? cycle.endedAt ?? now, live = cycle.endedAt === null && index === cycle.points.length - 1, hasInterval = live || index < cycle.points.length - 1;
      if (hasInterval && data.intervalDeleted(cycle, point.id)) {
        const gap = make('div', 'cycle-gap'); gap.append(make('span', '', `Удалённый отрезок · ${elapsed(end - point.at)}`), button('ВОССТАНОВИТЬ', () => restore(cycle, point.id))); row.append(gap);
      } else if (hasInterval) {
        const interval = make('div', `cycle-interval${live ? ' live' : ''}`);
        const title = button(cycle.names[point.id] || `отрезок ${index + 1}`, () => startEdit(cycle, point, 'interval'), `cycle-name${cycle.names[point.id] ? '' : ' unnamed'}`); title.setAttribute('aria-label', `Переименовать отрезок ${index + 1}`);
        const duration = make('span', 'cycle-record-duration', `${elapsed(end - point.at)}${live ? ' · идёт' : ''}`); if (live) duration.dataset.liveStart = String(point.at);
        const tags = button((cycle.tags?.[point.id] || []).map(t => `#${t}`).join(' ') || '+ тег', () => startEdit(cycle, point, 'tags'), 'cycle-tags'); tags.setAttribute('aria-label', `Изменить теги отрезка ${index + 1}`);
        interval.append(title, duration, tags);
        const remove = button('×', () => reviewDelete(cycle, point.id), 'cycle-delete-interval'); remove.setAttribute('aria-label', `Удалить отрезок ${index + 1}`); interval.append(remove);
        const marks = (journal.moments || []).filter(m => !m.deletedAt && m.at >= point.at && m.at < end);
        if (marks.length) {
          const words = make('div', 'cycle-moments');
          for (const mark of marks) {
            const line = make('p', '', `${wallTime(mark.at)} · `), name = make('span', '', mark.state?.label || mark.tags.map(t => `#${t}`).join(' '));
            if (window.SstmMoments.defaults.some(o => o.id === mark.state?.id && o.label === mark.state.label)) name.dataset.uiState = '';
            line.append(name); words.append(line);
          }
          interval.append(words);
        }
        row.append(interval);
      }
      if (drafts[`${cycle.id}/${point.id}`] || drafts[`${cycle.id}/${point.id}/time`]) row.append(make('small', 'cycle-draft-mark', 'есть черновик'));
      if (editing?.cycleId === cycle.id && editing.pointId === point.id) {
        if (editing.kind === 'time') timeEditor(row, cycle, point, index); else namesEditor(row, cycle, point, index, hasInterval);
      }
      rows.append(row);
    }
    repairs(journal, cycle); renderTrash(journal); searchRecords();
    if (focus?.field) { const input = [...rows.querySelectorAll('input')].find(el => !el.hidden && el.closest('.cycle-record')?.id === focus.record && el.dataset.draftField === focus.field); input?.focus({ preventScroll: true }); if (input && selection) input.setSelectionRange(...selection); }
  }
  window.TRCKNG_MODULES = {
    render(cell, grid) {
      if (cell.type !== 'points' || !cell.label.trim()) return false;
      const el = button('', () => capture(), 'btn-habit'); el.id = `btn-${cell.id}`; el.dataset.type = 'points'; el.dataset.cellId = cell.id; el.style.setProperty('--btn-color', cell.color);
      window.applyCellLayoutToElement(el, cell.layout);
      el.append(make('span', 'btn-value'), make('span', 'btn-breakdown'), make('span', 'btn-label', cell.label)); grid.append(el); return true;
    }
  };
  new MutationObserver(render).observe($('habitsGrid'), { childList: true });
  window.addEventListener('sstm-v2-loaded', () => { render(); renderHistory(); });
  window.addEventListener('sstm-v2-moments-changed', () => { render(); renderHistory(); });
  setInterval(render, 1000); render();
})();
