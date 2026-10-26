'use strict';
(() => {
  const $ = id => document.getElementById(id), t = (ru, en) => SstmI18n.language === 'en' ? en : ru;
  const host = document.createElement('nav'); host.id = 'surfaceQuickNav';
  host.setAttribute('aria-label', 'Основная навигация');
  host.innerHTML = '<div id="quickUndoContext" data-no-i18n></div><div class="quick-nav-buttons"><button type="button" id="quickField">ПОЛЕ</button><button type="button" id="quickLog">ЛОГ</button><button type="button" id="quickUndo" aria-describedby="quickUndoContext">↶ ОТМЕНИТЬ</button></div>';
  document.querySelector('.surface-footer').before(host);
  $('btnUndo').hidden = true;
  let candidate = null, signature = '';
  $('quickField').onclick = () => { TRCKNG_NAVIGATION.dismissPanels(); setView('track'); };
  $('quickLog').onclick = () => SstmLogView.open();
  $('quickUndo').onclick = () => {
    if (!candidate || (window.TRCKNG_ACCOUNT && !TRCKNG_ACCOUNT.ready)) return;
    undoLastCounterChange(candidate); refresh();
  };
  function refresh() {
    const next = getUndoCounterChange();
    const key = JSON.stringify([next, document.body.dataset.view, SstmI18n.language, window.TRCKNG_ACCOUNT?.ready]);
    if (key === signature) return; signature = key; candidate = next;
    const enabled = Boolean(next) && (!window.TRCKNG_ACCOUNT || TRCKNG_ACCOUNT.ready);
    $('quickUndo').disabled = !enabled;
    $('quickField').setAttribute('aria-pressed', String(document.body.dataset.view === 'track'));
    $('quickLog').setAttribute('aria-pressed', String(document.body.dataset.view === 'history'));
    const format = value => new Intl.NumberFormat(SstmI18n.locale, { maximumFractionDigits: 4 }).format(value);
    const description = next ? `${t('Отмена числа', 'Undo number')}: ${next.label || next.habit} · ${format(next.nextValue)} → ${format(next.previousValue)}` : t('Нет числовых изменений для отмены', 'No number changes to undo');
    $('quickUndoContext').textContent = description;
    $('quickUndoContext').hidden = !enabled;
    $('quickUndo').title = description;
    $('quickUndo').setAttribute('aria-label', description);
  }
  window.addEventListener('sstm-counter-changed', refresh);
  window.addEventListener('sstm-v2-loaded', refresh);
  window.addEventListener('sstm-language-changed', refresh);
  new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
  new MutationObserver(refresh).observe(document.querySelector('.pins'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  setInterval(refresh, 1000); refresh();
})();
