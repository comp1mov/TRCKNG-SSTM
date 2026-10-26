'use strict';
(() => {
  const history = document.getElementById('historyView'), model = window.SstmLog;
  const t = (ru, en) => window.SstmI18n.language === 'en' ? en : ru;
  const el = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
  const stats = el('div', undefined, 'log-statistics'); stats.id = 'logStatistics';
  const advanced = el('details'); advanced.id = 'logAdvancedStats';
  advanced.append(el('summary', 'Подробные таблицы и исправления'), ...history.children);
  stats.append(advanced); stats.hidden = true;
  const tabs = el('nav', undefined, 'log-tabs'); tabs.setAttribute('aria-label', 'History');
  const logTab = el('button', 'ЛОГ'), timelineTab = el('button', 'ТАЙМЛИНИЯ'), statsTab = el('button', 'СТАТИСТИКА');
  logTab.id = 'logTab'; timelineTab.id = 'logTimelineTab'; statsTab.id = 'logStatsTab';
  logTab.type = timelineTab.type = statsTab.type = 'button'; tabs.append(logTab, timelineTab, statsTab);
  const timeline = document.getElementById('recordingCalendar'); timeline.hidden = true;
  const log = el('section'); log.id = 'eventLog';
  log.innerHTML = '<div class="log-controls"><input id="logSearch" type="search" placeholder="Поиск в логе" aria-label="Поиск в логе"><select id="logFilter" aria-label="События"><option value="all">Все события</option><option value="points">Точки / этапы</option><option value="buttons">Кнопки</option></select></div><div class="log-column-labels"><span>Время цикла</span><span>Событие</span><span>Время</span></div><div id="logRows" data-no-i18n></div><p id="logEmpty"></p><button id="logMore" type="button">ПОКАЗАТЬ РАНЬШЕ</button>';
  history.append(tabs, log, timeline, stats);
  const rows = log.querySelector('#logRows'), search = log.querySelector('#logSearch'), filter = log.querySelector('#logFilter'), more = log.querySelector('#logMore');
  let limit = 100, lastSignature = '', lastLanguage = '', shown = [];
  const labels = {
    'cycle-start': ['Начало цикла', 'Cycle started'], 'cycle-end': ['Конец цикла', 'Cycle ended'], interval: ['Новый этап', 'New stage'], point: ['Точка', 'Point'],
    value: ['Изменение', 'Change'], undo: ['Отмена', 'Undo'], 'timer-start': ['Старт', 'Started'], 'timer-end': ['Стоп', 'Stopped'], tag: ['Метка', 'Tag'], state: ['Состояние', 'State']
  };
  function refresh(force = false) {
    if (history.hidden || log.hidden) return;
    const entries = model.entries(window.buildCloudSnapshot());
    const signature = JSON.stringify(entries), language = window.SstmI18n.language;
    if (!force && signature === lastSignature && language === lastLanguage) return;
    lastSignature = signature; lastLanguage = language;
    const query = search.value.trim().toLocaleLowerCase();
    const selected = entries.filter(e => (filter.value === 'all' || (filter.value === 'points') === Boolean(e.pointId)) && (!query || [e.text, e.stage, e.pinName, ...(e.tags || [])].join(' ').toLocaleLowerCase().includes(query)));
    shown = selected.slice(0, limit);
    const anchor = [...rows.children].find(n => n.getBoundingClientRect().bottom > tabs.getBoundingClientRect().bottom);
    const anchorId = anchor?.dataset.entry, anchorTop = anchor?.getBoundingClientRect().top;
    const preserve = history.scrollTop > 80;
    rows.replaceChildren(); let day = '';
    const locale = language === 'en' ? 'en-GB' : 'ru-RU';
    for (const entry of shown) {
      const date = new Date(entry.at), nextDay = date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
      if (nextDay !== day) { rows.append(el('p', nextDay, 'log-date')); day = nextDay; }
      const row = el(entry.pointId ? 'button' : 'div', undefined, 'log-row'); row.dataset.entry = entry.id;
      if (entry.pointId) { row.type = 'button'; row.onclick = () => window.SstmRecordings.open(entry.cycleId, entry.pointId); }
      if (entry.undone) row.classList.add('log-undone');
      const elapsed = el('span', model.clock(entry.elapsed), 'log-elapsed'); elapsed.title = t('От начала цикла', 'Since cycle start');
      const content = el('span', undefined, 'log-content'), kind = t(...labels[entry.kind]);
      const title = el('strong', entry.text || entry.stage || kind); content.append(title);
      const detail = title.textContent === kind ? [] : [kind];
      if (entry.kind === 'value') detail.push(`${entry.delta > 0 ? '+' : ''}${Number(entry.delta.toFixed(6))} → ${entry.value}`);
      if (entry.kind === 'undo') detail.push(`${entry.value} → ${entry.before}`);
      if (entry.duration !== undefined) detail.push(model.clock(entry.duration));
      if (entry.running) detail.push(t('идёт', 'running'));
      if (entry.stage && entry.stage !== title.textContent) detail.push(entry.stage);
      if (entry.pinName) detail.push(entry.pinName);
      if (entry.undone) detail.push(t('отменено', 'undone'));
      if (detail.length) content.append(el('small', detail.join(' · ')));
      if (entry.tags?.length) content.append(el('small', entry.tags.map(tag => '#' + tag).join(' '), 'log-tags'));
      const time = el('time', date.toLocaleTimeString(locale, { hour12: false }), 'log-wall-time'); time.dateTime = date.toISOString(); time.title = date.toLocaleString(locale);
      row.append(elapsed, content, time); rows.append(row);
    }
    more.hidden = selected.length <= limit;
    log.querySelector('#logEmpty').textContent = selected.length ? '' : t('Пока пусто. Добавь точку или нажми кнопку на поле.', 'Nothing here yet. Add a point or use a field button.');
    if (preserve && anchorId) { const replacement = [...rows.children].find(n => n.dataset.entry === anchorId); if (replacement) history.scrollTop += replacement.getBoundingClientRect().top - anchorTop; }
  }
  let selectedView = 'log';
  const positions = { log: 0, timeline: 0, stats: 0 };
  function select(view = 'log') {
    positions[selectedView] = history.scrollTop; selectedView = view;
    stats.hidden = view !== 'stats'; log.hidden = view !== 'log'; timeline.hidden = view !== 'timeline';
    document.body.dataset.historyPanel = view;
    for (const [tab, name] of [[logTab, 'log'], [timelineTab, 'timeline'], [statsTab, 'stats']]) tab.setAttribute('aria-pressed', String(view === name));
    history.scrollTop = positions[view]; refresh(true);
    if (view === 'timeline') window.dispatchEvent(new Event('sstm-calendar-view'));
    if (view === 'stats') window.SstmSimpleStats?.refresh();
  }
  function open(view = 'log') {
    window.TRCKNG_NAVIGATION.dismissPanels(); window.setView('history'); select(view);
  }
  logTab.onclick = () => select('log'); timelineTab.onclick = () => select('timeline'); statsTab.onclick = () => select('stats');
  window.SstmLogView = { open, select };
  document.getElementById('btnViewHistory').addEventListener('click', event => {
    event.preventDefault(); event.stopImmediatePropagation(); open();
  }, true);
  // All former calendar entry points now lead to the same visible tab.
  document.body.classList.add('personal-cycle');
  for (const id of ['cycleCalendar', 'surfaceCalendar']) {
    const button = document.getElementById(id); button.textContent = 'ТАЙМЛИНИЯ';
    button.setAttribute('aria-label', 'Открыть таймлинию'); button.onclick = () => open('timeline');
    button.removeAttribute('aria-pressed');
  }
  for (const control of [search, filter]) control.addEventListener('input', () => { limit = 100; refresh(true); });
  more.onclick = () => { limit += 100; refresh(true); };
  new MutationObserver(() => refresh()).observe(history, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('sstm-language-changed', () => refresh(true));
  window.addEventListener('sstm-v2-loaded', () => refresh(true));
  setInterval(refresh, 1000); select('log');
})();
