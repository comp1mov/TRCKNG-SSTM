'use strict';

// Hand-written examples only. Never seed a demo from exports, localStorage or an account.
(function (root) {
  function weekKey(at) {
    const date = new Date(at), year = date.getFullYear();
    const firstMonday = y => { const d = new Date(y, 0, 1); d.setDate(d.getDate() + (8 - d.getDay()) % 7); return d; };
    const y = date < firstMonday(year) ? year - 1 : year;
    return `${y}W${String(1 + Math.floor((date - firstMonday(y)) / 604800000)).padStart(2, '0')}`;
  }
  function createStorage(now = Date.now()) {
    const values = new Map();
    const storage = { getItem: key => values.get(String(key)) ?? null,
      setItem: (key, value) => values.set(String(key), String(value)),
      removeItem: key => values.delete(String(key)), clear: () => values.clear(),
      key: index => [...values.keys()][index] ?? null, get length() { return values.size; } };
    const put = (key, value) => storage.setItem(key, JSON.stringify(value));
    const slots = Array.from({ length: 9 }, (_, i) => `cell${String(i + 1).padStart(2, '0')}`);
    const catalog = [
      [['СЧЁТЧИК', 'unit'], ['РАБОТА', 'duration_min'], ['ЗАМЕТКА ЧИСЛОМ', 'value'], ['ЧТЕНИЕ', 'duration_sec'], ['СОН', 'sleep'], ['ИНТЕРВАЛ', 'timer'], ['ДО СОБЫТИЯ', 'countdown'], ['ПУЛЬС', 'led_pulse'], ['СЧЁТЧИК × 2', 'math']],
      [['БЮДЖЕТ', 'money_budget'], ['ПОПОЛНЕНИЕ', 'money_income'], ['КУРС', 'currency'], ['СЕКУНДЫ', 'duration_sec_count'], ['ШАГ +5', 'unit'], ['ЗНАЧЕНИЕ', 'value'], ['МОЙ ЦИКЛ', 'points'], ['# СЛОВО', 'tag'], ['СОСТОЯНИЕ', 'state']],
      slots.map(() => ['', 'unit'])
    ];
    const palette = ['#d1f55a', '#65bdc6', '#c898ef', '#e9bb81', '#b5bbce', '#d1f55a', '#e9bb81', '#65bdc6', '#c898ef'];
    put('trckng_sstm_pin_names', { 0: 'ПРИМЕРЫ', 1: 'ПОКАЗАТЕЛИ', 2: 'ЧИСТЫЙ PIN' });
    put('trckng_sstm_pin_colors', { 0: '#d1f55a', 1: '#65bdc6', 2: '#c898ef' });
    put('trckng_sstm_currency_cache', { USD_EUR: { rate: 0.9, timestamp: now }, EUR_USD: { rate: 1 / 0.9, timestamp: now } });
    storage.setItem('trckng_has_seen_info', 'true'); storage.setItem('trckng_last_week_key', weekKey(now));
    for (let pin = 0; pin < 3; pin++) {
      const rows = catalog[pin];
      const fields = { labels: {}, types: {}, colors: {}, descriptions: {}, data: { [weekKey(now)]: {} },
        duration: {}, duration_sessions: [], counter_change_log: [], counter_last_update: {},
        unit_settings: {}, value_formats: {}, timer_settings: {}, timer_states: {}, money_settings: {},
        math_settings: {}, led_settings: {}, led_states: {}, currency_settings: {}, cell_flags: {}, cell_layout: {},
        theme_settings: { bg: '#11120f', text: '#e1e2cf', stroke: '#59604b' } };
      rows.forEach(([label, kind], i) => {
        const slot = slots[i]; fields.labels[slot] = label; fields.types[slot] = kind; fields.colors[slot] = palette[i];
        fields.descriptions[slot] = ''; fields.cell_flags[slot] = { showInHistory: true, showInTimeline: true, showLastUpdate: true, showTotal: true };
        fields.cell_layout[slot] = { row: Math.floor(i / 3) + 1, col: i % 3 + 1, colSpan: 1, rowSpan: 1, order: i, visible: true };
      });
      if (pin === 0) {
        for (let day = 13; day >= 0; day--) {
          const date = new Date(now); date.setDate(date.getDate() - day); date.setHours(9, 0, 0, 0);
          const at = +date, week = weekKey(at); fields.data[week] ||= {};
          if (at >= now) continue;
          const previous = fields.data[week].cell01 || 0, next = previous + 1 + day % 3;
          fields.data[week].cell01 = next;
          fields.counter_change_log.push({ id: `demo-count-${day}`, habit: 'cell01', label: 'СЧЁТЧИК', at, week, previousValue: previous, nextValue: next, source: 'unit' });
          fields.counter_last_update.cell01 = at;
          const durations = [['cell02', 42 + day % 4 * 13, 10], ['cell04', 18 + day % 3 * 7, 15], ['cell05', 420 + day % 4 * 15, 0]];
          for (const [slot, minutes, hour] of durations) {
            const start = new Date(at); start.setHours(hour); const end = +start + minutes * 60000;
            if (end > now) continue;
            const seconds = minutes * 60;
            fields.duration_sessions.push({ id: `demo-${slot}-${day}`, habit: slot, label: fields.labels[slot], color: fields.colors[slot], startTime: +start, endTime: end, week, source: fields.types[slot] });
            fields.data[week][slot] = (fields.data[week][slot] || 0) + (slot === 'cell04' ? seconds : minutes);
            if (week === weekKey(now)) fields.duration[slot] = { startTime: null, isRunning: false, accumulated: (fields.duration[slot]?.accumulated || 0) + seconds, lastSession: seconds };
          }
        }
        fields.data[weekKey(now)].cell03 = 6;
        fields.duration.cell02 ||= { accumulated: 0, lastSession: 0 };
        // This live example is always inside the current local day/week.
        const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
        Object.assign(fields.duration.cell02, { isRunning: true, startTime: Math.max(+midnight, now - 8 * 60000) });
        fields.value_formats.cell05 = 'sleep_last';
        fields.timer_settings.cell06 = { duration: 20, format: 'mm:ss', sound: 'soft_chime', volume: 0, vibrate: false };
        fields.timer_states.cell06 = { isRunning: false, remaining: 1200000, iterations: 0 };
        const future = new Date(now); future.setDate(future.getDate() + 3);
        const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
        fields.timer_settings.cell07 = { targetDate: date, targetTime: '18:00', sound: 'soft_chime', volume: 0, vibrate: false };
        fields.led_settings.cell08 = { bpm: 72 }; fields.led_states.cell08 = { isActive: false };
        fields.math_settings.cell09 = { a: 'cell01', op: 'mul', bMode: 'number', bNum: 2, formatFrom: 'raw', tapCycles: false };
      } else if (pin === 1) {
        fields.data[weekKey(now)] = { cell01: 120, cell02: 45, cell04: 90, cell05: 10, cell06: 3.5 };
        fields.money_settings.cell01 = { step: 5, currency: '¤', startAmount: 150 };
        fields.money_settings.cell02 = { step: 5, currency: '¤' };
        fields.currency_settings.cell03 = { from: 'USD', to: 'EUR', amount: 10 };
        fields.descriptions.cell03 = 'ДЕМО-КУРС';
        fields.duration.cell04 = { startTime: null, isRunning: false, accumulated: 90, lastSession: 90 };
        fields.unit_settings.cell05 = { step: 5, total: false }; fields.value_formats.cell06 = '2dp';
      }
      for (const [key, value] of Object.entries(fields)) put(`trckng_sstm_${key}_pin${pin}`, value);
    }
    const moments = { version: 2, active: null, cycles: [], stateOptions: [], moments: [
      { id: 'demo-word', kind: 'tag', at: now - 7200000, createdAt: now - 7200000, offsetMinutes: new Date(now).getTimezoneOffset(), source: { pin: 1, cellId: 'cell08', label: '# СЛОВО' }, tags: ['прогулка', 'идея'], state: null },
      { id: 'demo-state', kind: 'state', at: now - 3600000, createdAt: now - 3600000, offsetMinutes: new Date(now).getTimezoneOffset(), source: { pin: 1, cellId: 'cell09', label: 'СОСТОЯНИЕ' }, tags: [], state: { id: 'calm', label: 'Спокойно' } }
    ] };
    put('sstm_v2_cycles', moments);
    return storage;
  }
  const api = { createStorage, weekKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SstmDemo = api;
})(globalThis);
