'use strict';
(() => {
  const S = window.TRCKNG_STOPWATCH, $ = id => document.getElementById(id), modal = $('cellEditModal');
  const fields = document.createElement('section'); fields.id = 'stopwatchSettings'; fields.className = 'stopwatch-settings';
  fields.innerHTML = `<label>Вид секундомера<select id="stopwatchPreset">
    <option value="classic">Секундомер · как раньше</option><option value="minutes">Сумма минут</option><option value="seconds">Сумма секунд</option>
    <option value="clock">Сумма времени</option><option value="hours">Сумма часов</option><option value="last">Последний отрезок</option>
    <option value="saved" hidden>Мой сохранённый вид</option></select></label>
    <output id="stopwatchPreview" aria-live="polite"><strong></strong><span></span></output>
    <p id="stopwatchPresetHint"></p>
    <p>Выбирай готовый вид. Нажатие начинает или останавливает отсчёт; смена вида сохраняет время и историю.</p>`;
  modal.querySelector('.module-type-palette').after(fields);
  let subject, pin, openedType, savedView;
  const selected = () => modal.querySelector('[data-type].active')?.dataset.type;
  const view = () => $('stopwatchPreset').value === 'saved' ? savedView : { preset: $('stopwatchPreset').value };
  const hints = {
    classic: 'Крупно — текущий отрезок, после остановки — последний. Под ним — сумма за неделю. Минуты:секунды; часы появляются после часа.',
    minutes: 'Крупно — целые минуты за неделю, как раньше. Под ними — расшифровка с часами и секундами.',
    seconds: 'Крупно — все секунды за неделю. Под ними — это же время в часах, минутах и секундах.',
    clock: 'Крупно — сумма времени за неделю. Под ней — текущий или последний отрезок.',
    hours: 'Крупно — часы за неделю с дробной частью. Под ними — текущий или последний отрезок.',
    last: 'Крупно — последний завершённый отрезок, даже когда идёт следующий. Под ним — текущий отсчёт. Если прошлой записи нет, видно «—».',
    saved: 'Твой выбранный ранее вид сохранён. Можно оставить его или выбрать один из готовых вариантов.'
  };
  function preview() {
    const type = S.resolveType(openedType, selected()); fields.hidden = !S.isType(type);
    if (fields.hidden) return;
    const display = S.presentation({ state: durationStates[subject], stored: weekData[currentWeekKey]?.[subject], type, sessions: durationSessions, habit: subject }, view(), SstmI18n.language);
    $('stopwatchPresetHint').textContent = SstmI18n.text(hints[$('stopwatchPreset').value]);
    fields.querySelector('strong').textContent = `${display.main}${display.suffix ? ' ' + display.suffix : ''}`;
    fields.querySelector('output span').textContent = display.breakdown;
  }
  const original = window.openCellEditModal;
  window.openCellEditModal = function (...args) {
    const result = original.apply(this, args);
    if (subject === modal.dataset.subjectId && modal.dataset.stopwatchDraft === 'yes') { preview(); return result; }
    subject = modal.dataset.subjectId; pin = currentPin; openedType = habitTypes[subject];
    savedView = S.viewFor(S.read(), pin, subject, openedType);
    fields.querySelector('[value=saved]').hidden = Boolean(savedView.preset);
    $('stopwatchPreset').value = savedView.preset || 'saved';
    modal.dataset.stopwatchDraft = 'yes'; preview(); return result;
  };
  S.prepareEdit = ({ habit, type }) => {
    if (!S.isType(type)) return null;
    const choice = view();
    S.validate({ version: 2, views: [{ ...choice, pin: currentPin, cellId: habit }] }); return choice;
  };
  S.commitEdit = ({ habit, pin, type, view }) => S.set(pin, habit, type, view);
  fields.addEventListener('change', () => {
    preview();
    requestAnimationFrame(() => {
      const target = $('stopwatchPreview').getBoundingClientRect();
      const bottom = modal.querySelector('.modal-buttons').getBoundingClientRect().top - 12;
      const top = modal.querySelector('.surface-panel-head').getBoundingClientRect().bottom + 8;
      // Native select/scrollIntoView does not account for the sticky action row.
      if (target.bottom > bottom) modal.firstElementChild.scrollTop += target.bottom - bottom;
      else if (target.top < top) modal.firstElementChild.scrollTop -= top - target.top;
    });
  });
  modal.addEventListener('click', event => { if (event.target.closest('[data-type]')) preview(); });
  new MutationObserver(() => { if (!modal.classList.contains('visible') && !editingHabit) delete modal.dataset.stopwatchDraft;
  }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('sstm-language-changed', () => { preview(); renderHabits(); });
})();
