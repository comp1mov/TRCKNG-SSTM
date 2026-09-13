'use strict';
(() => {
  const fields = document.createElement('div');
  fields.id = 'unitRecencySettings';
  fields.innerHTML = `<label class="cell-edit-field">Вид Unit
    <select id="unitView" class="cell-edit-input">
      <option value="count">Количество</option>
      <option value="elapsed">Время с последней отметки</option>
    </select></label>
    <p class="cycle-explanation">До 48 часов — часы и минуты, затем — полные дни. Количество остаётся под временем. Если отметка неизвестна, видно «—».</p>
    <label class="unit-confirm-option"><input id="unitConfirmTap" type="checkbox">Подтверждать нажатие</label>
    <p class="cycle-explanation">Случайное касание не изменит число и отсчёт без подтверждения.</p>`;
  document.getElementById('unitSettingsFields').append(fields);
  window.addEventListener('sstm-language-changed', () => renderHabits());
})();
