'use strict';
// A read adapter over legacy seconds/minutes stores. Views never convert history.
(function (root) {
  const key = 'sstm_v2_stopwatches';
  const isType = type => ['duration_sec', 'duration_min', 'duration_sec_count'].includes(type);
  const empty = () => ({ version: 1, views: [] });
  const presets = ['classic', 'minutes', 'seconds', 'clock', 'hours', 'last'];
  const defaults = type => ({ preset: type === 'duration_min' ? 'minutes' : type === 'duration_sec_count' ? 'seconds' : 'classic' });
  function validate(journal) {
    const ids = new Set();
    if (!journal || ![1, 2].includes(journal.version) || !Array.isArray(journal.views)) throw Error('Обнови приложение для настроек секундомера.');
    for (const view of journal.views) {
      const id = `${view?.pin}:${view?.cellId}`;
      const validDisplay = view?.preset !== undefined
        ? journal.version >= 2 && presets.includes(view.preset) && view.mode === undefined && view.format === undefined
        : ['interval', 'week'].includes(view?.mode) && ['clock', 'hours', 'minutes', 'seconds'].includes(view?.format);
      if (!view || ![0, 1, 2].includes(view.pin) || typeof view.cellId !== 'string' || !view.cellId || ids.has(id) || !validDisplay) throw Error('Настройки секундомера повреждены.');
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
  function last({ state = {}, sessions = [], habit, now = Date.now() }) {
    // A running 0.9 timer cleared lastSession to zero. Its real completed log,
    // excluding this run's weekly fragments, is the fallback for that old state.
    if (Number.isFinite(state.lastSession) && (state.lastSessionIsSaved || !state.isRunning && state.lastSession > 0)) return safe(state.lastSession);
    const before = state.isRunning && state.startTime ? origin(state) : now;
    const completed = sessions.filter(s => s.habit === habit && s.endTime <= before).sort((a, b) => b.endTime - a.endTime)[0];
    return completed ? elapsed(completed.startTime, completed.endTime) : null;
  }
  function autoClock(seconds) {
    if (seconds === null) return '—';
    const n = Math.floor(safe(seconds)), hours = Math.floor(n / 3600), minutes = Math.floor(n / 60) % 60;
    const tail = `${String(minutes).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
    return hours ? `${hours}:${tail}` : tail;
  }
  function presentation(args, view, language = 'en') {
    const ru = language === 'ru', state = args.state || {}, preview = args.previousWeekPreview;
    const week = preview ? safe(args.stored) * (args.type === 'duration_min' ? 60 : 1) : total(args);
    const active = !preview && state.isRunning && state.startTime;
    const current = preview ? null : interval(args), prior = preview ? null : last(args);
    const weekLabel = ru ? (preview ? 'ПРОШЛАЯ НЕДЕЛЯ' : 'ЭТА НЕДЕЛЯ') : (preview ? 'PREVIOUS WEEK' : 'THIS WEEK');
    const currentLabel = ru ? 'СЕЙЧАС' : 'CURRENT', lastLabel = ru ? 'ПОСЛЕДНИЙ' : 'LAST';
    const units = ru ? ['ч', 'м', 'с'] : ['h', 'm', 's'];
    const parts = n => `${Math.floor(n / 3600)}${units[0]} ${Math.floor(n / 60) % 60}${units[1]} ${Math.floor(n) % 60}${units[2]}`;
    let main, suffix = '', detail;
    if (!view.preset) {
      // Existing explicit 0.9 views are still readable; choosing a preset is
      // opt-in and never silently changes a saved decimal representation.
      const seconds = preview || view.mode === 'week' ? week : current;
      ({ main, suffix } = format(seconds, view.format, language));
      detail = preview || view.mode === 'week' ? weekLabel : `${weekLabel} · ${autoClock(week)}`;
    } else if (view.preset === 'minutes' || view.preset === 'seconds') {
      main = String(view.preset === 'minutes' ? Math.floor(week / 60) : Math.floor(week));
      if (view.preset === 'minutes') main = main.padStart(2, '0');
      suffix = view.preset === 'minutes' ? (ru ? 'мин' : 'min') : units[2];
      detail = `${weekLabel} · ${parts(week)}`;
    } else if (view.preset === 'classic') {
      main = autoClock(preview ? week : current);
      detail = `${weekLabel} · ${parts(week)}`;
    } else if (view.preset === 'last') {
      main = autoClock(prior);
      detail = `${lastLabel} · ${active ? `${currentLabel} ${autoClock(current)}` : ru ? 'ОСТАНОВЛЕН' : 'STOPPED'}`;
      if (preview) detail = ru ? 'НЕТ ДЕТАЛЕЙ ОТРЕЗКА' : 'NO INTERVAL DETAIL';
    } else {
      if (view.preset === 'hours') ({ main, suffix } = format(week, 'hours', language));
      else main = autoClock(week);
      detail = `${weekLabel} · ${active ? currentLabel : lastLabel} ${autoClock(active ? current : prior)}`;
      if (preview) detail = weekLabel;
    }
    return { main, suffix, breakdown: detail };
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
  const api = { key, isType, empty, presets, defaults, validate, viewFor, total, origin, interval, last, format, autoClock, presentation };
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
      if (isType(type)) views.push({ pin, cellId: habit, ...(view.preset ? { preset: view.preset } : { mode: view.mode, format: view.format }) });
      const next = validate({ version: Math.max(journal.version, view?.preset ? 2 : 1), views });
      if (!isType(type) && journal.views.length === views.length) return;
      root.TRCKNG_STORAGE.setItem(key, JSON.stringify(next));
      root.markCloudDirty('stopwatch view');
    }
    root.TRCKNG_STOPWATCH = {
      ...api, read, set,
      resolveType: (oldType, chosen) => isType(oldType) && isType(chosen) ? oldType : chosen,
      ensure(pin, habit, type) {
        if (!isType(type)) return;
        if (!read().views.some(v => v.pin === pin && v.cellId === habit)) set(pin, habit, type, defaults(type));
        if (read().version < 2) { root.TRCKNG_STORAGE.setItem(key, JSON.stringify({ ...read(), version: 2 })); root.markCloudDirty('stopwatch capture'); }
      },
      render(args) {
        if (!isType(args.type)) return null;
        const view = viewFor(read(), args.pin, args.habit, args.type);
        const display = presentation(args, view, root.SstmI18n?.language || 'en');
        return { main: root.formatValueWithSuffix(display.main, display.suffix), breakdown: display.breakdown };
      }
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
