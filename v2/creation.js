'use strict';
// Reuse the existing editor controls and save handlers; grouping is presentation.
(() => {
  const $ = id => document.getElementById(id), modal = $('cellEditModal');
  const el = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text || ''; if (cls) n.className = cls; return n; };
  const groups = [
    ['capture', 'ОТМЕТИТЬ', [
      ['unit', 'Счётчик', 'Нажатие прибавляет шаг.'], ['value', 'Число', 'Нажатие открывает ввод значения.'],
      ['tag', 'Хештег', 'Введи слово прямо на поле.'], ['state', 'Состояние', 'Выбери слово на карте состояний.']]],
    ['time', 'ВРЕМЯ', [
      ['duration_sec', 'Секундомер', 'Начать / остановить. Отрезок или сумма; формат выбирается ниже.'],
      ['sleep', 'Сон', 'Начать / остановить сон. Отображение можно настроить.'],
      ['timer', 'Таймер', 'Обратный отсчёт. Повторное нажатие остановит и сбросит его.'],
      ['countdown', 'До события', 'Часы до выбранной даты и времени.'],
      ['points', 'Точки / отрезки', 'Каждое нажатие ставит границу общей записи.']]],
    ['money', 'ДЕНЬГИ', [
      ['modular', 'Работа × ставка', 'Начать / остановить работу. Время превращается в расчётную сумму.'],
      ['money_income', 'Пополнение', 'Нажатие прибавляет денежный шаг.'],
      ['money_budget', 'Бюджет', 'Нажатие вычитает расход из начальной суммы.']]],
    ['tools', 'ИНСТРУМЕНТЫ', [
      ['math', 'Формула', 'Расчёт из кнопок или постоянного числа.'],
      ['led_pulse', 'Пульс / BPM', 'Нажатие включает или выключает пульс.'],
      ['currency', 'Конвертер валют', 'Нажатие открывает пересчёт суммы.']]]
  ];
  const palette = modal.querySelector('.module-type-palette'), oldRows = [...palette.querySelectorAll('.type-selector')];
  const buttons = [...palette.querySelectorAll('[data-type]')], tabs = el('nav', '', 'creation-groups'); tabs.id = 'creationGroups';
  const choices = el('div', '', 'type-selector creation-types'); choices.id = 'creationTypes';
  const hint = el('p', '', 'creation-hint'); hint.id = 'creationAction'; hint.setAttribute('aria-live', 'polite');
  palette.querySelector('.cell-edit-label').textContent = 'Что делает кнопка'; palette.append(tabs, choices, hint);
  const info = new Map();
  for (const [group, label, types] of groups) {
    const tab = el('button', label); tab.type = 'button'; tab.dataset.creationGroup = group; tab.onclick = () => showGroup(group); tabs.append(tab);
    for (const [type, title, help] of types) {
      const b = buttons.find(n => n.dataset.type === type); if (!b) continue;
      b.textContent = title; choices.append(b); info.set(type, { group, help, title });
    }
  }
  oldRows.forEach(n => n.remove());
  // Retain legacy selectors for editor identity; only one stopwatch is offered.
  for (const type of ['duration_min', 'duration_sec_count']) {
    const button = buttons.find(b => b.dataset.type === type); choices.append(button); info.set(type, info.get('duration_sec'));
  }
  function showGroup(group) {
    for (const tab of tabs.children) tab.setAttribute('aria-pressed', String(tab.dataset.creationGroup === group));
    for (const b of buttons) b.hidden = ['duration_min', 'duration_sec_count'].includes(b.dataset.type) || info.get(b.dataset.type)?.group !== group;
  }
  const advanced = el('details', '', 'creation-advanced'); advanced.id = 'creationAdvanced'; advanced.append(el('summary', 'Подпись и история'));
  $('descriptionField').before(advanced); advanced.append($('descriptionField'), $('flagSettingsFields'));
  advanced.append($('cellEditReset'));
  const help = $('cellEditHelpPanel'); help.replaceChildren(el('p', 'Выбери действие, размер и имя. Настройки ниже относятся только к выбранному типу. Соседи сдвинутся при сохранении, если нужно освободить место.'));
  const placement = el('p', '', 'creation-hint'); placement.id = 'creationPlacement'; $('layoutSettingsFields').append(placement);
  $('layoutSettingsFields').querySelector('.cell-edit-label').textContent = 'Размер';
  $('cellEditInput').placeholder = 'Имя кнопки';
  const originalOpen = window.openCellEditModal;
  let lastSubject, lastType;
  function refresh() {
    const type = modal.querySelector('[data-type].active')?.dataset.type, subject = modal.dataset.subjectId;
    if (subject !== lastSubject || type !== lastType) {
      showGroup(info.get(type)?.group || 'capture'); lastType = type;
      if (subject !== lastSubject) advanced.open = false;
      lastSubject = subject;
    }
    hint.replaceChildren(el('strong', info.get(type)?.title), el('span', info.get(type)?.help));
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.type === type || b.dataset.type === 'duration_sec' && ['duration_min', 'duration_sec_count'].includes(type)));
    const size = modal.querySelector('[data-layout-size].active')?.dataset.layoutSize || '1x1';
    const [colSpan, rowSpan] = size.split('x').map(Number);
    if (!subject) return;
    const current = window.getCellsSnapshot();
    const result = window.TRCKNG_LAYOUT.plan(current, subject, { ...window.getCellLayout(subject), colSpan, rowSpan });
    const count = result && Object.keys(result).filter(id => id !== subject).length;
    placement.textContent = !result ? 'Край поля. Выбери меньший размер или другое место.' : count ? 'Соседи сдвинутся при сохранении. Их размеры и записи сохранятся.' : 'Размер в клетках. Кнопка останется на выбранном месте.';
    const existing = current.find(c => c.id === subject);
    $('cellEditLabel').textContent = existing?.label.trim() ? 'НАСТРОИТЬ КНОПКУ' : 'НОВАЯ КНОПКА';
    $('cellEditReset').hidden = !existing;
  }
  window.openCellEditModal = function (...args) { const result = originalOpen.apply(this, args); refresh(); return result; };
  // Original click handlers still own type selection and type-specific settings.
  modal.addEventListener('click', event => { if (event.target.closest('[data-type],[data-layout-size]')) refresh(); });
  new MutationObserver(() => { if (modal.classList.contains('visible')) refresh(); }).observe(modal, { attributes: true, attributeFilter: ['class'] });
})();
