'use strict';
// A small read-only front page for the existing weekly totals. Detailed history
// and corrections keep their original engine and remain available on demand.
(() => {
  const host = document.createElement('section'); host.id = 'simpleStats';
  host.innerHTML = '<p id="simpleStatsScope" data-no-i18n></p><div class="simple-stats-controls"><label>Неделя<select id="simpleStatsWeek"></select></label><label>Кнопка<select id="simpleStatsButton" data-no-i18n></select></label></div><div id="simpleStatsRows" data-no-i18n></div><p class="simple-stats-note">Сохранённые итоги за неделю. Текущие таймеры показаны отдельно.</p>';
  document.getElementById('logStatistics').prepend(host);
  const $ = id => document.getElementById(id), t = (ru, en) => SstmI18n.language === 'en' ? en : ru;
  let signature = '', lastPin = null;
  const option = (value, text) => { const node = document.createElement('option'); node.value = value; node.textContent = text; return node; };
  const readModules = () => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_modules') || 'null') || SstmModules.empty();
  window.SstmExtraHistoryWeeks = pin => {
    const journal = readModules(), ids = new Set(journal.bindings.filter(binding => binding.pin === pin).map(binding => binding.trackId)), weeks = new Set();
    for (const track of journal.tracks.filter(track => ids.has(track.id))) for (const session of [...track.sessions, ...(track.running ? [track.running] : [])]) {
      const end = session.end ?? Date.now(); let cursor = session.start;
      for (let i = 0; i < WEEKS_TO_KEEP && cursor < end; i++) {
        const key = getWeekKey(new Date(cursor)); weeks.add(key); cursor = getWeekBoundsMs(key).endMs;
      }
      weeks.add(getWeekKey(new Date(end - 1)));
    }
    return [...weeks];
  };
  function refresh() {
    if ($('historyView').hidden || $('logStatistics').hidden) return;
    const projection = buildHistoryProjection();
    const journal = readModules();
    const weeks = getHistoryWeekKeys(), key = JSON.stringify([projection, journal, weeks, currentPin, SstmI18n.language, $('simpleStatsButton').value, journal.tracks.some(track => track.running) ? Math.floor(Date.now() / 1000) : 0]);
    if (key === signature) return; signature = key;
    const selected = lastPin === currentPin ? $('simpleStatsButton').value : ''; lastPin = currentPin;
    const formatDate = value => new Date(value).toLocaleDateString(SstmI18n.locale, { day: '2-digit', month: '2-digit' });
    $('simpleStatsScope').textContent = `${getCurrentPinName()} · ${historyTimelineWeekKey.slice(0, 4)}`;
    const weekOptions = weeks.map(week => {
      const bounds = getWeekBoundsMs(week);
      return option(week, `${formatDate(bounds.startMs)} – ${formatDate(bounds.endMs - 1)}`);
    });
    if ($('simpleStatsWeek').textContent !== weekOptions.map(node => node.textContent).join('')) $('simpleStatsWeek').replaceChildren(...weekOptions);
    $('simpleStatsWeek').value = historyTimelineWeekKey;
    const selectedBounds = getWeekBoundsMs(historyTimelineWeekKey);
    $('simpleStatsWeek').title = `${new Date(selectedBounds.startMs).toLocaleDateString(SstmI18n.locale)} → ${new Date(selectedBounds.endMs - 1).toLocaleDateString(SstmI18n.locale)}`;
    const rows = projection.rows.filter(row => row.timed || row.counted).map(row => ({
      id: row.id, label: row.label, value: formatMatrixValue(row, row.storedTotal, true),
      live: row.buckets.reduce((sum, bucket) => sum + bucket.liveSeconds, 0), active: row.active
    }));
    // A modular button may share its track across PINs. Show its total once per
    // visible track, using the module's own rate-aware time calculation.
    const bounds = getWeekBoundsMs(historyTimelineWeekKey), tracks = new Set();
    for (const view of journal.bindings.filter(view => view.pin === currentPin)) {
      const track = journal.tracks.find(track => track.id === view.trackId);
      if (!track || tracks.has(track.id)) continue; tracks.add(track.id);
      const saved = SstmModules.totals({ ...track, running: null }, Date.now(), bounds.startMs, bounds.endMs);
      const live = track.running ? Math.max(0, Math.min(Date.now(), bounds.endMs) - Math.max(track.running.start, bounds.startMs)) / 1000 : 0;
      rows.push({ id: `module:${track.id}`, label: track.name, value: SstmLog.clock(saved.milliseconds), live, active: saved.milliseconds > 0 || live > 0 });
    }
    const buttonOptions = [option('', t('Все кнопки', 'All buttons')), ...rows.map(row => option(row.id, row.label))];
    const optionKey = nodes => JSON.stringify(Array.from(nodes, node => [node.value, node.textContent]));
    if (optionKey($('simpleStatsButton').options) !== optionKey(buttonOptions)) $('simpleStatsButton').replaceChildren(...buttonOptions);
    $('simpleStatsButton').value = rows.some(row => row.id === selected) ? selected : '';
    const visible = rows.filter(row => $('simpleStatsButton').value ? row.id === $('simpleStatsButton').value : row.active);
    $('simpleStatsRows').replaceChildren();
    for (const row of visible) {
      const item = document.createElement('div'); item.className = 'simple-stat-row';
      const name = document.createElement('span'); name.textContent = row.label;
      const value = document.createElement('strong'); value.textContent = row.value; item.append(name, value);
      if (row.live) { const live = document.createElement('small'); live.textContent = `${t('Сейчас идёт', 'Running now')}: ${SstmLog.clock(row.live * 1000)}`; item.append(live); }
      $('simpleStatsRows').append(item);
    }
    if (!visible.length) { const empty = document.createElement('p'); empty.textContent = t('За эту неделю пока нет итогов.', 'No totals for this week yet.'); $('simpleStatsRows').append(empty); }
  }
  $('simpleStatsWeek').onchange = () => { setHistoryTimelineWeek($('simpleStatsWeek').value); refresh(); };
  $('simpleStatsButton').onchange = () => { signature = ''; refresh(); };
  window.SstmSimpleStats = { refresh };
  setInterval(refresh, 1000);
})();
