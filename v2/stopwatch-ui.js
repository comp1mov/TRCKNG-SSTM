'use strict';
(() => {
  const S = window.TRCKNG_STOPWATCH, $ = id => document.getElementById(id), modal = $('cellEditModal');
  const fields = document.createElement('section'); fields.id = 'stopwatchSettings'; fields.className = 'stopwatch-settings';
  fields.innerHTML = `<label>Показатель<select id="stopwatchMode"><option value="interval">Текущий / последний отрезок</option><option value="week">Сумма за эту неделю</option></select></label>
    <label>Формат<select id="stopwatchFormat"><option value="clock">Часы : минуты : секунды</option><option value="hours">Всего часов</option><optgroup label="Другие единицы"><option value="minutes">Всего минут</option><option value="seconds">Всего секунд</option></optgroup></select></label>
    <output id="stopwatchPreview" aria-live="polite"><strong></strong><span></span></output>
    <p>Первое нажатие — начать, следующее — остановить. Формат меняет только цифры; время и история сохраняются.</p>`;
  modal.querySelector('.module-type-palette').after(fields);
  let subject, pin, openedType;
  const selected = () => modal.querySelector('[data-type].active')?.dataset.type;
  function preview() {
    const type = S.resolveType(openedType, selected()); fields.hidden = !S.isType(type);
    fields.querySelector('optgroup').label = SstmI18n.text('Другие единицы');
    if (fields.hidden) return;
    const seconds = $('stopwatchMode').value === 'week'
      ? S.total({ state: durationStates[subject], stored: weekData[currentWeekKey]?.[subject], type })
      : S.interval({ state: durationStates[subject], sessions: durationSessions, habit: subject });
    const fmt = S.format(seconds, $('stopwatchFormat').value, SstmI18n.language);
    fields.querySelector('strong').textContent = `${fmt.main}${fmt.suffix ? ' ' + fmt.suffix : ''}`;
    fields.querySelector('output span').textContent = SstmI18n.text($('stopwatchMode').value === 'week' ? 'ЭТА НЕДЕЛЯ' : 'ОТРЕЗОК');
  }
  const original = window.openCellEditModal;
  window.openCellEditModal = function (...args) {
    const result = original.apply(this, args);
    // The surface may resume a parked draft instead of opening the requested cell.
    if (subject === modal.dataset.subjectId && modal.dataset.stopwatchDraft === 'yes') { preview(); return result; }
    subject = modal.dataset.subjectId; pin = currentPin; openedType = habitTypes[subject];
    const view = S.viewFor(S.read(), pin, subject, openedType);
    $('stopwatchMode').value = view.mode; $('stopwatchFormat').value = view.format;
    modal.dataset.stopwatchDraft = 'yes'; preview(); return result;
  };
  S.prepareEdit = ({ habit, type }) => {
    if (!S.isType(type)) return null;
    const view = { mode: $('stopwatchMode').value, format: $('stopwatchFormat').value };
    S.validate({ version: 1, views: [{ ...view, pin: currentPin, cellId: habit }] }); return view;
  };
  S.commitEdit = ({ habit, pin, type, view }) => S.set(pin, habit, type, view);
  fields.addEventListener('change', () => {
    preview();
    // Keep the result above the sticky Save/Cancel row when choosing a format.
    $('stopwatchPreview').scrollIntoView({ block: 'nearest' });
  });
  modal.addEventListener('click', event => { if (event.target.closest('[data-type]')) preview(); });
  new MutationObserver(() => { if (!modal.classList.contains('visible') && !modal.classList.contains('surface-minimized')) {
    // A docked draft remains owned by the surface. On a true close the editor
    // clears editingHabit; preserve all other draft transitions.
    if (!editingHabit) delete modal.dataset.stopwatchDraft;
  } }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('sstm-language-changed', () => { preview(); renderHabits(); });
})();
