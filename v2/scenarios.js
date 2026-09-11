'use strict';
(() => {
  const M = window.SstmModules, store = window.TRCKNG_STORAGE, previous = window.TRCKNG_MODULES;
  const $ = id => document.getElementById(id), read = () => JSON.parse(store.getItem('sstm_v2_modules') || 'null') || M.empty();
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; };
  const btn = (text, click) => { const node = el('button', text); node.type = 'button'; node.onclick = click; return node; };
  const pin = () => Number(document.querySelector('.pin.active')?.dataset.pin || 0);
  const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const currencyLabel = currency => currency === '¤' ? 'ед.' : currency;
  const cash = (value, currency, decimals = 2) => `${value.toFixed(decimals)} ${currencyLabel(currency)}`;
  const stamp = value => new Date(value).toLocaleString('ru-RU');
  let editor = null, selectedTrack = null, sourceRate = null, sourceHourlyInput = '';
  function persist(j) { M.validate(j); store.setItem('sstm_v2_modules', JSON.stringify(j)); window.markCloudDirty('modular timer'); refresh(); renderHistory(); }
  function act(binding, revision) {
    if (window.TRCKNG_ACCOUNT && !window.TRCKNG_ACCOUNT.ready) return;
    try { persist(M.toggle(read(), binding.pin, binding.cellId, Date.now(), revision)); }
    catch (err) { $('surfaceHint').textContent = err.message; }
  }
  const type = btn('МОДУЛЬ'); type.className = 'type-btn'; type.dataset.type = 'modular'; document.querySelector('#cellEditModal .type-selector').prepend(type);
  const fields = el('section', null, 'module-settings'); fields.id = 'moduleSettings'; fields.hidden = true;
  fields.innerHTML = `<p class="module-patch">НАЖАТИЕ → ВРЕМЯ → × СТАВКА → СУММА</p>
    <label>Источник времени<select id="moduleTrack"><option value="">Новый рабочий таймер</option></select></label>
    <p id="moduleSharedHint" class="cycle-explanation"></p>
    <div class="module-rate-fields"><label>Ставка за час<input id="moduleAmount" type="number" min="0.0001" step="any" value="120"></label><label>Валюта<input id="moduleCurrency" maxlength="8" value="USD" list="moduleCurrencies"><datalist id="moduleCurrencies"><option value="USD"><option value="EUR"><option value="ILS"><option value="RUB"><option value="GBP"></datalist></label></div>
    <output id="moduleRatePreview"><span id="moduleRateEquation"></span><strong id="moduleRateHourly"></strong><span id="moduleRateSecond"></span></output><p id="moduleRateHint" class="cycle-explanation">Ставка сохраняется в каждом рабочем отрезке. Новая ставка не пересчитывает прошлые записи.</p>
    <label>Крупный показатель<select id="modulePrimary"><option value="money">Расчётная сумма</option><option value="time">Отработанное время</option></select></label>
    <label>Точность суммы<select id="moduleDecimals"><option value="2">2 знака</option><option value="4">4 знака · виден рост каждую секунду</option></select></label>
    <label class="module-check"><input id="moduleWholeHours" type="checkbox" checked> Показывать полные отработанные часы</label>
    <p class="cycle-explanation">Полоса на кнопке — следующий полный час работы. Каждый штрих — 5 минут; после 60 минут полоса начинается снова.</p>
    <p class="cycle-explanation">Первое нажатие — начать, следующее — остановить и сохранить отрезок. На кнопке общие время и сумма. Расчёт пропорционален времени, без округления до целых часов. Это оценка по ставке, не запись об оплате.</p>
    <button id="moduleOpenHistory" type="button">ОТРЕЗКИ ЭТОЙ РАБОТЫ</button>`;
  const palette = document.querySelector('#cellEditModal .type-selector').parentElement;
  palette.classList.add('module-type-palette'); palette.after(fields);
  function rateFromForm() {
    const amount = Number($('moduleAmount').value), currency = $('moduleCurrency').value.trim();
    // Keep older custom-interval rates exact when only appearance is edited.
    if (sourceRate && amount === Number(sourceHourlyInput) && currency === sourceRate.currency) return { ...sourceRate };
    return { amount, currency, intervalMs: 3600000 };
  }
  function ratePreview() {
    try {
      const rate = M.rate(rateFromForm()); $('moduleRateEquation').textContent = 'ВРЕМЯ РАБОТЫ × СТАВКА';
      $('moduleRateHourly').textContent = `${cash(rate.amount * 3600000 / rate.intervalMs, rate.currency)} / час`;
      $('moduleRateSecond').textContent = `${cash(rate.amount * 1000 / rate.intervalMs, rate.currency, 4)} каждую секунду работы`;
    } catch (_) { $('moduleRateEquation').textContent = 'Укажи положительную ставку за час.'; $('moduleRateHourly').textContent = ''; $('moduleRateSecond').textContent = ''; }
  }
  function populateRate(t, display) {
    const rate = t?.rate || { amount: 120, intervalMs: 3600000, currency: 'USD' };
    sourceRate = t ? { ...rate } : null; sourceHourlyInput = String(rate.amount * 3600000 / rate.intervalMs);
    $('moduleAmount').value = sourceHourlyInput; $('moduleCurrency').value = rate.currency;
    if (display) { $('modulePrimary').value = display.primary; $('moduleDecimals').value = String(display.decimals); $('moduleWholeHours').checked = display.wholeHours; }
    $('moduleAmount').disabled = Boolean(t?.running);
    $('moduleCurrency').disabled = Boolean(t?.running || t?.sessions.length);
    $('moduleRateHint').textContent = t?.running ? 'Работа идёт. Останови её перед изменением ставки. Отображение можно менять сейчас.' : 'Ставка сохраняется в каждом отрезке. Новая ставка не пересчитывает прошлое. Валюта после начала работы постоянна; для другой создай новый таймер.';
    $('moduleSharedHint').textContent = t ? 'Кнопки этого источника управляют одним таймером. Ставка общая, отображение у каждой кнопки своё.' : 'Будет создан отдельный источник времени; затем к нему можно добавить другие кнопки.';
    $('moduleOpenHistory').hidden = !t; ratePreview();
  }
  $('moduleTrack').onchange = () => {
    const j = read(), id = $('moduleTrack').value, t = id ? M.track(j, id) : null;
    editor.expected = M.editorStamp(j, editor.pin, editor.habit, id || undefined); populateRate(t);
  };
  fields.querySelectorAll('input,select').forEach(input => input.addEventListener('input', ratePreview));
  $('moduleOpenHistory').onclick = () => openHistory($('moduleTrack').value);

  const scenarios = el('div', null, 'modal'); scenarios.id = 'scenarioModal';
  scenarios.innerHTML = `<div><div class="scenario-tabs"><button id="scenarioListTab" type="button" aria-pressed="true">СЦЕНАРИИ</button><button id="scenarioHelpTab" type="button" aria-pressed="false">КАК УСТРОЕНО</button></div>
    <section id="scenarioList"><p class="cycle-explanation">Выбери задачу. Настрой кнопку и сохрани её на текущий PIN. Открытие сценария ничего не записывает.</p><div id="scenarioCards"></div><button id="scenarioWorkHistory" type="button">МОЯ РАБОТА / ОТРЕЗКИ</button></section>
    <section id="scenarioHelp" hidden><p class="module-patch">НАЖАТИЕ → ДЕЙСТВИЕ → ДАННЫЕ → ОТОБРАЖЕНИЕ</p><p>Действие решает, что делает нажатие: прибавить число, поставить точку, запустить или остановить время.</p><p>Данные принадлежат источнику. Две кнопки могут показывать одну работу на разных PIN.</p><p>Отображение решает, что видно: часы, сумма, пульс или график. Формула превращает время в расчётную сумму.</p><p>Сценарий — готовая комбинация этих частей. Сейчас первая такая комбинация — работа × ставка.</p><details><summary>Существующие кнопки</summary><div id="scenarioTypeHelp"></div></details><p class="cycle-explanation">Теги и отрезки событий пока не связаны с рабочим источником. Следующий шаг — «Учесть в…» с проверкой пересекающегося времени.</p></section></div>`;
  document.body.append(scenarios);
  function showTab(help) { $('scenarioList').hidden = help; $('scenarioHelp').hidden = !help; $('scenarioListTab').setAttribute('aria-pressed', String(!help)); $('scenarioHelpTab').setAttribute('aria-pressed', String(help)); }
  $('scenarioListTab').onclick = () => showTab(false); $('scenarioHelpTab').onclick = () => showTab(true);
  const recipes = [
    ['tag', 'Слово к моменту', 'Нажми # и пиши прямо в кнопке. Первые буквы подскажут прежние теги. Enter или ✓ сохраняет отметку времени; запись дня запускать не нужно.', 'tag', '# СЛОВО'],
    ['state', 'Как я сейчас', 'Касание открывает состояния. Выбери одно — оно сразу запишется. Свои слова можно добавить в меню.', 'state', 'СОСТОЯНИЕ'],
    ['work-pay', 'Работа × ставка', 'Узнать, сколько времени отработано и как растёт возможная сумма. Одна кнопка: время + расчёт по ставке.', 'modular', 'РАБОТА × СТАВКА'],
    ['points', 'Отметить смену занятия', 'Записать дорогу, работу или весь день точками. Назвать отрезки можно позже. Все кнопки «Точки» ведут одну общую запись.', 'points', 'ТОЧКИ'],
    ['focus', 'Короткий фокус', 'Повторяющийся интервал 25 минут. Нажатие запускает; повторное останавливает и возвращает начальную длительность.', 'timer', 'ФОКУС'],
    ['count', 'Заметить повторение', 'Отмечать простое событие одним нажатием. Шаг можно изменить в настройках.', 'unit', 'СОБЫТИЕ']
  ];
  function createRecipe(recipe) {
    if (window.TRCKNG_ACCOUNT && !window.TRCKNG_ACCOUNT.ready) { $('surfaceHint').textContent = 'Сначала войди и подготовь свою копию v2.'; return; }
    if (window.TRCKNG_RESUME_CELL_EDITOR?.()) { $('surfaceHint').textContent = 'Сохрани или закрой текущий черновик кнопки, затем выбери сценарий.'; return; }
    scenarios.classList.remove('visible'); window.setView('layout'); window.openNewCellModal();
    if (!$('cellEditModal').classList.contains('visible')) { $('surfaceHint').textContent = 'Нет свободного места для новой кнопки.'; return; }
    // Programmatic type selection runs before the modal's observer can update its PIN.
    $('cellEditModal').dataset.sourcePin = String(pin());
    $('cellEditInput').value = recipe[4]; $('cellEditColor').value = '#d1f55a';
    document.querySelector(`#cellEditModal .type-btn[data-type="${recipe[3]}"]`).click();
    const draftId = $('cellEditModal').dataset.subjectId;
    if (recipe[3] === 'modular' && window.fieldSlotAvailable(draftId, { ...window.getCellLayout(draftId), colSpan: 2, rowSpan: 1 })) document.querySelector('#cellEditModal [data-layout-size="2x1"]').click();
    if (recipe[0] === 'focus') { $('timerDuration').value = '25'; $('timerVolume').value = '0'; $('volumeValue').textContent = '0%'; }
    $('surfaceHint').textContent = `Сценарий для PIN ${pin() + 1}. Проверь настройки и нажми SAVE.`;
    if (recipe[3] === 'modular') fields.scrollIntoView({ block: 'nearest' });
  }
  for (const recipe of recipes) {
    const card = el('article', null, 'scenario-card'); card.append(el('h3', recipe[1]), el('p', recipe[2]), btn('НАСТРОИТЬ И ДОБАВИТЬ', () => createRecipe(recipe)));
    card.dataset.recipe = recipe[0]; $('scenarioCards').append(card);
  }
  const help = [
    ['Счётчик / UNIT', 'Прибавляет заданный шаг. Минус-режим вычитает, числовая отмена возвращает последнее изменение.'],
    ['Значение / VALUE', 'Открывает ввод числа и сохраняет выбранный формат.'],
    ['Секундомер / DURATION SEC', 'Нажатие начинает или заканчивает отрезок; крупно текущий или последний отрезок.'],
    ['Минуты / DURATION MIN', 'Те же начало и остановка; показывает накопленные минуты.'],
    ['Сон / SLEEP', 'Отрезки сна; можно выбрать последний, сумму, последние записи или среднее.'],
    ['Сумма секунд / SEC COUNT', 'Крупно накопленные секунды нескольких отрезков.'],
    ['Интервал / TIMER', 'Повторяющийся обратный отсчёт. Нажатие во время работы останавливает и сбрасывает оставшееся время.'],
    ['До даты / COUNTDOWN', 'Показывает время до заданной даты; обычное нажатие не запускает секундомер.'],
    ['Пополнение / INCOME', 'Прибавляет сумму заданного шага.'],
    ['Бюджет / BUDGET', 'Вычитает шаг из начальной суммы.'],
    ['Формула / MATH', 'Считает по источникам. На нажатие меняет операцию только при включённой настройке.'],
    ['Пульс / LED', 'Включает или выключает пульсацию с выбранным BPM.'],
    ['Курс / CURRENCY', 'Открывает пересчёт суммы между валютами. В демо курс вымышленный.'],
    ['Точки / POINTS', 'Пишет границы одной общей записи и её отрезков.'],
    ['Хештег / #', 'Ввод прямо в кнопке; подсказки по первым буквам из тегов всех PIN и отрезков. Enter / ✓ сохраняет слово с временем открытия. Esc или уход сохраняет черновик, × отменяет.'],
    ['Состояние', 'Открывает радиальное меню. Одно выбранное состояние сразу сохраняется; для ещё одного нажми кнопку повторно. Собственные варианты сохраняются в меню.']
  ];
  for (const [name, text] of help) { const row = el('p'); row.append(el('strong', `${name}. `), document.createTextNode(text)); $('scenarioTypeHelp').append(row); }

  const history = el('div', null, 'modal'); history.id = 'workHistoryModal';
  history.innerHTML = '<div><label class="module-history-picker">Рабочий источник<select id="workHistorySelect"></select></label><div id="workHistorySummary"></div><div id="workHistoryRows"></div><p id="workHistoryEmpty" class="cycle-explanation">Добавь «Работа × ставка» из сценариев. Здесь будут её отрезки и расчёт.</p></div>';
  document.body.append(history); $('workHistorySelect').onchange = () => { selectedTrack = $('workHistorySelect').value; renderHistory(); };
  function openHistory(id) { selectedTrack = id || selectedTrack; renderHistory(); history.classList.add('visible'); }
  $('scenarioWorkHistory').onclick = () => openHistory();
  function renderHistory() {
    const j = read(); if (!j.tracks.some(t => t.id === selectedTrack)) selectedTrack = j.tracks[0]?.id;
    const select = $('workHistorySelect'); select.replaceChildren();
    for (const t of j.tracks) { const option = el('option', t.name); option.value = t.id; select.append(option); } select.value = selectedTrack || '';
    $('workHistorySummary').replaceChildren(); $('workHistoryRows').replaceChildren(); $('workHistoryEmpty').hidden = Boolean(j.tracks.length);
    const t = j.tracks.find(t => t.id === selectedTrack); if (!t) return;
    const total = M.totals(t), summary = $('workHistorySummary');
    const value = el('p', `${clock(total.milliseconds)} · ${cash(total.money, total.currency)}`, 'work-history-total'); value.dataset.workTotal = t.id; summary.append(value);
    summary.append(el('p', 'За всё время · расчёт по ставке каждого отрезка. Паузы не учитываются.', 'cycle-explanation'));
    if (t.running) {
      const source = j.bindings.find(b => b.trackId === t.id);
      summary.append(btn('ОСТАНОВИТЬ РАБОТУ', () => act(source, t.revision)));
    }
    for (const s of [...t.sessions, ...(t.running ? [t.running] : [])].reverse()) {
      const row = el('div', null, 'work-history-row'), duration = (s.end ?? Date.now()) - s.start;
      row.append(el('p', `${stamp(s.start)} → ${s.end ? stamp(s.end) : 'идёт'}`), el('p', `${clock(duration)} · ${cash(Math.max(0, duration) * s.rate.amount / s.rate.intervalMs, s.rate.currency, 4)}`), el('small', `Ставка ${cash(s.rate.amount * 3600000 / s.rate.intervalMs, s.rate.currency)} / час · PIN ${s.source.pin + 1}`));
      if (!s.end) row.dataset.workLive = t.id; $('workHistoryRows').append(row);
    }
  }
  function refresh() {
    const j = read(), now = Date.now();
    for (const node of document.querySelectorAll('.btn-habit[data-type="modular"]')) {
      const b = M.binding(j, Number(node.dataset.sourcePin), node.dataset.cellId), t = b && j.tracks.find(t => t.id === b.trackId);
      if (!t) continue;
      const total = M.totals(t, now), money = cash(total.money, total.currency, b.display.decimals), time = clock(total.milliseconds);
      const main = node.querySelector('.module-main'), number = node.querySelector('.module-digits'), fraction = node.querySelector('.module-fraction');
      const [whole, decimals] = total.money.toFixed(b.display.decimals).split('.');
      const compact = whole.length > (node.clientWidth < 150 ? 6 : 10);
      number.textContent = b.display.primary === 'time' ? time : compact ? new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 2 }).format(total.money) : whole;
      fraction.textContent = b.display.primary === 'money' && !compact ? `.${decimals}` : '';
      node.dataset.primary = b.display.primary;
      node.querySelector('.module-currency').textContent = currencyLabel(total.currency);
      node.querySelector('.module-secondary').textContent = b.display.primary === 'money' ? time : money;
      const hours = node.querySelector('.module-hours'); hours.textContent = b.display.wholeHours ? `${total.completeHours} ч` : ''; hours.title = `Полных отработанных часов: ${total.completeHours}`;
      node.querySelector('.module-state').textContent = t.running ? 'СТОП' : 'НАЧАТЬ';
      const minutes = total.milliseconds % 3600000 / 60000, meter = node.querySelector('.module-meter');
      meter.style.setProperty('--hour-fill', `${minutes / 60 * 100}%`);
      meter.title = `Следующий полный час: ${Math.floor(minutes)} из 60 мин`;
      node.classList.toggle('running', Boolean(t.running)); node.dataset.revision = t.revision;
      node.title = `${node.dataset.label}\nВремя: ${time}\nРасчёт: ${money}\nПолных часов: ${total.completeHours}\nПолоска — накопление следующего полного часа.`;
      node.setAttribute('aria-label', `${node.dataset.label}: ${time}, расчёт ${money}. ${t.running ? 'Остановить' : 'Начать'}`);
      // Fit the value to its module rather than shrinking every control with the viewport.
      main.style.fontSize = `${node.clientHeight < 110 ? 24 : node.clientWidth < 150 ? 28 : 38}px`;
      if (main.scrollWidth > main.clientWidth && main.clientWidth > 0) main.style.fontSize = `${Math.max(15, parseFloat(main.style.fontSize) * main.clientWidth / main.scrollWidth)}px`;
    }
    if (history.classList.contains('visible')) {
      const t = j.tracks.find(t => t.id === selectedTrack), total = t && M.totals(t, now);
      const summary = history.querySelector('[data-work-total]');
      if (summary && total) summary.textContent = `${clock(total.milliseconds)} · ${cash(total.money, total.currency)}`;
      const live = history.querySelector('[data-work-live] p:nth-child(2)');
      if (live && t?.running) { const s = t.running, ms = Math.max(0, now - s.start); live.textContent = `${clock(ms)} · ${cash(ms * s.rate.amount / s.rate.intervalMs, s.rate.currency, 4)}`; }
    }
  }
  window.TRCKNG_MODULES = {
    ...previous,
    beforeReset(context) {
      const j = read(), b = M.binding(j, context.pin, context.habit);
      if (b && M.track(j, b.trackId).running) throw Error('Останови работу перед удалением кнопки. Её отрезки останутся в истории работы.');
    },
    openEditor(context) {
      previous.openEditor?.(context); const j = read(), b = M.binding(j, context.pin, context.habit), currentTrack = context.type === 'modular' ? b?.trackId : null;
      editor = { ...context, expected: M.editorStamp(j, context.pin, context.habit, currentTrack) };
      const select = $('moduleTrack'); select.replaceChildren(); const create = el('option', 'Новый рабочий таймер'); create.value = ''; select.append(create);
      for (const t of j.tracks) { const option = el('option', `${t.name}${t.running ? ' · идёт' : ''}`); option.value = t.id; select.append(option); }
      select.value = currentTrack || ''; populateRate(currentTrack ? M.track(j, currentTrack) : null, currentTrack ? b.display : { primary: 'money', decimals: 4, wholeHours: true });
    },
    showEditor(t) { previous.showEditor?.(t); fields.hidden = t !== 'modular'; },
    prepareEdit(context) {
      const j = read(), old = M.binding(j, context.pin, context.habit);
      if (context.type !== 'modular') {
        if (old && editor?.type === 'modular' && M.track(j, old.trackId).running) throw Error('Останови работу перед сменой типа кнопки.');
        return previous.prepareEdit?.(context);
      }
      if (!context.label) throw Error('Укажи название модульной кнопки.');
      const next = M.configure(j, { pin: context.pin, cellId: context.habit, trackId: $('moduleTrack').value || undefined, name: context.label, rate: rateFromForm(),
        display: { primary: $('modulePrimary').value, decimals: Number($('moduleDecimals').value), wholeHours: $('moduleWholeHours').checked }, expected: editor?.expected });
      return () => persist(next);
    },
    render(cell, grid) {
      if (cell.type !== 'modular' || !cell.label.trim()) return previous.render(cell, grid);
      const node = btn('', () => {
        const b = M.binding(read(), cell.pin, cell.id); if (b) act(b, Number(node.dataset.revision)); else $('surfaceHint').textContent = 'Открой настройки кнопки и выбери источник.';
      }); node.id = `btn-${cell.id}`; node.className = 'btn-habit module-work'; node.dataset.type = 'modular'; node.dataset.sourcePin = cell.pin; node.dataset.cellId = cell.id; node.dataset.label = cell.label;
      node.style.setProperty('--btn-color', cell.color); window.applyCellLayoutToElement(node, cell.layout);
      const head = el('span', null, 'module-head'); head.append(el('span', '', 'module-state'), el('span', '', 'module-currency'));
      const main = el('span', null, 'module-main'); main.append(el('span', '0', 'module-digits'), el('span', '', 'module-fraction'));
      const details = el('span', null, 'module-details'); details.append(el('span', '', 'module-secondary'), el('span', '', 'module-hours'));
      const meter = el('span', null, 'module-meter'); meter.setAttribute('aria-hidden', 'true'); meter.append(el('span'));
      node.append(head, main, details, meter, el('span', cell.label, 'btn-label')); grid.append(node); return true;
    },
    installNavigation() {
      const menu = btn('СЦЕНАРИИ / ПОМОЩЬ', () => { scenarios.classList.add('visible'); }); menu.id = 'surfaceScenarios'; $('surfaceMenu').prepend(menu);
      const link = btn('РАБОТА / РАСЧЁТ', () => openHistory()); link.id = 'historyWork'; $('historyView').prepend(link);
      // Snapshot files include the source journal, so a button is never exported alone.
    }
  };
  new MutationObserver(refresh).observe($('habitsGrid'), { childList: true });
  new ResizeObserver(refresh).observe($('habitsGrid'));
  window.addEventListener('sstm-v2-loaded', () => { refresh(); renderHistory(); });
  setInterval(refresh, 1000);
})();
