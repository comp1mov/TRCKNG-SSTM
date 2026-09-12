'use strict';
// A read adapter over legacy seconds/minutes stores. Views never convert history.
(function (root) {
  const key = 'sstm_v2_stopwatches';
  const isType = type => ['duration_sec', 'duration_min', 'duration_sec_count'].includes(type);
  const empty = () => ({ version: 1, views: [] });
  const defaults = type => ({ mode: ['duration_min', 'duration_sec_count'].includes(type) ? 'week' : 'interval', format: type === 'duration_min' ? 'minutes' : type === 'duration_sec_count' ? 'seconds' : 'clock' });
  function validate(journal) {
    const ids = new Set();
    if (!journal || journal.version !== 1 || !Array.isArray(journal.views)) throw Error('Обнови приложение для настроек секундомера.');
    for (const view of journal.views) {
      const id = `${view?.pin}:${view?.cellId}`;
      if (!view || ![0, 1, 2].includes(view.pin) || typeof view.cellId !== 'string' || !view.cellId || ids.has(id) ||
          !['interval', 'week'].includes(view.mode) || !['clock', 'hours', 'minutes', 'seconds'].includes(view.format)) throw Error('Настройки секундомера повреждены.');
      ids.add(id);
    }
    return journal;
  }
  const viewFor = (journal, pin, cellId, type) => journal.views.find(v => v.pin === pin && v.cellId === cellId) || defaults(type);
  const safe = n => Number.isFinite(Number(n)) && Number(n) >= 0 ? Number(n) : 0;
  const elapsed = (from, to) => Math.max(0, Math.floor((to - from) / 1000));
  function total({ state = {}, stored = 0, type, now = Date.now() }) {
    const accumulated = Number.isFinite(state.accumulated) ? safe(state.accumulated) : safe(stored) * (type === 'duration_min' ? 60 : 1);
    return accumulated + (state.isRunning && state.startTime ? elapsed(state.startTime, now) : 0);
  }
  function origin(state) {
    return Number.isFinite(state.sessionStartedAt) && state.sessionStartedAt > 0 && state.sessionStartedAt <= state.startTime ? state.sessionStartedAt : state.startTime;
  }
  function interval({ state = {}, sessions = [], habit, now = Date.now() }) {
    if (state.isRunning && state.startTime) return elapsed(origin(state), now);
    if (Number.isFinite(state.lastSession)) return safe(state.lastSession);
    // Old minute/second-total variants did not save lastSession. Use a retained
    // real session, never the weekly aggregate as a fabricated last interval.
    const last = sessions.filter(s => s.habit === habit && s.endTime <= now).sort((a, b) => b.endTime - a.endTime)[0];
    return last ? elapsed(last.startTime, last.endTime) : null;
  }
  function format(seconds, kind, language = 'en') {
    if (seconds === null) return { main: '—', suffix: '' };
    const n = safe(seconds);
    if (kind === 'clock') {
      const whole = Math.floor(n), pad = n => String(n).padStart(2, '0');
      return { main: `${pad(Math.floor(whole / 3600))}:${pad(Math.floor(whole / 60) % 60)}:${pad(whole % 60)}`, suffix: '' };
    }
    const divisor = kind === 'hours' ? 3600 : kind === 'minutes' ? 60 : 1;
    return { main: new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { useGrouping: false, maximumFractionDigits: kind === 'hours' ? 3 : kind === 'minutes' ? 2 : 0 }).format(n / divisor),
      suffix: (language === 'ru' ? { hours: 'ч', minutes: 'мин', seconds: 'с' } : { hours: 'h', minutes: 'min', seconds: 's' })[kind] };
  }
  const api = { key, isType, empty, defaults, validate, viewFor, total, origin, interval, format };
  if (typeof module !== 'undefined') module.exports = api;
  else {
    root.SstmStopwatch = api;
    let cachedRaw, cachedJournal;
    const read = () => {
      const raw = root.TRCKNG_STORAGE.getItem(key);
      if (raw !== cachedRaw || !cachedJournal) { cachedJournal = validate(raw ? JSON.parse(raw) : empty()); cachedRaw = raw; }
      return cachedJournal;
    };
    function set(pin, habit, type, view) {
      const journal = read(), views = journal.views.filter(v => v.pin !== pin || v.cellId !== habit);
      if (isType(type)) views.push({ pin, cellId: habit, mode: view.mode, format: view.format });
      const next = validate({ version: 1, views });
      if (!isType(type) && journal.views.length === views.length) return;
      root.TRCKNG_STORAGE.setItem(key, JSON.stringify(next));
      root.markCloudDirty('stopwatch view');
    }
    root.TRCKNG_STOPWATCH = {
      ...api, read, set,
      resolveType: (oldType, chosen) => isType(oldType) && isType(chosen) ? oldType : chosen,
      ensure(pin, habit, type) { if (isType(type) && !read().views.some(v => v.pin === pin && v.cellId === habit)) set(pin, habit, type, defaults(type)); },
      render(args) {
        if (!isType(args.type)) return null;
        const view = viewFor(read(), args.pin, args.habit, args.type), preview = args.previousWeekPreview;
        const seconds = preview ? safe(args.stored) * (args.type === 'duration_min' ? 60 : 1) : view.mode === 'week' ? total(args) : interval(args);
        const language = root.SstmI18n?.language || 'en';
        const fmt = format(seconds, view.format, language);
        const text = source => root.SstmI18n?.text(source) || source;
        const scope = preview ? text('ПРОШЛАЯ НЕДЕЛЯ') : view.mode === 'week' ? text('ЭТА НЕДЕЛЯ') : text(args.state?.isRunning ? 'ТЕКУЩИЙ ОТРЕЗОК' : seconds === null ? 'НЕТ ОТРЕЗКОВ' : 'ПОСЛЕДНИЙ ОТРЕЗОК');
        return { main: root.formatValueWithSuffix(fmt.main, fmt.suffix), breakdown: scope };
      }
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
