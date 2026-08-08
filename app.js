'use strict';

    // ===== CONSTANTS =====
    const APP_VERSION = '1.33.0';
    const CLOUD_SNAPSHOT_SCHEMA_VERSION = 4;
    const CLOUD_SYNC_DEBOUNCE_MS = 8000;
    const CLOUD_PULL_COOLDOWN_MS = 15000;
    const SIGNUP_UNLOCK_MS = 3000;
    const SUPABASE_DEFAULT_TABLE = 'trckng_snapshots';

    const CELL_TYPES = {
      COUNTER: 'counter',   // legacy
      UNIT: 'unit',
      VALUE: 'value',
      MATH: 'math',
      DURATION_SEC: 'duration_sec',
      DURATION_MIN: 'duration_min',
      DURATION_SEC_COUNT: 'duration_sec_count',
      TIMER: 'timer',
      COUNTDOWN: 'countdown',
      MONEY_INCOME: 'money_income',
      MONEY_BUDGET: 'money_budget',
      LED_PULSE: 'led_pulse',
      CURRENCY: 'currency'
    };

    const STORAGE_KEYS = {
      DATA: 'trckng_sstm_data',
      LABELS: 'trckng_sstm_labels',
      TYPES: 'trckng_sstm_types',
      COLORS: 'trckng_sstm_colors',
      DESCRIPTIONS: 'trckng_sstm_descriptions',
      DURATION: 'trckng_sstm_duration',
      TIMER_SETTINGS: 'trckng_sstm_timer_settings',
      TIMER_STATES: 'trckng_sstm_timer_states',
      COUNTER_LAST_UPDATE: 'trckng_sstm_counter_last_update',
      COUNTER_CHANGE_LOG: 'trckng_sstm_counter_change_log',
      MONEY_SETTINGS: 'trckng_sstm_money_settings',
      PIN_NAMES: 'trckng_sstm_pin_names',
      PIN_COLORS: 'trckng_sstm_pin_colors',
      SEEN_INFO: 'trckng_has_seen_info',
      UNIT_SETTINGS: 'trckng_sstm_unit_settings',
      VALUE_FORMATS: 'trckng_sstm_value_formats',
      MATH_SETTINGS: 'trckng_sstm_math_settings',
      THEME: 'trckng_sstm_theme_settings',
      LED_SETTINGS: 'trckng_sstm_led_settings',
      LED_STATES: 'trckng_sstm_led_states',
      CURRENCY_SETTINGS: 'trckng_sstm_currency_settings',
      CURRENCY_CACHE: 'trckng_sstm_currency_cache',
      CELL_FLAGS: 'trckng_sstm_cell_flags',
      CELL_LAYOUT: 'trckng_sstm_cell_layout',
      VIEW_MODE: 'trckng_sstm_view_mode',
      SUPABASE_URL: 'trckng_sstm_supabase_url',
      SUPABASE_ANON_KEY: 'trckng_sstm_supabase_anon_key',
      SUPABASE_DEVICE_ID: 'trckng_sstm_supabase_device_id',
      CLOUD_DIRTY: 'trckng_sstm_cloud_dirty',
      CLOUD_DIRTY_AT: 'trckng_sstm_cloud_dirty_at',
      CLOUD_LAST_SYNC_AT: 'trckng_sstm_cloud_last_sync_at',
      SIGNUP_UNLOCKED: 'trckng_sstm_signup_unlocked'
    };

    const VIEW_MODES = {
      TRACK: 'track',
      LAYOUT: 'layout',
      HISTORY: 'history'
    };

    const DEFAULT_CELL_FLAGS = {
      showInHistory: true,
      showTotal: true,
      showLastUpdate: true,
      pinned: false,
      archived: false,
      goalEnabled: false,
      detailOnLongPress: false
    };

    const WEEKS_TO_KEEP = 52;
    const COUNTER_CHANGE_LOG_LIMIT = 1000;
    const PIN_COUNT = 3;
    const GRID_COLUMNS = 3;
    const LAYOUT_SIZE_PRESETS = {
      '1x1': { colSpan: 1, rowSpan: 1 },
      '2x1': { colSpan: 2, rowSpan: 1 },
      '1x2': { colSpan: 1, rowSpan: 2 },
      '2x2': { colSpan: 2, rowSpan: 2 }
    };
    const HABITS = ['cell01', 'cell02', 'cell03', 'cell04', 'cell05', 'cell06', 'cell07', 'cell08', 'cell09'];
    const PER_PIN_SYNC_FIELDS = [
      { key: STORAGE_KEYS.DATA, prop: 'weekData' },
      { key: STORAGE_KEYS.LABELS, prop: 'habitLabels' },
      { key: STORAGE_KEYS.TYPES, prop: 'habitTypes' },
      { key: STORAGE_KEYS.COLORS, prop: 'habitColors' },
      { key: STORAGE_KEYS.DESCRIPTIONS, prop: 'habitDescriptions' },
      { key: STORAGE_KEYS.DURATION, prop: 'durationStates' },
      { key: STORAGE_KEYS.TIMER_SETTINGS, prop: 'timerSettings' },
      { key: STORAGE_KEYS.TIMER_STATES, prop: 'timerStates' },
      { key: STORAGE_KEYS.COUNTER_LAST_UPDATE, prop: 'counterLastUpdate' },
      { key: STORAGE_KEYS.COUNTER_CHANGE_LOG, prop: 'counterChangeLog' },
      { key: STORAGE_KEYS.MONEY_SETTINGS, prop: 'moneySettings' },
      { key: STORAGE_KEYS.UNIT_SETTINGS, prop: 'unitSettings' },
      { key: STORAGE_KEYS.VALUE_FORMATS, prop: 'valueFormats' },
      { key: STORAGE_KEYS.MATH_SETTINGS, prop: 'mathSettings' },
      { key: STORAGE_KEYS.CELL_FLAGS, prop: 'cellFlags' },
      { key: STORAGE_KEYS.CELL_LAYOUT, prop: 'cellLayout' },
      { key: STORAGE_KEYS.THEME, prop: 'themeSettings' },
      { key: STORAGE_KEYS.LED_SETTINGS, prop: 'ledSettings' },
      { key: STORAGE_KEYS.LED_STATES, prop: 'ledStates' },
      { key: STORAGE_KEYS.CURRENCY_SETTINGS, prop: 'currencySettings' }
    ];

    // Default configuration
    const DEFAULT_LABELS = {
      0: { cell01: 'Coffee', cell02: 'Smoke', cell03: 'Snacks', cell04: 'Road', cell05: 'Work', cell06: '', cell07: 'Sport', cell08: 'Outside', cell09: '' },
      1: { cell01: '', cell02: '', cell03: '', cell04: 'Focus', cell05: '', cell06: '', cell07: '', cell08: '', cell09: '' },
      2: { cell01: '', cell02: '', cell03: '', cell04: '', cell05: '', cell06: '', cell07: '', cell08: '', cell09: '' }
    };

    const DEFAULT_TYPES = {
      0: { cell01: 'counter', cell02: 'counter', cell03: 'counter', cell04: 'duration_sec', cell05: 'duration_min', cell06: 'counter', cell07: 'counter', cell08: 'duration_min', cell09: 'counter' },
      1: { cell01: 'counter', cell02: 'counter', cell03: 'counter', cell04: 'duration_sec', cell05: 'counter', cell06: 'counter', cell07: 'counter', cell08: 'counter', cell09: 'counter' },
      2: { cell01: 'counter', cell02: 'counter', cell03: 'counter', cell04: 'counter', cell05: 'counter', cell06: 'counter', cell07: 'counter', cell08: 'counter', cell09: 'counter' }
    };

    const DEFAULT_COLORS = {
      0: { cell01: '#c4a574', cell02: '#8b8b8b', cell03: '#ffab40', cell04: '#35f2a3', cell05: '#ff6b6b', cell06: '#ffffff', cell07: '#4da6ff', cell08: '#6bcb77', cell09: '#ffffff' },
      1: { cell01: '#ffffff', cell02: '#ffffff', cell03: '#ffffff', cell04: '#ff8c42', cell05: '#ffffff', cell06: '#ffffff', cell07: '#ffffff', cell08: '#ffffff', cell09: '#ffffff' },
      2: { cell01: '#ffffff', cell02: '#ffffff', cell03: '#ffffff', cell04: '#ffffff', cell05: '#ffffff', cell06: '#ffffff', cell07: '#ffffff', cell08: '#ffffff', cell09: '#ffffff' }
    };

    const DEFAULT_PIN_COLORS = ['#ff8c42', '#35f2a3', '#4da6ff'];

    // ===== STATE =====
    let currentPin = 0;
    let currentWeekKey = getWeekKey();
    let decreaseMode = false;
    let currentView = VIEW_MODES.TRACK;

    let weekData = {};
    let habitLabels = {};
    let habitTypes = {};
    let habitColors = {};
    let habitDescriptions = {};
    let durationStates = {};
    let timerSettings = {}; // Timer/Countdown configurations
    let unitSettings = {};
    let valueFormats = {};
    let mathSettings = {};
    let themeSettings = {};
    let cellFlags = {};
    let cellLayout = {};
    let cells = [];
    let pins = [];

    let timerStates = {}; // Runtime state (iterations, running status)
    let moneySettings = {}; // Money configs per habit
    let pinNames = {}; // Custom pin names
    let pinColors = {}; // Custom fill colors for PIN buttons
    let counterLastUpdate = {}; // Last update timestamps for simple counters
    let counterChangeLog = []; // Reversible value changes for counters and numeric cells
    let ledSettings = {}; // LED pulse configurations
    let ledStates = {}; // LED runtime states (active/inactive)
    let ledIntervals = {}; // Active LED pulse intervals
    let currencySettings = {}; // Currency pair configurations
    let currencyCache = {}; // Cached exchange rates
    let globalInterval = null;
    let clockInterval = null;
    let editingHabit = null;
    let audioContext = null;
    let supabaseClient = null;
    let supabaseConfigSignature = '';
    let supabaseAuthSubscription = null;
    let accountSession = null;
    let cloudSnapshotMeta = null;
    let cloudBusy = false;
    let accountStatusOverride = null;
    let cloudDirty = false;
    let cloudDirtyAt = 0;
    let cloudSyncTimer = null;
    let cloudPullCheckInFlight = false;
    let lastCloudPullCheckAt = 0;
    let suppressCloudDirty = 0;
    let cloudConflictPending = false;
    let signupUnlocked = false;
    let signupUnlockTimer = null;

    // ===== COLOR PALETTE =====
    function generateColorPalette() {
      const hour = new Date().getHours();
      const isNight = hour >= 20 || hour < 8;
      
      if (isNight) {
        return ['#9966ff', '#6699ff', '#66ccff', '#66ffcc', '#66ffff', '#ff8c42'];
      } else {
        return ['#ffcc44', '#ff9955', '#ff6677', '#ff44aa', '#cc55ff', '#ff8c42'];
      }
    }

    let colorPalette = generateColorPalette();
    let paletteIndex = 0;

    setInterval(() => {
      colorPalette = generateColorPalette();
    }, 3600000);

    function getAnimationColor(habit) {
      const customColor = habitColors[habit];
      const typeRaw = habitTypes[habit] || CELL_TYPES.UNIT;
      const type = (typeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : typeRaw;
      
      if (decreaseMode) return '#ff4f6a';
      
      if (customColor && customColor !== '#ffffff') return customColor;
      
      if (type === CELL_TYPES.DURATION_SEC) return '#35f2a3';
      if (type === CELL_TYPES.DURATION_MIN) return '#ff8c42';
      if (type === CELL_TYPES.DURATION_SEC_COUNT) return '#6b9dff';
      
      const color = colorPalette[paletteIndex % colorPalette.length];
      paletteIndex++;
      return color;
    }

    // ===== NOTIFICATION SOUNDS =====
    function getAudioContext() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      // Try to resume if context is suspended (some browsers pause it in background)
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
      return audioContext;
    }

    function playNotificationSound(soundType, volume) {
      const ctx = getAudioContext();
      const vol = volume / 100;

      switch(soundType) {
        case 'soft_chime':
          playSoftChime(ctx, vol);
          break;
        case 'digital_pulse':
          playDigitalPulse(ctx, vol);
          break;
        case 'organic_bell':
          playOrganicBell(ctx, vol);
          break;
        case 'minimal_beep':
          playMinimalBeep(ctx, vol);
          break;
        case 'ascending_trill':
          playAscendingTrill(ctx, vol);
          break;
      }
    }

    function playSoftChime(ctx, volume) {
      const notes = [523.25, 659.25, 783.99];
      const now = ctx.currentTime;
      for (let repeat = 0; repeat < 3; repeat++) {
        const repeatOffset = repeat * 1.1;
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const startTime = now + repeatOffset + (i * 0.15);
          gain.gain.setValueAtTime(volume * 0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.5);
        });
      }
    }

    function playDigitalPulse(ctx, volume) {
      const now = ctx.currentTime;
      for (let repeat = 0; repeat < 3; repeat++) {
        const repeatOffset = repeat * 1.0;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.value = 800;
        gain1.gain.setValueAtTime(volume * 0.4, now + repeatOffset);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + repeatOffset + 0.1);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now + repeatOffset);
        osc1.stop(now + repeatOffset + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = 1000;
        gain2.gain.setValueAtTime(volume * 0.4, now + repeatOffset + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + repeatOffset + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + repeatOffset + 0.12);
        osc2.stop(now + repeatOffset + 0.3);
      }
    }

    function playOrganicBell(ctx, volume) {
      const now = ctx.currentTime;
      const fundamental = 523.25;
      const harmonics = [1, 2, 3, 4.2, 5.4];
      for (let repeat = 0; repeat < 3; repeat++) {
        const repeatOffset = repeat * 1.4;
        harmonics.forEach((ratio, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = fundamental * ratio;
          const harmVolume = volume * (0.3 / (i + 1));
          gain.gain.setValueAtTime(harmVolume, now + repeatOffset);
          gain.gain.exponentialRampToValueAtTime(0.01, now + repeatOffset + 0.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + repeatOffset);
          osc.stop(now + repeatOffset + 1);
        });
      }
    }

    function playMinimalBeep(ctx, volume) {
      const now = ctx.currentTime;
      for (let repeat = 0; repeat < 3; repeat++) {
        const repeatOffset = repeat * 0.65;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(volume * 0.4, now + repeatOffset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + repeatOffset + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + repeatOffset);
        osc.stop(now + repeatOffset + 0.15);
      }
    }

    function playAscendingTrill(ctx, volume) {
      const notes = [500, 630, 800, 1000, 1200];
      const now = ctx.currentTime;
      for (let repeat = 0; repeat < 3; repeat++) {
        const repeatOffset = repeat * 1.0;
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const startTime = now + repeatOffset + (i * 0.08);
          gain.gain.setValueAtTime(volume * 0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.15);
        });
      }
    }

    // ===== WEEK CALCULATION =====
    function firstMondayOfYear(year) {
      const jan1 = new Date(year, 0, 1);
      const dayOfWeek = jan1.getDay();
      const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
      return new Date(year, 0, 1 + daysUntilMonday);
    }

    function getWeekKey(date = new Date()) {
      const y = date.getFullYear();
      const firstMonday = firstMondayOfYear(y);
      let weekYear = y, weekNum = 1;

      if (date < firstMonday) {
        weekYear = y - 1;
        const firstMondayPrev = firstMondayOfYear(y - 1);
        weekNum = 1 + Math.floor((date - firstMondayPrev) / (7 * 24 * 60 * 60 * 1000));
      } else {
        weekNum = 1 + Math.floor((date - firstMonday) / (7 * 24 * 60 * 60 * 1000));
      }
      return `${weekYear}W${String(weekNum).padStart(2, '0')}`;
    }

    function getWeekDateRange(weekKey) {
      const [yearStr, weekStr] = weekKey.split('W');
      const year = parseInt(yearStr);
      const week = parseInt(weekStr);
      const fm = firstMondayOfYear(year);
      const startDate = new Date(fm);
      startDate.setDate(fm.getDate() + (week - 1) * 7);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      return { start: startDate, end: endDate };
    }

    function formatDateRange(start, end) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`;
    }

    // ===== STORAGE =====
    function loadWeekData() {
      const key = `${STORAGE_KEYS.DATA}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      weekData = stored ? JSON.parse(stored) : {};
      
      Object.keys(weekData).forEach(week => {
        if (typeof weekData[week] !== 'object' || weekData[week] === null) {
          delete weekData[week];
        }
      });
    }

    function saveWeekData() {
      const key = `${STORAGE_KEYS.DATA}_pin${currentPin}`;
      const keys = Object.keys(weekData).sort().reverse();
      if (keys.length > WEEKS_TO_KEEP) {
        keys.slice(WEEKS_TO_KEEP).forEach(k => delete weekData[k]);
      }
      localStorage.setItem(key, JSON.stringify(weekData));
      markCloudDirty('week data');
    }

    function loadLabels() {
      habitLabels = { ...DEFAULT_LABELS[currentPin] };
      const key = `${STORAGE_KEYS.LABELS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { Object.assign(habitLabels, JSON.parse(stored)); } catch(e) {}
      }
    }

    function saveLabels() {
      const key = `${STORAGE_KEYS.LABELS}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(habitLabels));
      markCloudDirty('labels');
    }

    function loadTypes() {
      habitTypes = { ...DEFAULT_TYPES[currentPin] };
      const key = `${STORAGE_KEYS.TYPES}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { Object.assign(habitTypes, JSON.parse(stored)); } catch(e) {}
      }
    }

    function saveTypes() {
      const key = `${STORAGE_KEYS.TYPES}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(habitTypes));
      markCloudDirty('types');
    }

    function loadColors() {
      habitColors = { ...DEFAULT_COLORS[currentPin] };
      const key = `${STORAGE_KEYS.COLORS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { Object.assign(habitColors, JSON.parse(stored)); } catch(e) {}
      }
    }

    function saveColors() {
      const key = `${STORAGE_KEYS.COLORS}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(habitColors));
      markCloudDirty('colors');
    }

    function loadDescriptions() {
      habitDescriptions = {};
      const key = `${STORAGE_KEYS.DESCRIPTIONS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { Object.assign(habitDescriptions, JSON.parse(stored)); } catch(e) {}
      }
    }

    function saveDescriptions() {
      const key = `${STORAGE_KEYS.DESCRIPTIONS}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(habitDescriptions));
      markCloudDirty('descriptions');
    }

    function loadDurationStates() {
      durationStates = {};
      const key = `${STORAGE_KEYS.DURATION}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { durationStates = JSON.parse(stored); } catch(e) {}
      }
    }

    function saveDurationStates() {
      const key = `${STORAGE_KEYS.DURATION}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(durationStates));
      markCloudDirty('duration states');
    }

    function loadTimerSettings() {
      timerSettings = {};
      const key = `${STORAGE_KEYS.TIMER_SETTINGS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { timerSettings = JSON.parse(stored); } catch(e) {}
      }

      // Ensure default settings for all TIMER / COUNTDOWN cells
      HABITS.forEach(habit => {
        const type = habitTypes[habit];
        const normalizedType = (type === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : type;

        // Live update for Math (so it reacts to running timers/durations)
        if (normalizedType === CELL_TYPES.MATH) {
          const cfg = mathSettings[habit] || {};
          const val = computeMathValue(habit, new Set());
          const valueEl = document.getElementById(`value-${habit}`);
          const breakdownEl = document.getElementById(`breakdown-${habit}`);
          if (valueEl) valueEl.innerHTML = formatMathDisplayValue(val, cfg);
          if (breakdownEl) breakdownEl.textContent = buildMathBreakdown(habit);
        }

        // Value has a static number but keep formatting stable if something external updates it
        if (normalizedType === CELL_TYPES.VALUE) {
          const valueEl = document.getElementById(`value-${habit}`);
          if (valueEl) valueEl.textContent = getValueDisplay(habit);
        }

        if ((type === CELL_TYPES.TIMER || type === CELL_TYPES.COUNTDOWN) && !timerSettings[habit]) {
          if (type === CELL_TYPES.TIMER) {
            timerSettings[habit] = {
              duration: 20,
              format: 'mm:ss',
              sound: 'soft_chime',
              volume: 50,
              vibrate: true,
              message: ''
            };
          } else if (type === CELL_TYPES.COUNTDOWN) {
            timerSettings[habit] = {
              targetDate: '',
              targetTime: '12:00',
              sound: 'soft_chime',
              volume: 50,
              vibrate: true,
              message: ''
            };
          }
        }
      });
    }

    function saveTimerSettings() {
      const key = `${STORAGE_KEYS.TIMER_SETTINGS}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(timerSettings));
      markCloudDirty('timer settings');
    }

    function loadTimerStates() {
      timerStates = {};
      const key = `${STORAGE_KEYS.TIMER_STATES}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { timerStates = JSON.parse(stored); } catch(e) {}
      }
    }

    function saveTimerStates() {
      const key = `${STORAGE_KEYS.TIMER_STATES}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(timerStates));
      markCloudDirty('timer states');
    }

    function loadMoneySettings() {
      moneySettings = {};
      const key = `${STORAGE_KEYS.MONEY_SETTINGS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { moneySettings = JSON.parse(stored); } catch(e) {}
      }
    }

    function saveMoneySettings() {
      const key = `${STORAGE_KEYS.MONEY_SETTINGS}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(moneySettings));
      markCloudDirty('money settings');
    }

    function loadUnitSettings() {
      const key = `${STORAGE_KEYS.UNIT_SETTINGS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      unitSettings = stored ? JSON.parse(stored) : {};
    }
    function saveUnitSettings() {
      const key = `${STORAGE_KEYS.UNIT_SETTINGS}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(unitSettings));
      markCloudDirty('unit settings');
    }

    function loadValueFormats() {
      const key = `${STORAGE_KEYS.VALUE_FORMATS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      valueFormats = stored ? JSON.parse(stored) : {};
    }
    function saveValueFormats() {
      const key = `${STORAGE_KEYS.VALUE_FORMATS}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(valueFormats));
      markCloudDirty('value formats');
    }

    function loadMathSettings() {
      const key = `${STORAGE_KEYS.MATH_SETTINGS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      mathSettings = stored ? JSON.parse(stored) : {};
    }
    function saveMathSettings() {
      const key = `${STORAGE_KEYS.MATH_SETTINGS}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(mathSettings));
      markCloudDirty('math settings');
    }

    function normalizeCellFlags(rawFlags) {
      const normalized = {};
      HABITS.forEach(habit => {
        const incoming = rawFlags && typeof rawFlags === 'object' ? rawFlags[habit] : null;
        normalized[habit] = {
          ...DEFAULT_CELL_FLAGS,
          ...(incoming && typeof incoming === 'object' ? incoming : {})
        };
      });
      return normalized;
    }

    function loadCellFlags() {
      const key = `${STORAGE_KEYS.CELL_FLAGS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (!stored) {
        cellFlags = normalizeCellFlags({});
        return;
      }

      try {
        cellFlags = normalizeCellFlags(JSON.parse(stored));
      } catch (e) {
        cellFlags = normalizeCellFlags({});
      }
    }

    function saveCellFlags() {
      const key = `${STORAGE_KEYS.CELL_FLAGS}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(normalizeCellFlags(cellFlags)));
      markCloudDirty('cell flags');
    }

    function getCellFlags(habit) {
      if (!cellFlags[habit]) {
        cellFlags[habit] = { ...DEFAULT_CELL_FLAGS };
      }
      return cellFlags[habit];
    }

    function getCellFlag(habit, flagName) {
      const flags = getCellFlags(habit);
      if (!(flagName in flags)) return DEFAULT_CELL_FLAGS[flagName];
      return flags[flagName];
    }

    function normalizeInt(value, fallback, min, max = Number.MAX_SAFE_INTEGER) {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(Math.max(parsed, min), max);
    }

    function getDefaultCellLayout(index) {
      return {
        row: Math.floor(index / GRID_COLUMNS) + 1,
        col: (index % GRID_COLUMNS) + 1,
        rowSpan: 1,
        colSpan: 1,
        order: index,
        visible: true
      };
    }

    function getLayoutSizePreset(sizeId) {
      return LAYOUT_SIZE_PRESETS[sizeId] || LAYOUT_SIZE_PRESETS['1x1'];
    }

    function getLayoutSizeId(layout) {
      const colSpan = normalizeInt(layout?.colSpan, 1, 1, GRID_COLUMNS);
      const rowSpan = normalizeInt(layout?.rowSpan, 1, 1, 4);
      const sizeId = `${colSpan}x${rowSpan}`;
      return LAYOUT_SIZE_PRESETS[sizeId] ? sizeId : '1x1';
    }

    function normalizeCellLayout(rawLayout) {
      const normalized = {};
      const source = rawLayout && typeof rawLayout === 'object' ? rawLayout : {};

      HABITS.forEach((habit, index) => {
        const fallback = getDefaultCellLayout(index);
        const incoming = source[habit] && typeof source[habit] === 'object' ? source[habit] : {};
        const rowSpan = normalizeInt(incoming.rowSpan, fallback.rowSpan, 1, 4);
        const colSpan = normalizeInt(incoming.colSpan, fallback.colSpan, 1, GRID_COLUMNS);
        const maxCol = Math.max(1, GRID_COLUMNS - colSpan + 1);

        normalized[habit] = {
          row: normalizeInt(incoming.row, fallback.row, 1),
          col: normalizeInt(incoming.col, fallback.col, 1, maxCol),
          rowSpan,
          colSpan,
          order: normalizeInt(incoming.order, fallback.order, 0),
          visible: incoming.visible !== false
        };
      });

      return normalized;
    }

    function canPlaceCellAt(occupied, row, col, rowSpan, colSpan) {
      if (col < 1 || col + colSpan - 1 > GRID_COLUMNS) return false;

      for (let r = row; r < row + rowSpan; r++) {
        for (let c = col; c < col + colSpan; c++) {
          if (occupied.has(`${r}:${c}`)) return false;
        }
      }

      return true;
    }

    function occupyLayoutCells(occupied, row, col, rowSpan, colSpan) {
      for (let r = row; r < row + rowSpan; r++) {
        for (let c = col; c < col + colSpan; c++) {
          occupied.add(`${r}:${c}`);
        }
      }
    }

    function findAvailableLayoutSlot(occupied, rowSpan, colSpan) {
      let row = 1;
      while (row < 200) {
        for (let col = 1; col <= GRID_COLUMNS - colSpan + 1; col++) {
          if (canPlaceCellAt(occupied, row, col, rowSpan, colSpan)) {
            return { row, col };
          }
        }
        row++;
      }

      return { row, col: 1 };
    }

    function packCellLayoutByOrder(rawLayout) {
      const normalized = normalizeCellLayout(rawLayout);
      const occupied = new Set();
      const packed = {};

      HABITS
        .map((habit, index) => ({ habit, index, layout: normalized[habit] }))
        .sort((a, b) => (a.layout.order - b.layout.order) || (a.index - b.index))
        .forEach((entry, order) => {
          const layout = entry.layout;
          if (layout.visible === false) {
            packed[entry.habit] = { ...layout, order };
            return;
          }

          const slot = findAvailableLayoutSlot(occupied, layout.rowSpan, layout.colSpan);
          packed[entry.habit] = {
            ...layout,
            row: slot.row,
            col: slot.col,
            order
          };
          occupyLayoutCells(occupied, slot.row, slot.col, layout.rowSpan, layout.colSpan);
        });

      return normalizeCellLayout(packed);
    }

    function loadCellLayout() {
      const key = `${STORAGE_KEYS.CELL_LAYOUT}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (!stored) {
        cellLayout = normalizeCellLayout({});
        saveCellLayout();
        return;
      }

      try {
        cellLayout = normalizeCellLayout(JSON.parse(stored));
      } catch (e) {
        cellLayout = normalizeCellLayout({});
        saveCellLayout();
      }
    }

    function saveCellLayout() {
      const key = `${STORAGE_KEYS.CELL_LAYOUT}_pin${currentPin}`;
      cellLayout = normalizeCellLayout(cellLayout);
      localStorage.setItem(key, JSON.stringify(cellLayout));
      markCloudDirty('cell layout');
    }

    function setCellLayoutSize(habit, sizeId) {
      const preset = getLayoutSizePreset(sizeId);
      const current = getCellLayout(habit);
      cellLayout[habit] = {
        ...current,
        colSpan: preset.colSpan,
        rowSpan: preset.rowSpan
      };
      cellLayout = packCellLayoutByOrder(cellLayout);
      saveCellLayout();
    }

    function getOrderedLayoutCells() {
      return syncCellsFromLegacyState()
        .filter(cell => cell.layout.visible !== false)
        .sort(compareCellsByLayout);
    }

    function moveCellInLayout(habit, direction) {
      const ordered = getOrderedLayoutCells();
      const index = ordered.findIndex(cell => cell.id === habit);
      if (index < 0) return;

      const targetIndex = Math.max(0, Math.min(ordered.length - 1, index + direction));
      if (targetIndex === index) return;

      const ids = ordered.map(cell => cell.id);
      const [movedId] = ids.splice(index, 1);
      ids.splice(targetIndex, 0, movedId);

      ids.forEach((id, order) => {
        cellLayout[id] = {
          ...getCellLayout(id),
          order
        };
      });

      cellLayout = packCellLayoutByOrder(cellLayout);
      saveCellLayout();
      renderHabits();
      renderLayoutEditor();
    }

    function packCurrentLayout() {
      cellLayout = packCellLayoutByOrder(cellLayout);
      saveCellLayout();
      renderHabits();
      renderLayoutEditor();
    }

    function getCellLayout(habit) {
      if (!cellLayout[habit]) {
        const index = HABITS.indexOf(habit);
        cellLayout[habit] = getDefaultCellLayout(index >= 0 ? index : 0);
      }
      return cellLayout[habit];
    }

    function getCellSettingsSnapshot(habit) {
      return {
        unit: unitSettings[habit] || null,
        valueFormat: valueFormats[habit] || 'raw',
        math: mathSettings[habit] || null,
        duration: durationStates[habit] || null,
        timer: timerSettings[habit] || null,
        timerState: timerStates[habit] || null,
        money: moneySettings[habit] || null,
        led: ledSettings[habit] || null,
        ledState: ledStates[habit] || null,
        currency: currencySettings[habit] || null,
        counterLastUpdate: counterLastUpdate[habit] || null
      };
    }

    function buildCellDefinition(habit, index) {
      const typeRaw = habitTypes[habit] || CELL_TYPES.UNIT;
      const type = (typeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : typeRaw;

      return {
        id: habit,
        pin: currentPin,
        slot: index + 1,
        label: habitLabels[habit] || '',
        type,
        color: habitColors[habit] || '#ffffff',
        description: habitDescriptions[habit] || '',
        flags: { ...getCellFlags(habit) },
        layout: { ...getCellLayout(habit) },
        settings: getCellSettingsSnapshot(habit)
      };
    }

    function compareCellsByLayout(a, b) {
      const aLayout = a.layout || getDefaultCellLayout(a.slot - 1);
      const bLayout = b.layout || getDefaultCellLayout(b.slot - 1);
      return (aLayout.order - bLayout.order) ||
             (aLayout.row - bLayout.row) ||
             (aLayout.col - bLayout.col) ||
             (a.slot - b.slot);
    }

    function syncCellsFromLegacyState() {
      cells = HABITS.map((habit, index) => buildCellDefinition(habit, index));
      return cells;
    }

    function getRenderableCells() {
      return getOrderedLayoutCells();
    }

    function getCellsSnapshot() {
      return syncCellsFromLegacyState().map(cell => ({
        ...cell,
        flags: { ...cell.flags },
        layout: { ...cell.layout },
        settings: { ...cell.settings }
      }));
    }

    function getLayoutColumnCount(renderCells) {
      return Math.max(
        GRID_COLUMNS,
        ...renderCells.map(cell => {
          const layout = cell.layout || getDefaultCellLayout(cell.slot - 1);
          return layout.col + layout.colSpan - 1;
        })
      );
    }

    function applyCellLayoutToElement(el, layout) {
      if (!el || !layout) return;
      el.style.gridColumn = `${layout.col} / span ${layout.colSpan}`;
      el.style.gridRow = `${layout.row} / span ${layout.rowSpan}`;
      el.dataset.colSpan = String(layout.colSpan);
      el.dataset.rowSpan = String(layout.rowSpan);
    }

    function applyCellsSnapshot(importedCells) {
      if (!Array.isArray(importedCells)) return;

      importedCells.forEach(cell => {
        if (!cell || typeof cell !== 'object' || !HABITS.includes(cell.id)) return;

        if ('label' in cell) habitLabels[cell.id] = String(cell.label || '');
        if ('type' in cell) {
          habitTypes[cell.id] = cell.type === CELL_TYPES.COUNTER ? CELL_TYPES.UNIT : String(cell.type || CELL_TYPES.UNIT);
        }
        if ('color' in cell) habitColors[cell.id] = String(cell.color || '#ffffff');
        if ('description' in cell) habitDescriptions[cell.id] = String(cell.description || '');
        if (cell.flags && typeof cell.flags === 'object') {
          cellFlags[cell.id] = { ...DEFAULT_CELL_FLAGS, ...cell.flags };
        }
        if (cell.layout && typeof cell.layout === 'object') {
          cellLayout[cell.id] = cell.layout;
        }
      });

      cellFlags = normalizeCellFlags(cellFlags);
      cellLayout = normalizeCellLayout(cellLayout);
      syncCellsFromLegacyState();
    }

    function syncPinsFromState() {
      pins = Array.from({ length: PIN_COUNT }, (_, index) => {
        const raw = (pinNames && pinNames[index] != null) ? String(pinNames[index]) : '';
        const name = raw.trim() || getDefaultPinName(index);
        return {
          id: `pin${index}`,
          index,
          name,
          fill: getPinFillColor(index),
          isActive: index === currentPin
        };
      });

      return pins;
    }

    function loadLedSettings() {
      const key = `${STORAGE_KEYS.LED_SETTINGS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      ledSettings = stored ? JSON.parse(stored) : {};
    }
    function saveLedSettings() {
      localStorage.setItem(`${STORAGE_KEYS.LED_SETTINGS}_pin${currentPin}`, JSON.stringify(ledSettings));
      markCloudDirty('led settings');
    }

    function loadLedStates() {
      const key = `${STORAGE_KEYS.LED_STATES}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      ledStates = stored ? JSON.parse(stored) : {};
    }
    function saveLedStates() {
      localStorage.setItem(`${STORAGE_KEYS.LED_STATES}_pin${currentPin}`, JSON.stringify(ledStates));
      markCloudDirty('led states');
    }

    function loadCurrencySettings() {
      const key = `${STORAGE_KEYS.CURRENCY_SETTINGS}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      currencySettings = stored ? JSON.parse(stored) : {};
    }
    function saveCurrencySettings() {
      localStorage.setItem(`${STORAGE_KEYS.CURRENCY_SETTINGS}_pin${currentPin}`, JSON.stringify(currencySettings));
      markCloudDirty('currency settings');
    }
    
    function loadCurrencyCache() {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENCY_CACHE);
      currencyCache = stored ? JSON.parse(stored) : {};
    }
    function saveCurrencyCache() {
      localStorage.setItem(STORAGE_KEYS.CURRENCY_CACHE, JSON.stringify(currencyCache));
      markCloudDirty('currency cache');
    }

    // Fetch exchange rate from free API
    async function fetchExchangeRate(from, to) {
      const pair = `${from}_${to}`.toUpperCase();
      const now = Date.now();
      
      // Check cache (valid for 1 hour)
      if (currencyCache[pair] && (now - currencyCache[pair].timestamp) < 3600000) {
        return currencyCache[pair].rate;
      }
      
      try {
        // Using exchangerate-api.com free tier (no key needed for basic)
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`);
        const data = await response.json();
        
        if (data.rates && data.rates[to.toUpperCase()]) {
          const rate = data.rates[to.toUpperCase()];
          currencyCache[pair] = { rate, timestamp: now };
          saveCurrencyCache();
          return rate;
        }
      } catch (e) {
        console.log('Currency fetch error:', e.message);
      }
      
      return currencyCache[pair]?.rate || null;
    }

    function defaultThemeSettings() {
      return {
        bg: '#000000',
        text: '#ffffff',
        stroke: '#ffffff'
      };
    }

    function loadThemeSettings() {
      const key = `${STORAGE_KEYS.THEME}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      themeSettings = stored ? JSON.parse(stored) : defaultThemeSettings();
    }
    function saveThemeSettings() {
      const key = `${STORAGE_KEYS.THEME}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(themeSettings));
      markCloudDirty('theme settings');
    }

    function loadViewMode() {
      const stored = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      currentView = Object.values(VIEW_MODES).includes(stored) ? stored : VIEW_MODES.TRACK;
    }

    function saveViewMode() {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, currentView);
    }

    function loadCloudSyncState() {
      cloudDirty = localStorage.getItem(STORAGE_KEYS.CLOUD_DIRTY) === 'true';
      cloudDirtyAt = Number(localStorage.getItem(STORAGE_KEYS.CLOUD_DIRTY_AT)) || 0;
    }

    function getCloudLastSyncMs() {
      const stored = localStorage.getItem(STORAGE_KEYS.CLOUD_LAST_SYNC_AT);
      if (!stored) return 0;
      const parsed = Date.parse(stored);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function setCloudLastSyncAt(value) {
      const iso = value || new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.CLOUD_LAST_SYNC_AT, iso);
    }

    function runWithoutCloudDirty(fn) {
      suppressCloudDirty += 1;
      try {
        return fn();
      } finally {
        suppressCloudDirty = Math.max(0, suppressCloudDirty - 1);
      }
    }

    function setCloudDirty(isDirty, reason = '') {
      cloudDirty = Boolean(isDirty);
      if (cloudDirty) {
        cloudDirtyAt = Date.now();
        localStorage.setItem(STORAGE_KEYS.CLOUD_DIRTY, 'true');
        localStorage.setItem(STORAGE_KEYS.CLOUD_DIRTY_AT, String(cloudDirtyAt));
        accountStatusOverride = null;
        scheduleCloudAutosync(reason);
      } else {
        cloudDirtyAt = 0;
        cloudConflictPending = false;
        localStorage.removeItem(STORAGE_KEYS.CLOUD_DIRTY);
        localStorage.removeItem(STORAGE_KEYS.CLOUD_DIRTY_AT);
        if (cloudSyncTimer) {
          clearTimeout(cloudSyncTimer);
          cloudSyncTimer = null;
        }
      }
      renderAccountPanel();
    }

    function markCloudDirty(reason = 'local change') {
      if (suppressCloudDirty > 0) return;
      setCloudDirty(true, reason);
    }

    function scheduleCloudAutosync(reason = '') {
      if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
      if (!cloudDirty || !accountSession || !accountSession.user || cloudBusy) {
        renderAccountPanel();
        return;
      }
      if (cloudConflictPending) {
        setAccountStatus('CONFLICT - LOAD OR UPLOAD', 'warn');
        return;
      }
      if (!navigator.onLine) {
        setAccountStatus('OFFLINE - SYNC WAITING', 'warn');
        return;
      }

      cloudSyncTimer = setTimeout(() => {
        cloudSyncTimer = null;
        uploadCloudSnapshot({ automatic: true, reason });
      }, CLOUD_SYNC_DEBOUNCE_MS);
      renderAccountPanel();
    }

    function getCloudSyncLabel() {
      if (!hasSupabaseConfig()) return 'OFF';
      if (!accountSession || !accountSession.user) return cloudDirty ? 'UNSAVED LOCAL' : 'SIGN IN';
      if (cloudBusy) return 'SYNCING';
      if (cloudConflictPending) return 'CONFLICT';
      if (cloudDirty && cloudSyncTimer) return 'QUEUED';
      if (cloudDirty) return 'UNSAVED';
      if (cloudSnapshotMeta) return 'SYNCED';
      return 'READY';
    }

    function compareCloudToLocal(row) {
      if (!row || !row.updated_at) return 'none';
      const cloudMs = Date.parse(row.updated_at);
      if (!Number.isFinite(cloudMs)) return 'unknown';
      const localSyncMs = getCloudLastSyncMs();
      if (!localSyncMs) return 'unknown';
      return cloudMs > localSyncMs + 1000 ? 'newer' : 'current';
    }

    function applyIncomingCloudRow(row, message = 'CLOUD UPDATE LOADED') {
      if (!row || !row.app_state) return false;

      const applied = row.app_state.snapshotType === 'fullApp'
        ? applyCloudSnapshot(row.app_state, { fromCloudSync: true })
        : applyCurrentPinSnapshot(row.app_state, { fromCloudSync: true });
      if (!applied) return false;

      cloudSnapshotMeta = {
        updatedAt: row.updated_at,
        deviceId: row.device_id,
        version: row.app_state && row.app_state.version
      };
      setCloudLastSyncAt(row.updated_at);
      setCloudDirty(false);
      setAccountStatus(message, 'ok');
      return true;
    }

    async function checkCloudForUpdates(options = {}) {
      const silent = options.silent !== false;
      const force = options.force === true;
      const now = Date.now();
      if (cloudPullCheckInFlight) return 'busy';
      if (!force && silent && now - lastCloudPullCheckAt < CLOUD_PULL_COOLDOWN_MS) return 'throttled';
      if (!ensureSupabaseClient() || !accountSession || !accountSession.user) return 'unavailable';
      if (!navigator.onLine) {
        if (!silent) setAccountStatus('OFFLINE - CANNOT CHECK CLOUD', 'warn');
        return 'offline';
      }

      cloudPullCheckInFlight = true;
      lastCloudPullCheckAt = now;

      try {
        const config = getSupabaseConfig();
        const { data, error } = await supabaseClient
          .from(config.table)
          .select('app_state, updated_at, device_id')
          .eq('user_id', accountSession.user.id)
          .maybeSingle();
        if (error) throw error;

        cloudSnapshotMeta = data ? {
          updatedAt: data.updated_at,
          deviceId: data.device_id,
          version: data.app_state && data.app_state.version
        } : null;

        const relation = compareCloudToLocal(data);
        let result = data ? 'current' : 'empty';
        if (data && relation === 'newer') {
          if (cloudDirty) {
            cloudConflictPending = true;
            setAccountStatus('CLOUD NEWER - LOCAL UNSAVED', 'warn');
            result = 'conflict';
          } else {
            cloudConflictPending = false;
            result = applyIncomingCloudRow(data) ? 'applied' : 'unsupported';
          }
        } else if (data && relation === 'unknown') {
          const canBootstrapFromCloud = !cloudDirty && !hasMeaningfulLocalData();
          if (canBootstrapFromCloud) {
            cloudConflictPending = false;
            result = applyIncomingCloudRow(data, 'CLOUD LOADED ON THIS DEVICE') ? 'applied' : 'unsupported';
          } else {
            cloudConflictPending = true;
            setAccountStatus(
              cloudDirty ? 'CLOUD READY - LOCAL UNSAVED' : 'CLOUD READY - CHOOSE LOAD',
              'warn'
            );
            result = 'conflict';
          }
        } else {
          cloudConflictPending = false;
        }
        return result;
      } catch (error) {
        console.error(error);
        if (!silent) setAccountStatus(`CHECK ERROR: ${error.message}`, 'error');
        return 'error';
      } finally {
        cloudPullCheckInFlight = false;
        renderAccountPanel();
      }
    }

    async function triggerCloudSync(reason = 'sync', options = {}) {
      const manual = options.manual === true;
      const immediateUpload = options.immediateUpload === true;
      const force = options.force === true;

      if (!hasSupabaseConfig() || !ensureSupabaseClient()) {
        if (manual) {
          setAccountStatus('SUPABASE CONFIG REQUIRED', 'warn');
          openAccountModal();
        }
        renderAccountPanel();
        return 'unavailable';
      }

      let session = accountSession;
      if (!session || !session.user) {
        session = await refreshAccountSession();
      }
      if (!session || !session.user) {
        if (manual) {
          setAccountStatus('SIGN IN REQUIRED', 'warn');
          openAccountModal();
        }
        renderAccountPanel();
        return 'signed-out';
      }

      if (!navigator.onLine) {
        setAccountStatus('OFFLINE - SYNC WAITING', 'warn');
        renderAccountPanel();
        return 'offline';
      }

      if (manual) setAccountStatus('CHECKING CLOUD...', 'idle');
      const checkResult = await checkCloudForUpdates({
        reason,
        silent: !manual,
        force
      });

      if (cloudConflictPending) return 'conflict';

      if (cloudDirty) {
        if (immediateUpload) {
          await uploadCloudSnapshot({ automatic: false, reason, skipPreflight: true });
          return 'uploaded';
        }
        scheduleCloudAutosync(reason);
        return 'queued';
      }

      if (manual && checkResult !== 'applied') {
        setAccountStatus(cloudSnapshotMeta ? 'SYNC CHECKED' : 'NO CLOUD SNAPSHOT', cloudSnapshotMeta ? 'ok' : 'warn');
      }
      renderAccountPanel();
      return checkResult;
    }

    async function manualCloudSync() {
      await triggerCloudSync('manual sync', {
        manual: true,
        force: true,
        immediateUpload: true
      });
    }

    function readStoredJson(key, fallback = {}) {
      const stored = localStorage.getItem(key);
      if (!stored) return cloneData(fallback);
      try {
        return JSON.parse(stored);
      } catch (e) {
        return cloneData(fallback);
      }
    }

    function writeStoredJson(key, value) {
      localStorage.setItem(key, JSON.stringify(value || {}));
    }

    function cloneData(value) {
      if (value === undefined || value === null) return value;
      return JSON.parse(JSON.stringify(value));
    }

    function stableStringify(value) {
      if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
      }
      if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
      }
      return JSON.stringify(value);
    }

    function isSameData(a, b) {
      return stableStringify(a) === stableStringify(b);
    }

    function hasMeaningfulWeekData(data) {
      if (!data || typeof data !== 'object') return false;
      return Object.values(data).some(week => {
        if (!week || typeof week !== 'object') return false;
        return Object.values(week).some(value => {
          if (typeof value === 'number') return value !== 0;
          if (typeof value === 'string') return value.trim() !== '';
          if (typeof value === 'boolean') return value;
          return value !== null && value !== undefined;
        });
      });
    }

    function normalizeTypesForCompare(types) {
      const normalized = { ...(types || {}) };
      Object.keys(normalized).forEach(key => {
        if (normalized[key] === CELL_TYPES.COUNTER) normalized[key] = CELL_TYPES.UNIT;
      });
      return normalized;
    }

    function hasMeaningfulPinSnapshotData(pin, snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return false;

      if (hasMeaningfulWeekData(snapshot.weekData)) return true;
      if (!isSameData(snapshot.habitLabels || {}, getDefaultPinProp(pin, 'habitLabels'))) return true;
      if (!isSameData(
        normalizeTypesForCompare(snapshot.habitTypes || {}),
        normalizeTypesForCompare(getDefaultPinProp(pin, 'habitTypes'))
      )) return true;
      if (!isSameData(snapshot.habitColors || {}, getDefaultPinProp(pin, 'habitColors'))) return true;
      if (!isSameData(normalizeCellFlags(snapshot.cellFlags || {}), normalizeCellFlags({}))) return true;
      if (!isSameData(normalizeCellLayout(snapshot.cellLayout || {}), normalizeCellLayout({}))) return true;
      if (!isSameData(snapshot.themeSettings || defaultThemeSettings(), defaultThemeSettings())) return true;

      return [
        'habitDescriptions',
        'durationStates',
        'timerSettings',
        'timerStates',
        'counterLastUpdate',
        'counterChangeLog',
        'moneySettings',
        'unitSettings',
        'valueFormats',
        'mathSettings',
        'ledSettings',
        'ledStates',
        'currencySettings'
      ].some(prop => Object.keys(snapshot[prop] || {}).length > 0);
    }

    function hasMeaningfulLocalData() {
      if (Object.keys(pinNames || {}).length > 0) return true;
      if (Object.keys(pinColors || {}).length > 0) return true;
      return Array.from({ length: PIN_COUNT }, (_, pin) => buildPinSyncSnapshot(pin))
        .some(snapshot => hasMeaningfulPinSnapshotData(snapshot.pin, snapshot));
    }

    function persistCurrentPinState() {
      saveWeekData();
      saveLabels();
      saveTypes();
      saveColors();
      saveDescriptions();
      saveDurationStates();
      saveTimerSettings();
      saveTimerStates();
      saveMoneySettings();
      saveUnitSettings();
      saveValueFormats();
      saveMathSettings();
      saveCellFlags();
      saveCellLayout();
      saveThemeSettings();
      saveLedSettings();
      saveLedStates();
      saveCurrencySettings();
      saveCurrencyCache();
      saveCounterLastUpdate();
      saveCounterChangeLog();
      savePinNames();
      savePinColors();
      saveViewMode();
    }

    function reloadCurrentPinState() {
      loadWeekData();
      loadLabels();
      loadTypes();
      loadColors();
      loadDescriptions();
      loadDurationStates();
      loadTimerSettings();
      loadTimerStates();
      loadMoneySettings();
      loadUnitSettings();
      loadValueFormats();
      loadMathSettings();
      loadCellFlags();
      loadCellLayout();
      loadLedSettings();
      loadLedStates();
      loadCurrencySettings();
      loadCurrencyCache();
      loadThemeSettings();
      applyTheme();
      loadCounterLastUpdate();
      loadCounterChangeLog();
      loadPinNames();
      loadPinColors();
      syncPinsFromState();
      currentWeekKey = getWeekKey();
      ensureWeekExists();
      applyPinNamesToUI();
      renderHabits();
      renderLayoutEditor();
      setView(currentView);
      updateHeader();
    }

    function getCurrentPinProp(prop) {
      const map = {
        weekData,
        habitLabels,
        habitTypes,
        habitColors,
        habitDescriptions,
        durationStates,
        timerSettings,
        timerStates,
        counterLastUpdate,
        counterChangeLog,
        moneySettings,
        unitSettings,
        valueFormats,
        mathSettings,
        cellFlags,
        cellLayout,
        themeSettings,
        ledSettings,
        ledStates,
        currencySettings
      };
      return cloneData(map[prop] || {});
    }

    function getDefaultPinProp(pin, prop) {
      if (prop === 'habitLabels') return { ...DEFAULT_LABELS[pin] };
      if (prop === 'habitTypes') return { ...DEFAULT_TYPES[pin] };
      if (prop === 'habitColors') return { ...DEFAULT_COLORS[pin] };
      if (prop === 'cellFlags') return normalizeCellFlags({});
      if (prop === 'cellLayout') return normalizeCellLayout({});
      if (prop === 'themeSettings') return defaultThemeSettings();
      if (prop === 'counterChangeLog') return [];
      return {};
    }

    function buildPinSyncSnapshot(pin) {
      const snapshot = { pin };
      PER_PIN_SYNC_FIELDS.forEach(field => {
        if (pin === currentPin) {
          snapshot[field.prop] = getCurrentPinProp(field.prop);
        } else {
          snapshot[field.prop] = readStoredJson(
            `${field.key}_pin${pin}`,
            getDefaultPinProp(pin, field.prop)
          );
        }

        if (field.prop === 'habitTypes') {
          Object.keys(snapshot[field.prop]).forEach(k => {
            if (snapshot[field.prop][k] === CELL_TYPES.COUNTER) {
              snapshot[field.prop][k] = CELL_TYPES.UNIT;
            }
          });
        }
        if (field.prop === 'counterChangeLog') {
          snapshot[field.prop] = normalizeCounterChangeLog(snapshot[field.prop]);
        }
      });
      return snapshot;
    }

    function buildCloudSnapshot() {
      runWithoutCloudDirty(() => persistCurrentPinState());

      return {
        version: APP_VERSION,
        schemaVersion: CLOUD_SNAPSHOT_SCHEMA_VERSION,
        snapshotType: 'fullApp',
        exportedAt: new Date().toISOString(),
        currentPin,
        currentView,
        pinCount: PIN_COUNT,
        deviceId: getSupabaseDeviceId(),
        pinNames: cloneData(pinNames || {}),
        pinColors: cloneData(pinColors || {}),
        currencyCache: cloneData(currencyCache || {}),
        pinData: Array.from({ length: PIN_COUNT }, (_, pin) => buildPinSyncSnapshot(pin))
      };
    }

    function applyCurrentPinSnapshot(imported, options = {}) {
      if (!imported || typeof imported !== 'object') return false;

      return runWithoutCloudDirty(() => {
        if (imported.weekData) weekData = imported.weekData;
        if (imported.habitLabels) habitLabels = { ...habitLabels, ...imported.habitLabels };

        if (imported.habitTypes) {
          const incoming = { ...imported.habitTypes };
          Object.keys(incoming).forEach(k => {
            if (incoming[k] === CELL_TYPES.COUNTER) incoming[k] = CELL_TYPES.UNIT;
          });
          habitTypes = { ...habitTypes, ...incoming };
        }

        if (imported.habitColors) habitColors = { ...habitColors, ...imported.habitColors };
        if (imported.habitDescriptions) habitDescriptions = { ...habitDescriptions, ...imported.habitDescriptions };

        if (imported.durationStates) durationStates = { ...durationStates, ...imported.durationStates };
        if (imported.timerSettings) timerSettings = { ...timerSettings, ...imported.timerSettings };
        if (imported.moneySettings) moneySettings = { ...moneySettings, ...imported.moneySettings };

        if (imported.unitSettings) unitSettings = imported.unitSettings;
        if (imported.valueFormats) valueFormats = imported.valueFormats;
        if (imported.mathSettings) mathSettings = imported.mathSettings;
        if (imported.cellFlags) cellFlags = normalizeCellFlags(imported.cellFlags);
        if (imported.cellLayout) cellLayout = normalizeCellLayout(imported.cellLayout);
        if (imported.cells) applyCellsSnapshot(imported.cells);
        if (imported.themeSettings) themeSettings = imported.themeSettings;
        if (imported.ledSettings) ledSettings = imported.ledSettings;
        if (imported.ledStates) ledStates = imported.ledStates;
        if (imported.currencySettings) currencySettings = imported.currencySettings;
        if (imported.currencyCache) currencyCache = imported.currencyCache;
        if (imported.counterLastUpdate) counterLastUpdate = imported.counterLastUpdate;
        if (imported.counterChangeLog) counterChangeLog = normalizeCounterChangeLog(imported.counterChangeLog);
        if (imported.pinNames) pinNames = { ...pinNames, ...imported.pinNames };
        if (imported.pinColors) pinColors = { ...pinColors, ...imported.pinColors };

        persistCurrentPinState();
        reloadCurrentPinState();
        return true;
      });
    }

    function applyCloudSnapshot(snapshot, options = {}) {
      if (!snapshot || snapshot.snapshotType !== 'fullApp' || !Array.isArray(snapshot.pinData)) {
        return false;
      }

      return runWithoutCloudDirty(() => {
        snapshot.pinData.forEach(pinSnapshot => {
          const pin = normalizeInt(pinSnapshot.pin, 0, 0, PIN_COUNT - 1);
          PER_PIN_SYNC_FIELDS.forEach(field => {
            localStorage.removeItem(`${field.key}_pin${pin}`);
            if (pinSnapshot[field.prop] !== undefined) {
              let value = pinSnapshot[field.prop];
              if (field.prop === 'habitTypes') {
                value = { ...value };
                Object.keys(value).forEach(k => {
                  if (value[k] === CELL_TYPES.COUNTER) value[k] = CELL_TYPES.UNIT;
                });
              }
              if (field.prop === 'cellFlags') value = normalizeCellFlags(value);
              if (field.prop === 'cellLayout') value = normalizeCellLayout(value);
              if (field.prop === 'counterChangeLog') value = normalizeCounterChangeLog(value);
              writeStoredJson(`${field.key}_pin${pin}`, value);
            }
          });
        });

        if (snapshot.pinNames && typeof snapshot.pinNames === 'object') {
          pinNames = snapshot.pinNames;
          savePinNames();
        }

        if (snapshot.pinColors && typeof snapshot.pinColors === 'object') {
          pinColors = snapshot.pinColors;
          savePinColors();
        }

        if (snapshot.currencyCache && typeof snapshot.currencyCache === 'object') {
          currencyCache = snapshot.currencyCache;
          saveCurrencyCache();
        }

        currentPin = normalizeInt(snapshot.currentPin, currentPin, 0, PIN_COUNT - 1);
        currentView = Object.values(VIEW_MODES).includes(snapshot.currentView)
          ? snapshot.currentView
          : VIEW_MODES.TRACK;
        saveViewMode();

        document.querySelectorAll('.pin').forEach(p => p.classList.remove('active'));
        const activePin = document.getElementById(`pin${currentPin}`);
        if (activePin) activePin.classList.add('active');
        const grid = document.getElementById('habitsGrid');
        if (grid) grid.setAttribute('data-pin', currentPin);
        const layoutGrid = document.getElementById('layoutGrid');
        if (layoutGrid) layoutGrid.setAttribute('data-pin', currentPin);

        reloadCurrentPinState();
        return true;
      });
    }

    function getSupabaseConfig() {
      const baseConfig = window.TRCKNG_CONFIG || {};
      return {
        url: (localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || baseConfig.supabaseUrl || '').trim(),
        anonKey: (localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY) || baseConfig.supabaseAnonKey || '').trim(),
        table: (baseConfig.supabaseTable || SUPABASE_DEFAULT_TABLE).trim()
      };
    }

    function hasSupabaseConfig() {
      const config = getSupabaseConfig();
      return Boolean(config.url && config.anonKey);
    }

    function getSupabaseDeviceId() {
      let deviceId = localStorage.getItem(STORAGE_KEYS.SUPABASE_DEVICE_ID);
      if (!deviceId) {
        deviceId = window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem(STORAGE_KEYS.SUPABASE_DEVICE_ID, deviceId);
      }
      return deviceId;
    }

    function ensureSupabaseClient(force = false) {
      const config = getSupabaseConfig();
      const signature = `${config.url}|${config.anonKey}|${config.table}`;

      if (!config.url || !config.anonKey) {
        supabaseClient = null;
        supabaseConfigSignature = '';
        return false;
      }

      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        supabaseClient = null;
        supabaseConfigSignature = '';
        return false;
      }

      if (!force && supabaseClient && supabaseConfigSignature === signature) {
        return true;
      }

      supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
      supabaseConfigSignature = signature;
      return true;
    }

    function applyAccountStatus(message, tone = 'idle') {
      const status = document.getElementById('accountStatus');
      if (!status) return;
      status.textContent = message;
      status.dataset.status = tone;
    }

    function setAccountStatus(message, tone = 'idle') {
      accountStatusOverride = { message, tone };
      applyAccountStatus(message, tone);
    }

    function setAccountInputValue(id, value) {
      const input = document.getElementById(id);
      if (!input || document.activeElement === input) return;
      input.value = value || '';
    }

    function syncAccountConfigToggle(configured) {
      const body = document.getElementById('accountConfigBody');
      const toggle = document.getElementById('accountConfigToggle');
      if (!body || !toggle) return;

      if (!configured) body.hidden = false;
      const isOpen = !body.hidden;
      toggle.textContent = isOpen ? 'HIDE CONFIG' : 'CONFIG SAVED';
      toggle.setAttribute('aria-expanded', String(isOpen));
    }

    function setAccountConfigOpen(isOpen) {
      const body = document.getElementById('accountConfigBody');
      if (body) body.hidden = !isOpen;
      syncAccountConfigToggle(hasSupabaseConfig());
    }

    function toggleAccountConfig() {
      const body = document.getElementById('accountConfigBody');
      if (!body) return;
      const configured = hasSupabaseConfig();
      setAccountConfigOpen(configured ? body.hidden : true);
    }

    function loadSignupUnlockState() {
      try {
        signupUnlocked = sessionStorage.getItem(STORAGE_KEYS.SIGNUP_UNLOCKED) === 'true';
      } catch (e) {
        signupUnlocked = false;
      }
    }

    function setSignupUnlocked(isUnlocked) {
      signupUnlocked = Boolean(isUnlocked);
      try {
        if (signupUnlocked) {
          sessionStorage.setItem(STORAGE_KEYS.SIGNUP_UNLOCKED, 'true');
        } else {
          sessionStorage.removeItem(STORAGE_KEYS.SIGNUP_UNLOCKED);
        }
      } catch (e) {}
      renderAccountPanel();
    }

    function unlockSignup() {
      setSignupUnlocked(true);
      setAccountStatus('SIGN UP UNLOCKED', 'ok');
    }

    function cancelSignupUnlockTimer() {
      if (!signupUnlockTimer) return;
      clearTimeout(signupUnlockTimer);
      signupUnlockTimer = null;
    }

    function setupSignupUnlockGesture() {
      const label = document.getElementById('accountEmailLabel');
      if (!label) return;

      const start = event => {
        if (signupUnlocked) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        cancelSignupUnlockTimer();
        signupUnlockTimer = setTimeout(() => {
          signupUnlockTimer = null;
          unlockSignup();
        }, SIGNUP_UNLOCK_MS);
      };

      label.addEventListener('pointerdown', start);
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(eventName => {
        label.addEventListener(eventName, cancelSignupUnlockTimer);
      });
    }

    function formatCloudMeta(meta) {
      if (!meta || !meta.updatedAt) return 'NO SNAPSHOT';
      const date = new Date(meta.updatedAt);
      const when = Number.isNaN(date.getTime()) ? meta.updatedAt : date.toLocaleString();
      const device = meta.deviceId ? meta.deviceId.slice(0, 8).toUpperCase() : 'DEVICE';
      return `${when} / ${device}`;
    }

    function renderAccountPanel() {
      const config = getSupabaseConfig();
      const configured = Boolean(config.url && config.anonKey);
      const sdkLoaded = Boolean(window.supabase && typeof window.supabase.createClient === 'function');
      const signedIn = Boolean(accountSession && accountSession.user);

      setAccountInputValue('accountConfigUrl', config.url);
      setAccountInputValue('accountConfigAnon', config.anonKey);
      syncAccountConfigToggle(configured);

      const identity = document.getElementById('accountIdentity');
      if (identity) {
        identity.textContent = signedIn
          ? (accountSession.user.email || accountSession.user.id || 'SIGNED IN')
          : (configured ? 'GUEST READY' : 'LOCAL');
      }

      const cloudMeta = document.getElementById('accountCloudMeta');
      if (cloudMeta) cloudMeta.textContent = formatCloudMeta(cloudSnapshotMeta);
      const syncMeta = document.getElementById('accountSyncMeta');
      if (syncMeta) syncMeta.textContent = getCloudSyncLabel();
      const quickSync = document.getElementById('btnCloudSync');
      if (quickSync) {
        let syncState = 'idle';
        let syncLabel = 'SYNC';
        if (cloudBusy) {
          syncState = 'busy';
          syncLabel = '...';
        } else if (cloudConflictPending) {
          syncState = 'conflict';
          syncLabel = 'FIX';
        } else if (cloudDirty && cloudSyncTimer) {
          syncState = 'queued';
          syncLabel = 'WAIT';
        } else if (cloudDirty) {
          syncState = 'dirty';
          syncLabel = 'UP';
        } else if (signedIn && cloudSnapshotMeta) {
          syncState = 'ready';
          syncLabel = 'OK';
        } else if (signedIn) {
          syncState = 'ready';
          syncLabel = 'SYNC';
        }
        quickSync.textContent = syncLabel;
        quickSync.dataset.syncState = syncState;
        quickSync.disabled = cloudBusy;
      }
      const signUpButton = document.getElementById('accountSignUp');
      if (signUpButton) signUpButton.hidden = !signupUnlocked;
      const authActions = document.getElementById('accountAuthActions');
      if (authActions) authActions.dataset.signupUnlocked = String(signupUnlocked);
      const emailLabel = document.getElementById('accountEmailLabel');
      if (emailLabel) {
        emailLabel.dataset.unlocked = String(signupUnlocked);
        emailLabel.textContent = signupUnlocked ? 'Email / Sign Up Unlocked' : 'Email';
      }

      const needsConfig = !configured || !sdkLoaded;
      ['accountEmail', 'accountPassword', 'accountSignIn', 'accountSignUp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = needsConfig || cloudBusy || signedIn;
      });
      ['accountSignOut', 'accountUpload', 'accountLoad'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = needsConfig || cloudBusy || !signedIn;
      });

      const saveConfig = document.getElementById('accountConfigSave');
      if (saveConfig) saveConfig.disabled = cloudBusy;

      let statusMessage = 'READY TO SIGN IN';
      let statusTone = 'idle';
      if (!configured) {
        statusMessage = 'LOCAL ONLY';
        statusTone = 'warn';
      } else if (!sdkLoaded) {
        statusMessage = 'SUPABASE SDK OFFLINE';
        statusTone = 'error';
      } else if (signedIn) {
        if (cloudBusy) {
          statusMessage = 'SYNCING...';
          statusTone = 'idle';
        } else if (cloudConflictPending) {
          statusMessage = 'CONFLICT - LOAD OR UPLOAD';
          statusTone = 'warn';
        } else if (cloudDirty && cloudSyncTimer) {
          statusMessage = 'UNSAVED - AUTO SYNC QUEUED';
          statusTone = 'warn';
        } else if (cloudDirty) {
          statusMessage = navigator.onLine ? 'UNSAVED - SYNC WAITING' : 'OFFLINE - SYNC WAITING';
          statusTone = 'warn';
        } else if (cloudSnapshotMeta) {
          statusMessage = 'SYNCED';
          statusTone = 'ok';
        } else {
          statusMessage = 'SIGNED IN';
          statusTone = 'ok';
        }
      }
      applyAccountStatus(
        accountStatusOverride?.message || statusMessage,
        accountStatusOverride?.tone || statusTone
      );
    }

    function openAccountModal() {
      renderAccountPanel();
      document.getElementById('accountModal').classList.add('visible');
      if (hasSupabaseConfig() && !accountSession) {
        refreshAccountSession();
      }
    }

    function closeAccountModal() {
      document.getElementById('accountModal').classList.remove('visible');
    }

    function setupSupabaseAccount(force = false) {
      if (supabaseAuthSubscription && typeof supabaseAuthSubscription.unsubscribe === 'function') {
        supabaseAuthSubscription.unsubscribe();
        supabaseAuthSubscription = null;
      }

      if (!ensureSupabaseClient(force)) {
        accountSession = null;
        cloudSnapshotMeta = null;
        renderAccountPanel();
        return false;
      }

      const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
        accountSession = session;
        if (event === 'SIGNED_OUT') {
          cloudSnapshotMeta = null;
        }
        renderAccountPanel();
        if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          setTimeout(async () => {
            await triggerCloudSync('auth', { force: true });
          }, 0);
        }
      });
      supabaseAuthSubscription = data && data.subscription ? data.subscription : null;
      refreshAccountSession().then(session => {
        if (session && session.user) {
          triggerCloudSync('startup', { force: true });
        }
      });
      return true;
    }

    async function refreshAccountSession() {
      if (!ensureSupabaseClient()) {
        renderAccountPanel();
        return null;
      }

      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        accountSession = data.session;
        renderAccountPanel();
        if (accountSession) await refreshCloudSnapshotMeta();
        return accountSession;
      } catch (error) {
        console.error(error);
        setAccountStatus(`SESSION ERROR: ${error.message}`, 'error');
        return null;
      }
    }

    function getAccountCredentials() {
      const email = (document.getElementById('accountEmail')?.value || '').trim();
      const password = document.getElementById('accountPassword')?.value || '';
      return { email, password };
    }

    function saveSupabaseConfigFromModal() {
      const url = (document.getElementById('accountConfigUrl')?.value || '').trim();
      const anonKey = (document.getElementById('accountConfigAnon')?.value || '').trim();

      if (url) localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url);
      else localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);

      if (anonKey) localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, anonKey);
      else localStorage.removeItem(STORAGE_KEYS.SUPABASE_ANON_KEY);

      accountSession = null;
      cloudSnapshotMeta = null;
      setupSupabaseAccount(true);
      setAccountConfigOpen(!(url && anonKey));
      setAccountStatus(url && anonKey ? 'CONFIG SAVED' : 'LOCAL ONLY', url && anonKey ? 'ok' : 'warn');
    }

    async function signInAccount() {
      if (!ensureSupabaseClient()) {
        renderAccountPanel();
        return;
      }

      const { email, password } = getAccountCredentials();
      if (!email || !password) {
        setAccountStatus('EMAIL AND PASSWORD REQUIRED', 'warn');
        return;
      }

      cloudBusy = true;
      renderAccountPanel();
      setAccountStatus('SIGNING IN...', 'idle');

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        accountSession = data.session;
        document.getElementById('accountPassword').value = '';
        await refreshCloudSnapshotMeta();
        await checkCloudForUpdates({ reason: 'sign in', silent: false });
        if (cloudDirty) scheduleCloudAutosync('sign in');
        if (!accountStatusOverride || accountStatusOverride.message === 'SIGNING IN...') {
          setAccountStatus(cloudSnapshotMeta ? 'SYNCED' : 'SIGNED IN', 'ok');
        }
      } catch (error) {
        console.error(error);
        setAccountStatus(`SIGN IN ERROR: ${error.message}`, 'error');
      } finally {
        cloudBusy = false;
        if (accountSession && accountSession.user && cloudDirty && !cloudConflictPending) {
          scheduleCloudAutosync('sign in ready');
        }
        renderAccountPanel();
      }
    }

    async function signUpAccount() {
      if (!signupUnlocked) {
        setAccountStatus('HOLD EMAIL 3 SEC TO UNLOCK SIGN UP', 'warn');
        return;
      }

      if (!ensureSupabaseClient()) {
        renderAccountPanel();
        return;
      }

      const { email, password } = getAccountCredentials();
      if (!email || !password) {
        setAccountStatus('EMAIL AND PASSWORD REQUIRED', 'warn');
        return;
      }

      cloudBusy = true;
      renderAccountPanel();
      setAccountStatus('CREATING ACCOUNT...', 'idle');

      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.href.split('#')[0]
          }
        });
        if (error) throw error;
        accountSession = data.session;
        document.getElementById('accountPassword').value = '';
        if (accountSession) {
          await refreshCloudSnapshotMeta();
          await checkCloudForUpdates({ reason: 'sign up', silent: false });
          if (cloudDirty) scheduleCloudAutosync('sign up');
          if (!accountStatusOverride || accountStatusOverride.message === 'CREATING ACCOUNT...') {
            setAccountStatus(cloudSnapshotMeta ? 'SYNCED' : 'ACCOUNT READY', 'ok');
          }
        } else {
          setAccountStatus('CHECK EMAIL TO CONFIRM', 'warn');
        }
        setSignupUnlocked(false);
      } catch (error) {
        console.error(error);
        setAccountStatus(`SIGN UP ERROR: ${error.message}`, 'error');
      } finally {
        cloudBusy = false;
        if (accountSession && accountSession.user && cloudDirty && !cloudConflictPending) {
          scheduleCloudAutosync('sign up ready');
        }
        renderAccountPanel();
      }
    }

    async function signOutAccount() {
      if (!ensureSupabaseClient()) return;
      cloudBusy = true;
      renderAccountPanel();
      setAccountStatus('SIGNING OUT...', 'idle');

      try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        accountSession = null;
        cloudSnapshotMeta = null;
        setAccountStatus('SIGNED OUT', 'idle');
      } catch (error) {
        console.error(error);
        setAccountStatus(`SIGN OUT ERROR: ${error.message}`, 'error');
      } finally {
        cloudBusy = false;
        renderAccountPanel();
      }
    }

    async function fetchCloudSnapshotRow() {
      const session = await refreshAccountSession();
      if (!session || !session.user) {
        setAccountStatus('SIGN IN REQUIRED', 'warn');
        return null;
      }

      const config = getSupabaseConfig();
      const { data, error } = await supabaseClient
        .from(config.table)
        .select('app_state, updated_at, device_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }

    async function refreshCloudSnapshotMeta() {
      if (!supabaseClient || !accountSession || !accountSession.user) return;

      try {
        const config = getSupabaseConfig();
        const { data, error } = await supabaseClient
          .from(config.table)
          .select('app_state, updated_at, device_id')
          .eq('user_id', accountSession.user.id)
          .maybeSingle();
        if (error) throw error;

        cloudSnapshotMeta = data ? {
          updatedAt: data.updated_at,
          deviceId: data.device_id,
          version: data.app_state && data.app_state.version
        } : null;
        renderAccountPanel();
      } catch (error) {
        console.error(error);
        setAccountStatus(`CLOUD ERROR: ${error.message}`, 'error');
      }
    }

    async function uploadCloudSnapshot(options = {}) {
      const automatic = Boolean(options.automatic);
      const skipPreflight = options.skipPreflight === true;
      if (!ensureSupabaseClient()) {
        renderAccountPanel();
        return;
      }

      const session = await refreshAccountSession();
      if (!session || !session.user) {
        setAccountStatus('SIGN IN REQUIRED', 'warn');
        return;
      }

      if (automatic && cloudConflictPending) {
        setAccountStatus('CONFLICT - LOAD OR UPLOAD', 'warn');
        renderAccountPanel();
        return;
      }

      if (automatic && !skipPreflight) {
        await checkCloudForUpdates({
          reason: options.reason ? `${options.reason} preflight` : 'upload preflight',
          silent: true,
          force: true
        });
        if (cloudConflictPending) {
          setAccountStatus('CONFLICT - LOAD OR UPLOAD', 'warn');
          renderAccountPanel();
          return;
        }
        if (!cloudDirty) {
          renderAccountPanel();
          return;
        }
      }

      cloudBusy = true;
      renderAccountPanel();
      setAccountStatus(automatic ? 'AUTO SYNCING...' : 'UPLOADING SNAPSHOT...', 'idle');

      try {
        const config = getSupabaseConfig();
        const timestamp = new Date().toISOString();
        const snapshot = buildCloudSnapshot();
        const { data, error } = await supabaseClient
          .from(config.table)
          .upsert({
            user_id: session.user.id,
            app_state: snapshot,
            updated_at: timestamp,
            device_id: getSupabaseDeviceId()
          }, { onConflict: 'user_id' })
          .select('updated_at, device_id')
          .maybeSingle();
        if (error) throw error;

        cloudSnapshotMeta = {
          updatedAt: data?.updated_at || timestamp,
          deviceId: data?.device_id || getSupabaseDeviceId(),
          version: APP_VERSION
        };
        setCloudLastSyncAt(cloudSnapshotMeta.updatedAt);
        setCloudDirty(false);
        setAccountStatus(automatic ? 'AUTO SYNCED' : 'CLOUD SNAPSHOT UPDATED', 'ok');
      } catch (error) {
        console.error(error);
        if (automatic) {
          cloudDirty = true;
          cloudDirtyAt = Date.now();
          localStorage.setItem(STORAGE_KEYS.CLOUD_DIRTY, 'true');
          localStorage.setItem(STORAGE_KEYS.CLOUD_DIRTY_AT, String(cloudDirtyAt));
          setAccountStatus(`AUTO SYNC ERROR: ${error.message}`, 'error');
        } else {
          setAccountStatus(`UPLOAD ERROR: ${error.message}`, 'error');
        }
      } finally {
        cloudBusy = false;
        if (automatic && cloudDirty) scheduleCloudAutosync('autosync retry');
        renderAccountPanel();
      }
    }

    async function loadCloudSnapshot() {
      if (!ensureSupabaseClient()) {
        renderAccountPanel();
        return;
      }

      cloudBusy = true;
      renderAccountPanel();
      setAccountStatus('LOADING CLOUD...', 'idle');

      try {
        const row = await fetchCloudSnapshotRow();
        if (!row || !row.app_state) {
          setAccountStatus('NO CLOUD SNAPSHOT', 'warn');
          return;
        }

        const updatedAt = row.updated_at ? new Date(row.updated_at).toLocaleString() : 'unknown time';
        if (!confirm(`LOAD CLOUD SNAPSHOT?\n\nCloud updated: ${updatedAt}\nThis replaces local data on this device.`)) {
          setAccountStatus('LOAD CANCELLED', 'idle');
          return;
        }

        const applied = row.app_state.snapshotType === 'fullApp'
          ? applyCloudSnapshot(row.app_state)
          : applyCurrentPinSnapshot(row.app_state);

        if (!applied) throw new Error('Unsupported snapshot format');

        cloudSnapshotMeta = {
          updatedAt: row.updated_at,
          deviceId: row.device_id,
          version: row.app_state.version
        };
        setCloudLastSyncAt(row.updated_at);
        setCloudDirty(false);
        setAccountStatus('CLOUD SNAPSHOT LOADED', 'ok');
      } catch (error) {
        console.error(error);
        setAccountStatus(`LOAD ERROR: ${error.message}`, 'error');
      } finally {
        cloudBusy = false;
        renderAccountPanel();
      }
    }

    
    function hexToRgba(hex, alpha) {
      if (!hex) return `rgba(255,255,255,${alpha})`;
      if (typeof hex === 'string' && hex.startsWith('rgba')) return hex;
      const h = hex.replace('#', '');
      if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
      const r = parseInt(h.substring(0,2), 16);
      const g = parseInt(h.substring(2,4), 16);
      const b = parseInt(h.substring(4,6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
function applyTheme() {
      const t = themeSettings || defaultThemeSettings();
      const bg = t.bg || '#000000';
      const text = t.text || '#ffffff';
      const stroke = t.stroke || '#ffffff';
      
      document.documentElement.style.setProperty('--app-bg', bg);
      document.documentElement.style.setProperty('--app-text', text);
      document.documentElement.style.setProperty('--btn-bg', bg);
      document.documentElement.style.setProperty('--btn-text', text);

      const strokeSoft = hexToRgba(stroke, 0.15);
      const strokeStrong = hexToRgba(stroke, 0.35);
      document.documentElement.style.setProperty('--stroke-soft', strokeSoft);
      document.documentElement.style.setProperty('--stroke-strong', strokeStrong);
    }



    function loadCounterLastUpdate() {
      counterLastUpdate = {};
      const key = `${STORAGE_KEYS.COUNTER_LAST_UPDATE}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { counterLastUpdate = JSON.parse(stored); } catch (e) {}
      }
    }

    function saveCounterLastUpdate() {
      const key = `${STORAGE_KEYS.COUNTER_LAST_UPDATE}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(counterLastUpdate));
      markCloudDirty('counter last update');
    }

    function normalizeCounterChangeLog(rawLog) {
      if (!Array.isArray(rawLog)) return [];

      return rawLog
        .filter(entry => entry && typeof entry === 'object' && entry.week && entry.habit)
        .map(entry => ({
          id: String(entry.id || `${entry.week}-${entry.habit}-${entry.at || Date.now()}`),
          at: Number(entry.at) || Date.now(),
          week: String(entry.week),
          habit: String(entry.habit),
          previousValue: Number(entry.previousValue) || 0,
          nextValue: Number(entry.nextValue) || 0,
          previousLastUpdate: entry.previousLastUpdate ? Number(entry.previousLastUpdate) : null,
          nextLastUpdate: entry.nextLastUpdate ? Number(entry.nextLastUpdate) : null,
          source: String(entry.source || 'tap'),
          undoneAt: entry.undoneAt ? Number(entry.undoneAt) : null
        }))
        .sort((a, b) => a.at - b.at)
        .slice(-COUNTER_CHANGE_LOG_LIMIT);
    }

    function loadCounterChangeLog() {
      counterChangeLog = [];
      const key = `${STORAGE_KEYS.COUNTER_CHANGE_LOG}_pin${currentPin}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { counterChangeLog = normalizeCounterChangeLog(JSON.parse(stored)); } catch (e) {}
      }
    }

    function saveCounterChangeLog() {
      counterChangeLog = normalizeCounterChangeLog(counterChangeLog);
      const key = `${STORAGE_KEYS.COUNTER_CHANGE_LOG}_pin${currentPin}`;
      localStorage.setItem(key, JSON.stringify(counterChangeLog));
      markCloudDirty('counter change log');
    }

    function recordCounterChange(habit, previousValue, nextValue, previousLastUpdate, nextLastUpdate, source = 'tap') {
      const before = Number(previousValue) || 0;
      const after = Number(nextValue) || 0;
      if (before === after) return;

      counterChangeLog.push({
        id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${habit}`,
        at: Date.now(),
        week: currentWeekKey,
        habit,
        previousValue: before,
        nextValue: after,
        previousLastUpdate: previousLastUpdate || null,
        nextLastUpdate: nextLastUpdate || null,
        source,
        undoneAt: null
      });

      if (counterChangeLog.length > COUNTER_CHANGE_LOG_LIMIT) {
        counterChangeLog = counterChangeLog.slice(-COUNTER_CHANGE_LOG_LIMIT);
      }
    }

    function undoLastCounterChange() {
      ensureWeekExists();

      for (let i = counterChangeLog.length - 1; i >= 0; i--) {
        const entry = counterChangeLog[i];
        if (!entry || entry.undoneAt || entry.week !== currentWeekKey) continue;

        const weekObj = weekData[currentWeekKey] || {};
        weekObj[entry.habit] = Number(entry.previousValue) || 0;
        weekData[currentWeekKey] = weekObj;

        if (entry.previousLastUpdate) {
          counterLastUpdate[entry.habit] = entry.previousLastUpdate;
        } else {
          delete counterLastUpdate[entry.habit];
        }

        counterChangeLog[i] = {
          ...entry,
          undoneAt: Date.now()
        };

        saveWeekData();
        saveCounterLastUpdate();
        saveCounterChangeLog();
        renderHabits();
        scheduleMathRefresh();
        animateButton(entry.habit);
        return;
      }

      alert('Nothing to undo for this week');
    }


    function loadPinNames() {
      pinNames = {};
      const stored = localStorage.getItem(STORAGE_KEYS.PIN_NAMES);
      if (stored) {
        try { pinNames = JSON.parse(stored) || {}; } catch (e) { pinNames = {}; }
      }
    }

    function savePinNames() {
      localStorage.setItem(STORAGE_KEYS.PIN_NAMES, JSON.stringify(pinNames));
      markCloudDirty('pin names');
    }

    function normalizeHexColor(value, fallback = '#ffffff') {
      if (typeof value !== 'string') return fallback;
      const trimmed = value.trim();
      return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : fallback;
    }

    function loadPinColors() {
      pinColors = {};
      const stored = localStorage.getItem(STORAGE_KEYS.PIN_COLORS);
      if (stored) {
        try { pinColors = JSON.parse(stored) || {}; } catch (e) { pinColors = {}; }
      }
    }

    function savePinColors() {
      localStorage.setItem(STORAGE_KEYS.PIN_COLORS, JSON.stringify(pinColors));
      markCloudDirty('pin colors');
    }

    function getPinFillColor(index) {
      return normalizeHexColor(pinColors[index], DEFAULT_PIN_COLORS[index] || '#ff8c42');
    }

    function getReadableTextColor(hex) {
      const normalized = normalizeHexColor(hex, '#000000').replace('#', '');
      const r = parseInt(normalized.substring(0, 2), 16);
      const g = parseInt(normalized.substring(2, 4), 16);
      const b = parseInt(normalized.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.56 ? '#000000' : '#ffffff';
    }

    function getDefaultPinName(index) {
      const num = String(index + 1).padStart(2, '0');
      return `PIN ${num}`;
    }

    function applyPinNamesToUI() {
      syncPinsFromState();

      for (let i = 0; i < PIN_COUNT; i++) {
        const btn = document.getElementById(`pin${i}`);
        const pin = pins[i];
        const name = pin ? pin.name : getDefaultPinName(i);
        const fill = getPinFillColor(i);
        if (btn) {
          btn.textContent = name;
          btn.style.setProperty('--pin-fill', fill);
          btn.style.setProperty('--pin-text', getReadableTextColor(fill));
        }
      }

      const layoutPinName = document.getElementById('btnLayoutPinName');
      if (layoutPinName) layoutPinName.textContent = getCurrentPinName();
      const layoutPinColor = document.getElementById('layoutPinColor');
      if (layoutPinColor && document.activeElement !== layoutPinColor) {
        layoutPinColor.value = getPinFillColor(currentPin);
      }

      updateHistoryChrome();
      renderLayoutEditor();
    }

    function getCurrentPinName() {
      const raw = (pinNames && pinNames[currentPin] != null) ? String(pinNames[currentPin]) : '';
      return raw.trim() || getDefaultPinName(currentPin);
    }

    function renameCurrentPin() {
      const raw = (pinNames && pinNames[currentPin] != null) ? String(pinNames[currentPin]) : '';
      const currentName = raw.trim() || getDefaultPinName(currentPin);
      const newName = prompt('Pin name', currentName);
      if (newName === null) return;
      const trimmed = newName.trim();
      if (trimmed) {
        pinNames[currentPin] = trimmed;
      } else {
        delete pinNames[currentPin];
      }
      savePinNames();
      applyPinNamesToUI();
    }

    function setCurrentPinFillColor(value) {
      pinColors[currentPin] = normalizeHexColor(value, getPinFillColor(currentPin));
      savePinColors();
      applyPinNamesToUI();
    }

    function updateHistoryChrome() {
      const historyTitle = document.getElementById('historyTitle');
      if (historyTitle) historyTitle.textContent = getCurrentPinName();

      const historyMeta = document.getElementById('historyMeta');
      if (historyMeta) {
        const weeks = Object.keys(weekData || {}).length;
        historyMeta.textContent = `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
      }
    }

    function setView(view) {
      currentView = Object.values(VIEW_MODES).includes(view) ? view : VIEW_MODES.TRACK;

      const trackView = document.getElementById('trackView');
      const layoutView = document.getElementById('layoutView');
      const historyView = document.getElementById('historyView');
      if (trackView) trackView.hidden = currentView !== VIEW_MODES.TRACK;
      if (layoutView) layoutView.hidden = currentView !== VIEW_MODES.LAYOUT;
      if (historyView) historyView.hidden = currentView !== VIEW_MODES.HISTORY;

      document.querySelectorAll('.view-tab').forEach(tab => {
        const isActive = tab.dataset.view === currentView;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      updateHistoryChrome();
      if (currentView === VIEW_MODES.LAYOUT) renderLayoutEditor();
      if (currentView === VIEW_MODES.HISTORY) updateStats();
      if (currentView === VIEW_MODES.TRACK) requestAnimationFrame(updateCellDiagonalAngle);
      saveViewMode();
    }


    function ensureWeekExists() {
      if (!weekData[currentWeekKey] || typeof weekData[currentWeekKey] !== 'object') {
        weekData[currentWeekKey] = {};
        saveWeekData();
      }
    }

    // ===== FORMATTING =====
    function formatValueWithSuffix(value, suffix) {
      return `${value}<span class="btn-value-suffix">${suffix}</span>`;
    }

    function formatDurationSec(totalSeconds) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      // FIXED: Show full time - H:MM:SS when over 60 minutes
      let main;
      if (hours > 0) {
        main = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      } else {
        main = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      const breakdown = `${hours}h ${minutes}m ${seconds}s`;
      
      return { main, breakdown };
    }

    function formatDurationMin(totalMinutes, totalSeconds = null) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      const main = String(totalMinutes).padStart(2, '0');
      
      // If totalSeconds provided, include them in breakdown
      let breakdown;
      if (totalSeconds !== null) {
        const secs = totalSeconds % 60;
        breakdown = `${hours}h ${minutes}m ${secs}s`;
      } else {
        breakdown = `${hours}h ${minutes}m`;
      }
      
      return { main, breakdown };
    }

    function formatCounterLastUpdate(habit) {
      const ts = counterLastUpdate[habit];
      if (!ts) return '';
      const now = Date.now();
      let diffSec = Math.floor((now - ts) / 1000);
      if (diffSec < 0) diffSec = 0;

      const oneMinute = 60;
      const oneHour = 3600;
      const oneDay = 86400;

      if (diffSec < oneMinute) {
        return `${diffSec}s ago`;
      } else if (diffSec < oneHour) {
        const m = Math.floor(diffSec / 60);
        const s = diffSec % 60;
        return `${m}:${String(s).padStart(2, '0')}s ago`;
      } else if (diffSec < oneDay) {
        const h = Math.floor(diffSec / 3600);
        const m = Math.floor((diffSec % 3600) / 60);
        return `${h}h ${String(m).padStart(2, '0')}m ago`;
      } else {
        const d = new Date(ts);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month} ${hours}:${minutes}`;
      }
    }


    // ===== CLICK HANDLERS =====
    function handleHabitClick(habit) {
      const label = habitLabels[habit];
      if (!label?.trim()) return;

      const typeRaw = habitTypes[habit] || CELL_TYPES.UNIT;
      const type = (typeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : typeRaw;

      if (type === CELL_TYPES.UNIT) {
        handleUnitClick(habit);
      } else if (type === CELL_TYPES.VALUE) {
        openValueModal(habit);
      } else if (type === CELL_TYPES.MATH) {
        const cfg = mathSettings[habit] || {};
        if (cfg.tapCycles === true) {
          cycleMathOp(habit);
        }
      } else if (type === CELL_TYPES.MONEY_INCOME || type === CELL_TYPES.MONEY_BUDGET) {
        handleMoneyClick(habit, type);
      } else if (type === CELL_TYPES.TIMER) {
        handleTimerClick(habit);
      } else if (type === CELL_TYPES.COUNTDOWN) {
        handleCountdownClick(habit);
      } else if (type === CELL_TYPES.LED_PULSE) {
        handleLedClick(habit);
      } else if (type === CELL_TYPES.CURRENCY) {
        handleCurrencyClick(habit);
      } else {
        handleDurationClick(habit, type);
      }
    }

    function handleCurrencyClick(habit) {
      openCurrencyModal(habit);
    }
    
    let editingCurrencyHabit = null;
    let editingCurrencyRate = null;
    
    function openCurrencyModal(habit) {
      editingCurrencyHabit = habit;
      const settings = currencySettings[habit] || { from: 'USD', to: 'RUB', amount: 1 };
      const from = (settings.from || 'USD').toUpperCase();
      const to = (settings.to || 'RUB').toUpperCase();
      const amount = settings.amount || 1;
      const label = habitLabels[habit] || `${from}/${to}`;
      
      document.getElementById('currencyModalTitle').textContent = `CONVERT · ${label}`;
      document.getElementById('currencyModalFrom').textContent = from;
      document.getElementById('currencyModalInput').value = amount;
      document.getElementById('currencyModalResult').textContent = '= ...';
      
      // Fetch rate and update result
      fetchExchangeRate(from, to).then(rate => {
        editingCurrencyRate = rate;
        updateCurrencyModalResult();
      });
      
      document.getElementById('currencyModal').classList.add('visible');
      setTimeout(() => document.getElementById('currencyModalInput').focus(), 60);
    }
    
    function updateCurrencyModalResult() {
      if (!editingCurrencyHabit || editingCurrencyRate === null) return;
      const settings = currencySettings[editingCurrencyHabit] || {};
      const to = (settings.to || 'RUB').toUpperCase();
      const inputVal = parseFloat(document.getElementById('currencyModalInput').value) || 0;
      const converted = (inputVal * editingCurrencyRate).toFixed(2);
      document.getElementById('currencyModalResult').textContent = `= ${converted} ${to}`;
    }
    
    function closeCurrencyModal() {
      document.getElementById('currencyModal').classList.remove('visible');
      editingCurrencyHabit = null;
      editingCurrencyRate = null;
    }

    function handleCounterClick(habit) {
      ensureWeekExists();
      const previousValue = Number(weekData[currentWeekKey][habit] || 0);
      const previousLastUpdate = counterLastUpdate[habit] || null;
      if (decreaseMode) {
        weekData[currentWeekKey][habit] = Math.max(0, previousValue - 1);
      } else {
        weekData[currentWeekKey][habit] = previousValue + 1;
      }

      // Track last update time for simple counters
      const nextLastUpdate = Date.now();
      counterLastUpdate[habit] = nextLastUpdate;
      recordCounterChange(habit, previousValue, weekData[currentWeekKey][habit], previousLastUpdate, nextLastUpdate, 'counter');

      saveWeekData();
      saveCounterLastUpdate();
      saveCounterChangeLog();
      updateCellDisplay(habit);
      animateButton(habit);
    }

    function handleUnitClick(habit) {
      ensureWeekExists();
      const step = getUnitStep(habit);
      const previousValue = Number(weekData[currentWeekKey][habit] || 0);
      const previousLastUpdate = counterLastUpdate[habit] || null;

      if (decreaseMode) {
        weekData[currentWeekKey][habit] = Math.max(0, previousValue - step);
      } else {
        weekData[currentWeekKey][habit] = previousValue + step;
      }

      const nextLastUpdate = Date.now();
      counterLastUpdate[habit] = nextLastUpdate;
      recordCounterChange(habit, previousValue, weekData[currentWeekKey][habit], previousLastUpdate, nextLastUpdate, 'unit');
      saveWeekData();
      saveCounterLastUpdate();
      saveCounterChangeLog();

      // Update display depending on total flag
      const el = document.getElementById(`value-${habit}`);
      if (el) el.textContent = String(getUnitDisplayValue(habit));
      scheduleMathRefresh();
      animateButton(habit);
    }

    let editingValueHabit = null;

    function openValueModal(habit) {
      editingValueHabit = habit;
      const label = habitLabels[habit] || habit;
      document.getElementById('valueModalTitle').textContent = `VALUE · ${label}`;
      ensureWeekExists();
      const weekObj = weekData[currentWeekKey] || {};
      const current = Number(weekObj[habit] || 0);
      document.getElementById('valueModalInput').value = Number.isFinite(current) ? current : 0;
      document.getElementById('valueModal').classList.add('visible');
      setTimeout(() => document.getElementById('valueModalInput').focus(), 60);
    }

    function closeValueModal() {
      document.getElementById('valueModal').classList.remove('visible');
      editingValueHabit = null;
    }



    // ===== UNIT / VALUE / MATH HELPERS =====
    function getUnitStep(habit) {
      const cfg = unitSettings[habit] || {};
      const step = Number(cfg.step);
      if (!Number.isFinite(step) || step <= 0) return 1;
      return Math.floor(step);
    }

    function getUnitTotalFlag(habit) {
      const cfg = unitSettings[habit] || {};
      return cfg.total === true;
    }

    function getUnitDisplayValue(habit) {
      if (getUnitTotalFlag(habit)) {
        let sum = 0;
        Object.keys(weekData || {}).forEach(weekKey => {
          const w = weekData[weekKey];
          if (w && typeof w === 'object') sum += Number(w[habit] || 0);
        });
        return sum;
      }
      const weekObj = weekData[currentWeekKey];
      return (weekObj && typeof weekObj === 'object') ? Number(weekObj[habit] || 0) : 0;
    }

    function formatValueByFormat(value, fmt) {
      if (!Number.isFinite(value)) return '--';

      // Numeric formats
      if (fmt === 'int') return String(Math.round(value));
      if (fmt === '2dp') return String(Math.round(value * 100) / 100);
      if (fmt === '3dp') return String(Math.round(value * 1000) / 1000);

      // Time display helpers (Value stores a plain number; for time formats we interpret it as seconds)
      if (fmt === 'time_mmss') {
        const secs = Math.max(0, Math.floor(value));
        return formatDurationSec(secs).main;
      }
      if (fmt === 'time_m') {
        const mins = Math.max(0, (value / 60));
        const rounded = Math.round(mins * 100) / 100;
        return formatValueWithSuffix(rounded, 'm');
      }
      if (fmt === 'time_h') {
        const hrs = Math.max(0, (value / 3600));
        const rounded = Math.round(hrs * 100) / 100;
        return formatValueWithSuffix(rounded, 'h');
      }
      if (fmt === 'time_s') {
        const secs = Math.max(0, Math.floor(value));
        return formatValueWithSuffix(secs, 's');
      }

      return String(value);
    }

    function getValueDisplay(habit) {
      const weekObj = weekData[currentWeekKey];
      const v = (weekObj && typeof weekObj === 'object') ? Number(weekObj[habit] || 0) : 0;
      const fmt = valueFormats[habit] || 'raw';
      return formatValueByFormat(v, fmt);
    }

    function computeDurationTotalSeconds(habit) {
      const state = durationStates[habit] || {};
      const accumulated = Number(state.accumulated || 0);
      let total = accumulated;
      if (state.isRunning && state.startTime) {
        total += Math.floor((Date.now() - state.startTime) / 1000);
      }
      return Math.max(0, Math.floor(total));
    }

    function computeTimerElapsedSeconds(habit) {
      const st = timerStates[habit] || {};
      if (!st.isRunning || !st.startTime) return 0;
      const elapsedMs = Date.now() - st.startTime;
      return Math.max(0, Math.floor(elapsedMs / 1000));
    }

    function computeCountdownSecondsLeft(habit) {
      const cfg = timerSettings[habit] || {};
      if (!cfg.targetDate || !cfg.targetTime) return 0;
      const dt = new Date(`${cfg.targetDate}T${cfg.targetTime}:00`);
      if (isNaN(dt.getTime())) return 0;
      const diffMs = dt.getTime() - Date.now();
      return Math.max(0, Math.floor(diffMs / 1000));
    }

    function getNumericForHabit(habit, visited = new Set()) {
      if (!habit) return NaN;
      if (visited.has(habit)) return NaN;
      visited.add(habit);

      const tRaw = habitTypes[habit] || CELL_TYPES.UNIT;
      const t = (tRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : tRaw;

      if (t === CELL_TYPES.UNIT) return getUnitDisplayValue(habit);
      if (t === CELL_TYPES.VALUE) {
        const weekObj = weekData[currentWeekKey];
        return (weekObj && typeof weekObj === 'object') ? Number(weekObj[habit] || 0) : 0;
      }
      if (t === CELL_TYPES.MONEY_INCOME || t === CELL_TYPES.MONEY_BUDGET) {
        const weekObj = weekData[currentWeekKey];
        return (weekObj && typeof weekObj === 'object') ? Number(weekObj[habit] || 0) : 0;
      }
      if (t === CELL_TYPES.DURATION_SEC || t === CELL_TYPES.DURATION_SEC_COUNT) return computeDurationTotalSeconds(habit);
      if (t === CELL_TYPES.DURATION_MIN) return computeDurationTotalSeconds(habit); // unified: seconds
      if (t === CELL_TYPES.TIMER) return computeTimerElapsedSeconds(habit); // unified: seconds elapsed while running
      if (t === CELL_TYPES.COUNTDOWN) return computeCountdownSecondsLeft(habit); // unified: seconds left
      if (t === CELL_TYPES.MATH) return computeMathValue(habit, visited);

      return NaN;
    }

    function computeMathValue(habit, visited = new Set()) {
      const cfg = mathSettings[habit] || {};
      const a = cfg.a;
      const op = cfg.op || 'add';
      const bMode = cfg.bMode || 'cell';
      const bCell = cfg.b;
      const bNum = Number(cfg.bNum != null ? cfg.bNum : 1);

      const av = getNumericForHabit(a, visited);
      let bv = NaN;

      const isUnary = (op === 'pow2' || op === 'cos' || op === 'abs' || op === 'round' || op === 'floor' || op === 'ceil');
      if (isUnary) {
        bv = 0;
      } else {
        bv = (bMode === 'number') ? bNum : getNumericForHabit(bCell, visited);
      }

      if (!Number.isFinite(av) || (!isUnary && !Number.isFinite(bv))) return NaN;

      switch (op) {
        case 'add': return av + bv;
        case 'sub': return av - bv;
        case 'mul': return av * bv;
        case 'div': return bv === 0 ? NaN : (av / bv);
        case 'min': return Math.min(av, bv);
        case 'max': return Math.max(av, bv);
        case 'pow2': return av * av;
        case 'abs': return Math.abs(av);
        case 'round': return Math.round(av);
        case 'floor': return Math.floor(av);
        case 'ceil': return Math.ceil(av);
        case 'cos': return Math.cos(av);
        default: return NaN;
      }
    }



    function mathOpToHuman(op) {
      switch (op) {
        case 'add': return '+';
        case 'sub': return '−';
        case 'mul': return '×';
        case 'div': return '÷';
        case 'min': return 'min';
        case 'max': return 'max';
        case 'pow2': return 'x²';
        case 'abs': return 'abs';
        case 'round': return 'round';
        case 'floor': return 'floor';
        case 'ceil': return 'ceil';
        case 'cos': return 'cos';
        default: return op || '?';
      }
    }

    function formatMathDisplayValue(value, cfg) {
      if (!Number.isFinite(value)) return '--';

      const mode = (cfg && cfg.formatFrom) ? cfg.formatFrom : 'a';

      // Explicit formats (do not depend on A/B types)
      if (mode === 'raw') {
        const rounded = Math.round(value * 1000) / 1000;
        return String(rounded);
      }
      if (mode === 'int') return String(Math.round(value));
      if (mode === '2dp') return String(Math.round(value * 100) / 100);
      if (mode === '3dp') return String(Math.round(value * 1000) / 1000);

      if (mode === 'time_mmss') {
        const secs = Math.max(0, Math.floor(value));
        return formatDurationSec(secs).main;
      }
      if (mode === 'time_m') {
        const mins = Math.max(0, (value / 60));
        const rounded = Math.round(mins * 100) / 100;
        return formatValueWithSuffix(rounded, 'm');
      }
      if (mode === 'time_h') {
        const hrs = Math.max(0, (value / 3600));
        const rounded = Math.round(hrs * 100) / 100;
        return formatValueWithSuffix(rounded, 'h');
      }
      if (mode === 'time_s') {
        const secs = Math.max(0, Math.floor(value));
        return formatValueWithSuffix(secs, 's');
      }

      // Auto like A / Auto like B
      const refHabit = (mode === 'b') ? cfg.b : cfg.a;
      const refTypeRaw = habitTypes[refHabit] || CELL_TYPES.UNIT;
      const refType = (refTypeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : refTypeRaw;

      // Money formatting
      if (refType === CELL_TYPES.MONEY_INCOME || refType === CELL_TYPES.MONEY_BUDGET) {
        const cur = (moneySettings[refHabit] && moneySettings[refHabit].currency) ? moneySettings[refHabit].currency : '€';
        const rounded = Math.round(value * 100) / 100;
        return formatValueWithSuffix(rounded, cur);
      }

      // Time types (Math uses unified seconds)
      if (refType === CELL_TYPES.DURATION_SEC || refType === CELL_TYPES.DURATION_SEC_COUNT) {
        const secs = Math.max(0, Math.floor(value));
        return formatDurationSec(secs).main;
      }

      if (refType === CELL_TYPES.DURATION_MIN) {
        const mins = Math.max(0, Math.floor(value / 60));
        const fmt = formatDurationMin(mins);
        return formatValueWithSuffix(fmt.main, 'm');
      }

      // Timer: unified seconds elapsed while running
      if (refType === CELL_TYPES.TIMER) {
        const secs = Math.max(0, Math.floor(value));
        return formatDurationSec(secs).main;
      }

      // Countdown: unified seconds left, show hours as the "native" view
      if (refType === CELL_TYPES.COUNTDOWN) {
        const hrs = Math.max(0, Math.ceil(value / 3600));
        return formatValueWithSuffix(hrs, 'h');
      }

      // Default numeric
      const rounded = Math.round(value * 1000) / 1000;
      return String(rounded);
    }


    function buildMathBreakdown(habit) {
      const cfg = mathSettings[habit] || {};
      const a = cfg.a;
      const op = cfg.op || 'add';
      const bMode = cfg.bMode || 'cell';

      const aLabel = habitLabels[a] || a || 'A';
      const symbol = mathOpToHuman(op);

      if (op === 'pow2') return `${aLabel} ${symbol}`;
      if (op === 'cos') return `${symbol}(${aLabel})`;
      if (op === 'abs' || op === 'round' || op === 'floor' || op === 'ceil') return `${symbol}(${aLabel})`;

      if (bMode === 'number') {
        const bNum = (cfg.bNum != null) ? cfg.bNum : 1;
        return (op === 'min' || op === 'max') ? `${symbol}(${aLabel}, ${bNum})` : `${aLabel} ${symbol} ${bNum}`;
      }

      const b = cfg.b;
      const bLabel = habitLabels[b] || b || 'B';
      return (op === 'min' || op === 'max') ? `${symbol}(${aLabel}, ${bLabel})` : `${aLabel} ${symbol} ${bLabel}`;
    }

    function wouldCreateMathCycle(targetHabit) {
      const cfg = mathSettings[targetHabit] || {};
      const deps = [];
      if (cfg.a) deps.push(cfg.a);
      if (!(['pow2','cos','abs','round','floor','ceil'].includes(cfg.op)) && cfg.bMode !== 'number' && cfg.b) deps.push(cfg.b);

      const stack = new Set([targetHabit]);

      const dfs = (h) => {
        if (!h) return false;
        if (stack.has(h)) return true;
        const tRaw = habitTypes[h] || CELL_TYPES.UNIT;
        const t = (tRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : tRaw;
        if (t !== CELL_TYPES.MATH) return false;

        stack.add(h);
        const c = mathSettings[h] || {};
        const next = [];
        if (c.a) next.push(c.a);
        if (!(['pow2','cos','abs','round','floor','ceil'].includes(c.op)) && c.bMode !== 'number' && c.b) next.push(c.b);

        for (const n of next) {
          if (dfs(n)) return true;
        }
        stack.delete(h);
        return false;
      };

      for (const d of deps) {
        if (dfs(d)) return true;
      }
      return false;
    }

    function cycleMathOp(habit) {
      const cfg = mathSettings[habit] || {};
      const order = ['add', 'sub', 'mul', 'div', 'min', 'max', 'pow2', 'abs', 'round', 'floor', 'ceil', 'cos'];
      const cur = cfg.op || 'add';
      const idx = order.indexOf(cur);
      const next = order[(idx + 1 + order.length) % order.length];
      cfg.op = next;
      mathSettings[habit] = cfg;
      saveMathSettings();
      renderHabits();
    }

    function attachUnitPressHandlers(btn, habit) {
      let pressTimer = null;

      const stepOnce = () => handleUnitClick(habit);

      const startPress = (event) => {
        event.preventDefault();
        stepOnce();
        if (pressTimer) clearInterval(pressTimer);
        pressTimer = setInterval(stepOnce, 160);
      };

      const stopPress = () => {
        if (pressTimer) {
          clearInterval(pressTimer);
          pressTimer = null;
        }
      };

      btn.addEventListener('mousedown', startPress);
      btn.addEventListener('touchstart', startPress);

      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => {
        btn.addEventListener(ev, stopPress);
      });
    }



    
    function handleMoneyClick(habit, type) {
      ensureWeekExists();

      const cfg = moneySettings[habit] || {};
      const baseStep = cfg.step != null ? Math.abs(cfg.step) : 10;
      const step = baseStep === 0 ? 1 : baseStep;

      const isIncome = type === CELL_TYPES.MONEY_INCOME;

      // Базовое направление: income увеличивает, budget уменьшает
      let delta = isIncome ? step : -step;

      // В режиме DECREASE инвертируем знак
      if (decreaseMode) {
        delta = -delta;
      }

      let weekObj = weekData[currentWeekKey] || {};
      if (!weekObj || typeof weekObj !== 'object') {
        weekObj = {};
        weekData[currentWeekKey] = weekObj;
      }

      if (weekObj[habit] === undefined || weekObj[habit] === null) {
        if (!isIncome && cfg.startAmount != null) {
          weekObj[habit] = Number(cfg.startAmount) || 0;
        } else {
          weekObj[habit] = 0;
        }
      }

      const previousValue = Number(weekObj[habit]) || 0;
      let next = (Number(weekObj[habit]) || 0) + delta;

      // Для бюджета не даем уйти в минус
      if (!isIncome && next < 0) next = 0;

      weekObj[habit] = next;
      recordCounterChange(habit, previousValue, next, null, null, 'money');

      saveWeekData();
      saveCounterChangeLog();
      updateMoneyCellDisplay(habit, type);
      scheduleMathRefresh();
      animateButton(habit);
    }
function attachMoneyPressHandlers(btn, habit, type) {
      let pressTimer = null;

      const stepOnce = () => handleMoneyClick(habit, type);

      const startPress = (event) => {
        event.preventDefault();
        stepOnce();
        if (pressTimer) clearInterval(pressTimer);
        pressTimer = setInterval(stepOnce, 160);
      };

      const stopPress = () => {
        if (pressTimer) {
          clearInterval(pressTimer);
          pressTimer = null;
        }
      };

      btn.addEventListener('mousedown', startPress);
      btn.addEventListener('touchstart', startPress);

      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => {
        btn.addEventListener(ev, stopPress);
      });
    }


function handleDurationClick(habit, type) {
      const state = durationStates[habit] || { startTime: null, isRunning: false, accumulated: 0, lastSession: 0 };

      if (decreaseMode) {
        durationStates[habit] = { startTime: null, isRunning: false, accumulated: 0, lastSession: 0 };
        saveDurationStates();
        renderHabits();
        animateButton(habit);
        return;
      }

      if (!state.isRunning) {
        const now = Date.now();
        durationStates[habit] = {
          startTime: now,
          isRunning: true,
          accumulated: state.accumulated || 0,
          lastSession: 0
        };
        startGlobalInterval();
      } else {
        const elapsed = Math.max(0, Math.floor((Date.now() - state.startTime) / 1000));
        const newAccumulated = (state.accumulated || 0) + elapsed;

        const nextState = {
          startTime: null,
          isRunning: false,
          accumulated: newAccumulated
        };

        // For second-based duration, remember the last session length
        if (type === CELL_TYPES.DURATION_SEC) {
          nextState.lastSession = elapsed;
        }

        durationStates[habit] = nextState;

        ensureWeekExists();
        if (type === CELL_TYPES.DURATION_MIN) {
          weekData[currentWeekKey][habit] = Math.floor(newAccumulated / 60);
        } else {
          weekData[currentWeekKey][habit] = newAccumulated;
        }
        saveWeekData();
      }

      saveDurationStates();
      renderHabits();
      animateButton(habit);
    }

    function handleTimerClick(habit) {
      const state = timerStates[habit] || { isRunning: false, startTime: null, remaining: null, iterations: 0 };
      const settings = timerSettings[habit] || { duration: 20 };

      if (decreaseMode) {
        // Reset iterations
        timerStates[habit] = { isRunning: false, startTime: null, remaining: null, iterations: 0 };
        saveTimerStates();
        renderHabits();
        animateButton(habit);
        return;
      }

      if (!state.isRunning) {
        // Start timer
        const durationMs = (settings.duration || 20) * 60 * 1000;
        timerStates[habit] = {
          isRunning: true,
          startTime: Date.now(),
          remaining: state.remaining !== null ? state.remaining : durationMs,
          iterations: state.iterations || 0
        };
        startGlobalInterval();
      } else {
        // Pause/Stop timer - return to original time
        const durationMs = (settings.duration || 20) * 60 * 1000;
        timerStates[habit] = {
          isRunning: false,
          startTime: null,
          remaining: durationMs,
          iterations: state.iterations || 0
        };
      }

      saveTimerStates();
      renderHabits();
      animateButton(habit);
    }

    function handleCountdownClick(habit) {
      // If countdown expired and pulsing - stop pulsing and reset notification flag,
      // и в любом случае даём визуальный отклик на клик
      const settings = timerSettings[habit] || {};
      if (settings.targetDate) {
        const targetDateTime = new Date(`${settings.targetDate}T${settings.targetTime || '12:00'}`);
        const now = new Date();
        const diff = targetDateTime - now;

        if (diff <= 0) {
          // Stop pulsing
          const btn = document.getElementById(`btn-${habit}`);
          if (btn) btn.classList.remove('pulsing');

          // Reset notification flag so it can be sent again if needed
          const state = timerStates[habit] || {};
          timerStates[habit] = { ...state, notificationSent: false };
          saveTimerStates();
        }
      }

      // Лёгкий клик-фидбек по аналогии с другими слотами
      animateButton(habit);
    }

    // ===== LED PULSE HANDLERS =====
    function bpmToMs(bpm) {
      return Math.round(60000 / bpm);
    }

    function handleLedClick(habit) {
      const settings = ledSettings[habit] || { bpm: 60 };
      const state = ledStates[habit] || { isActive: false };
      
      // Toggle on/off
      if (state.isActive) {
        stopLedPulse(habit);
        ledStates[habit] = { isActive: false };
      } else {
        startLedPulse(habit, settings);
        ledStates[habit] = { isActive: true };
      }
      saveLedStates();
      animateButton(habit);
    }

    function startLedPulse(habit, settings) {
      stopLedPulse(habit);
      
      const btn = document.getElementById(`btn-${habit}`);
      if (!btn) return;
      
      const intervalMs = bpmToMs(settings.bpm || 60);
      const halfBeat = intervalMs / 2;
      
      let isOn = true;
      btn.classList.add('led-on');
      btn.classList.remove('led-off');
      
      const doPulse = () => {
        const currentBtn = document.getElementById(`btn-${habit}`);
        if (!currentBtn || !ledIntervals[habit]) return;
        
        if (isOn) {
          currentBtn.classList.remove('led-on');
          currentBtn.classList.add('led-off');
          isOn = false;
        } else {
          currentBtn.classList.add('led-on');
          currentBtn.classList.remove('led-off');
          isOn = true;
        }
        ledIntervals[habit] = setTimeout(doPulse, halfBeat);
      };
      
      ledIntervals[habit] = setTimeout(doPulse, halfBeat);
    }

    function stopLedPulse(habit) {
      if (ledIntervals[habit]) {
        clearTimeout(ledIntervals[habit]);
        delete ledIntervals[habit];
      }
      
      const btn = document.getElementById(`btn-${habit}`);
      if (btn) {
        btn.classList.remove('led-on');
        btn.classList.add('led-off');
      }
    }

    function stopAllLedPulses() {
      Object.keys(ledIntervals).forEach(habit => stopLedPulse(habit));
    }


    // Timer notification messages
    function getTimerNotificationMessage(iterations, duration, customMessage) {
      if (customMessage && customMessage.trim()) {
        return customMessage;
      }

      const messages = [
        `Timer complete • ${duration}min`,
        `Session 2 finished • ${duration}min`,
        `Round 3 done • ${duration}min`,
        `Cycle 4 complete • ${duration}min`,
        `Phase 5 finished • ${duration}min`
      ];

      if (iterations === 0) return messages[0];
      if (iterations === 1) return messages[1];
      if (iterations === 2) return messages[2];
      if (iterations === 3) return messages[3];
      if (iterations === 4) return messages[4];
      return `Session ${iterations + 1} complete • ${duration}min`;
    }

    // Request notification permission
    function requestNotificationPermission() {
      if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        return;
      }
      
      if (Notification.permission === 'granted') {
        alert('Notifications already enabled!');
        new Notification('TRCKNG SSTM', {
          body: 'Notifications are working!',
          icon: '/TRCKNG-SSTM/icons/icon-192.png'
        });
        return;
      }
      
      if (Notification.permission === 'denied') {
        alert('Notifications blocked. Enable in browser settings.');
        return;
      }
      
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          alert('Notifications enabled!');
          new Notification('TRCKNG SSTM', {
            body: 'Notifications are now active',
            icon: '/TRCKNG-SSTM/icons/icon-192.png'
          });
        } else {
          alert('Notifications denied');
        }
      });
    }

    function sendTimerNotification(habit) {
      const settings = timerSettings[habit] || {};
      const state = timerStates[habit] || {};
      const label = habitLabels[habit] || 'Timer';
      
      const message = getTimerNotificationMessage(
        state.iterations || 0,
        settings.duration || 20,
        settings.message
      );

      // Play sound with defaults
      const soundType = settings.sound || 'soft_chime';
      const volume = typeof settings.volume === 'number' ? settings.volume : 50;
      if (volume > 0) {
        playNotificationSound(soundType, volume);
      }

      // Vibrate
      if (settings.vibrate && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification(`${label}`, {
          body: message,
          icon: '/TRCKNG-SSTM/icons/icon-192.png',
          tag: `timer-${habit}`
        });
      }
    }

    function sendCountdownNotification(habit) {
      const settings = timerSettings[habit] || {};
      const label = habitLabels[habit] || 'Countdown';
      
      // Default message or custom message
      const message = settings.message && settings.message.trim() 
        ? settings.message 
        : 'Time is up!';

      // Play sound with defaults
      const soundType = settings.sound || 'soft_chime';
      const volume = typeof settings.volume === 'number' ? settings.volume : 50;
      if (volume > 0) {
        playNotificationSound(soundType, volume);
      }

      // Vibrate
      if (settings.vibrate && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification(`${label}`, {
          body: message,
          icon: '/TRCKNG-SSTM/icons/icon-192.png',
          tag: `countdown-${habit}`
        });
      }
    }

    function animateButton(habit) {
      const btn = document.getElementById(`btn-${habit}`);
      if (!btn) return;
      
      const animColor = getAnimationColor(habit);
      btn.style.setProperty('--btn-color', animColor);
      
      btn.classList.remove('animating');
      void btn.offsetWidth;
      btn.classList.add('animating');
      setTimeout(() => btn.classList.remove('animating'), 1500);
    }

    // ===== COMPUTED CELLS LIVE REFRESH (Math) =====
let _mathRefreshScheduled = false;

function updateAllMathDisplays() {
  HABITS.forEach(habit => {
    const label = habitLabels[habit];
    if (!label || !label.trim()) return;

    const typeRaw = habitTypes[habit] || CELL_TYPES.UNIT;
    const type = (typeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : typeRaw;
    if (type !== CELL_TYPES.MATH) return;

    const cfg = mathSettings[habit] || {};
    const val = computeMathValue(habit, new Set());

    const valueEl = document.getElementById(`value-${habit}`);
    const breakdownEl = document.getElementById(`breakdown-${habit}`);
    if (valueEl) valueEl.innerHTML = formatMathDisplayValue(val, cfg);
    if (breakdownEl) breakdownEl.textContent = buildMathBreakdown(habit);
  });
}

function scheduleMathRefresh() {
  if (_mathRefreshScheduled) return;
  _mathRefreshScheduled = true;
  requestAnimationFrame(() => {
    _mathRefreshScheduled = false;
    updateAllMathDisplays();
  });
}

    // ===== INTERVAL =====
    function startGlobalInterval() {
      if (globalInterval) return;
      globalInterval = setInterval(updateLiveDisplays, 1000);
    }

    function stopGlobalIntervalIfNeeded() {
      // Always keep interval running for "X ago" updates on counters
      // So we never stop it anymore
    }
    
    function startGlobalIntervalIfNeeded() {
      // Always start - we need it for counter "X ago" updates
      if (!globalInterval) {
        startGlobalInterval();
      }
    }

    function updateLiveDisplays() {
      HABITS.forEach(habit => {
        const type = habitTypes[habit];

        // Live update for simple counters: "X ago" label
        if (type === CELL_TYPES.COUNTER || type === CELL_TYPES.UNIT) {
          const breakdownEl = document.getElementById(`breakdown-${habit}`);
          if (breakdownEl) {
            const description = habitDescriptions[habit] || '';
            const lastUpdateLabel = getCellFlag(habit, 'showLastUpdate') ? formatCounterLastUpdate(habit) : '';
            breakdownEl.textContent = lastUpdateLabel || description;
          }
        }

        // Handle duration types
        const state = durationStates[habit];
        if (state?.isRunning) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const total = (state.accumulated || 0) + elapsed;

          const valueEl = document.getElementById(`value-${habit}`);
          const breakdownEl = document.getElementById(`breakdown-${habit}`);
          const description = habitDescriptions[habit];

          // Calculate progress for animated border (0-100% over 60 seconds)
          const secondsInMinute = total % 60;
          const progress = ((60 - secondsInMinute) / 60) * 100;
          const btn = document.getElementById(`btn-${habit}`);
          if (btn) {
            btn.style.setProperty('--progress', progress);
          }

          if (type === CELL_TYPES.DURATION_SEC) {
            // Live update: main value shows current session, breakdown shows total
            const sessionSeconds = elapsed;
            const fmtSession = formatDurationSec(sessionSeconds);
            if (valueEl) valueEl.innerHTML = formatValueWithSuffix(fmtSession.main, 's');

            const fmtTotal = formatDurationSec(total);
            if (breakdownEl) breakdownEl.textContent = description || fmtTotal.breakdown;
          } else if (type === CELL_TYPES.DURATION_MIN) {
            const totalMin = Math.floor(total / 60);
            const fmt = formatDurationMin(totalMin, total);
            if (valueEl) valueEl.innerHTML = formatValueWithSuffix(fmt.main, 'm');
            if (breakdownEl) breakdownEl.textContent = description || fmt.breakdown;
          } else if (type === CELL_TYPES.DURATION_SEC_COUNT) {
            const fmt = formatDurationSec(total);
            if (valueEl) valueEl.innerHTML = formatValueWithSuffix(total, 's');
            if (breakdownEl) breakdownEl.textContent = description || fmt.breakdown;
          }
        }

        // Handle Timer
        const timerState = timerStates[habit];
        if (type === CELL_TYPES.TIMER && timerState?.isRunning) {
          const elapsed = Date.now() - timerState.startTime;
          const remaining = Math.max(0, timerState.remaining - elapsed);
          
          const valueEl = document.getElementById(`value-${habit}`);
          const breakdownEl = document.getElementById(`breakdown-${habit}`);
          
          if (remaining <= 0) {
            // Timer finished - trigger notification and restart
            const settings = timerSettings[habit] || {};
            const newCycles = (timerState.iterations || 0) + 1;
            
            sendTimerNotification(habit);
            
            // Auto-restart
            const durationMs = (settings.duration || 20) * 60 * 1000;
            timerStates[habit] = {
              isRunning: true,
              startTime: Date.now(),
              remaining: durationMs,
              iterations: newCycles
            };
            saveTimerStates();
            renderHabits(); // Re-render to show new iteration count
          } else {
            // Update display
            const seconds = Math.floor(remaining / 1000);
            const settings = timerSettings[habit] || {};
            
            // Calculate progress for animated border (0-100% over 60 seconds)
            const secondsInMinute = seconds % 60;
            const progress = ((60 - secondsInMinute) / 60) * 100;
            const btn = document.getElementById(`btn-${habit}`);
            if (btn) {
              btn.style.setProperty('--progress', progress);
            }
            
            if (settings.format === 'mm') {
              const minutes = Math.ceil(seconds / 60);
              if (valueEl) valueEl.innerHTML = formatValueWithSuffix(minutes, 'm');
            } else {
              const m = Math.floor(seconds / 60);
              const s = seconds % 60;
              if (valueEl) valueEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
            
            if (breakdownEl) {
              breakdownEl.textContent = `timer cycles ${(timerState.iterations || 0) + 1}`;
            }
          }
        }

        // Handle Countdown
        if (type === CELL_TYPES.COUNTDOWN) {
          const settings = timerSettings[habit];
          if (settings?.targetDate) {
            const targetDateTime = new Date(`${settings.targetDate}T${settings.targetTime || '12:00'}`);
            const now = new Date();
            const diff = targetDateTime - now;
            
            const valueEl = document.getElementById(`value-${habit}`);
            const breakdownEl = document.getElementById(`breakdown-${habit}`);
            
            // Check if we need to send notification
            const state = timerStates[habit] || {};
            
            if (diff <= 0) {
              // Expired - show pulsing 00:00
              if (valueEl) {
                valueEl.textContent = '00:00';
                valueEl.closest('.btn-habit')?.classList.add('pulsing');
              }
              if (breakdownEl) breakdownEl.textContent = '0d 0h 0m';
              
              // Send notification only once
              if (!state.notificationSent) {
                sendCountdownNotification(habit);
                timerStates[habit] = { ...state, notificationSent: true };
                saveTimerStates();
              }
            } else {
              // Still counting down - reset notification flag if it was set
              if (state.notificationSent) {
                timerStates[habit] = { ...state, notificationSent: false };
                saveTimerStates();
              }
              
              // Calculate remaining time
              const totalMinutes = Math.floor(diff / (1000 * 60));
              const totalSeconds = Math.floor(diff / 1000);
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = totalSeconds % 60;
              
              const btn = document.getElementById(`btn-${habit}`);
              if (btn) {
                // Thin line synced with current hour: full rotation every 60 minutes, counter-clockwise
                const nowClock = new Date();
                const minuteOfHour = nowClock.getMinutes() + nowClock.getSeconds() / 60;
                const angle = -90 - 360 * (minuteOfHour / 60);
                btn.style.setProperty('--progress-angle', `${angle}deg`);

                // Hourly flash once when a new hour boundary of the countdown is reached
                const minutesLeftInHour = totalMinutes % 60;
                const lastPing = btn.dataset.lastPingMinute ? parseInt(btn.dataset.lastPingMinute, 10) : null;

                if (minutesLeftInHour === 59 && lastPing !== totalMinutes) {
                  btn.classList.add('hour-ping');
                  setTimeout(() => btn.classList.remove('hour-ping'), 900);
                  btn.dataset.lastPingMinute = String(totalMinutes);
                } else if (minutesLeftInHour !== 59 && btn.dataset.lastPingMinute) {
                  delete btn.dataset.lastPingMinute;
                }
              }
              
              if (valueEl) valueEl.innerHTML = formatValueWithSuffix(totalMinutes, 'm');
              if (breakdownEl) breakdownEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            }
          }
        }
      });

      // Ensure Math cells stay in sync with changing sources (timers/durations/countdown)
      scheduleMathRefresh();
    }

    // ===== RENDER =====
    function renderLayoutEditor() {
      const grid = document.getElementById('layoutGrid');
      if (!grid) return;

      const renderCells = getOrderedLayoutCells();
      grid.innerHTML = '';
      grid.dataset.layout = 'cell-layout-editor';
      grid.dataset.pin = String(currentPin);
      grid.style.setProperty('--layout-columns', String(getLayoutColumnCount(renderCells)));

      const title = document.getElementById('layoutTitle');
      if (title) title.textContent = getCurrentPinName();

      const meta = document.getElementById('layoutMeta');
      if (meta) {
        const activeCount = renderCells.filter(cell => cell.label.trim()).length;
        meta.textContent = `${renderCells.length} cells / ${activeCount} active`;
      }

      renderCells.forEach((cell, index) => {
        const habit = cell.id;
        const cellNum = String(cell.slot).padStart(2, '0');
        const size = `${cell.layout.colSpan}x${cell.layout.rowSpan}`;
        const label = cell.label.trim() || 'EMPTY';
        const isEmpty = !cell.label.trim();
        const color = cell.color || habitColors[habit] || '#ffffff';

        const tile = document.createElement('div');
        tile.className = 'layout-cell';
        tile.id = `layout-${habit}`;
        tile.dataset.cellId = habit;
        tile.dataset.type = cell.type;
        tile.dataset.empty = String(isEmpty);
        tile.style.setProperty('--btn-color', color);
        applyCellLayoutToElement(tile, cell.layout);
        tile.addEventListener('click', event => {
          if (event.target.closest('button')) return;
          openCellEditModal(habit, cell.slot - 1);
        });

        const metaEl = document.createElement('div');
        metaEl.className = 'layout-cell-meta';
        metaEl.textContent = `CELL ${cellNum} - ${size} - #${index + 1}`;

        const nameEl = document.createElement('div');
        nameEl.className = 'layout-cell-name';
        nameEl.textContent = label;

        const typeEl = document.createElement('div');
        typeEl.className = 'layout-cell-type';
        typeEl.textContent = (cell.type || CELL_TYPES.UNIT).replace(/_/g, ' ');

        const actions = document.createElement('div');
        actions.className = 'layout-cell-actions';

        const upBtn = document.createElement('button');
        upBtn.className = 'layout-action';
        upBtn.type = 'button';
        upBtn.textContent = 'UP';
        upBtn.disabled = index === 0;
        upBtn.addEventListener('click', () => moveCellInLayout(habit, -1));

        const editBtn = document.createElement('button');
        editBtn.className = 'layout-action';
        editBtn.type = 'button';
        editBtn.textContent = isEmpty ? 'CREATE' : 'EDIT';
        editBtn.addEventListener('click', () => openCellEditModal(habit, cell.slot - 1));

        const downBtn = document.createElement('button');
        downBtn.className = 'layout-action';
        downBtn.type = 'button';
        downBtn.textContent = 'DOWN';
        downBtn.disabled = index === renderCells.length - 1;
        downBtn.addEventListener('click', () => moveCellInLayout(habit, 1));

        actions.appendChild(upBtn);
        actions.appendChild(editBtn);
        actions.appendChild(downBtn);

        tile.appendChild(metaEl);
        tile.appendChild(nameEl);
        tile.appendChild(typeEl);
        tile.appendChild(actions);
        grid.appendChild(tile);
      });
    }

    function renderHabits() {
      const grid = document.getElementById('habitsGrid');
      grid.innerHTML = '';
      const renderCells = getRenderableCells();
      grid.dataset.layout = 'cell-layout';
      grid.style.setProperty('--layout-columns', String(getLayoutColumnCount(renderCells)));

      renderCells.forEach(cell => {
        const habit = cell.id;
        const label = cell.label;
        const isActive = label?.trim();
        const typeRaw = cell.type || habitTypes[habit] || CELL_TYPES.UNIT;
      const type = (typeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : typeRaw;
        const color = cell.color || habitColors[habit] || '#ffffff';
        const state = durationStates[habit] || {};

        const btn = document.createElement('button');
        btn.className = 'btn-habit';
        btn.id = `btn-${habit}`;
        btn.dataset.cellId = habit;
        btn.dataset.type = type.toLowerCase();
        applyCellLayoutToElement(btn, cell.layout);

        if (!isActive) {
          btn.classList.add('inactive', 'empty-field-cell');
          btn.title = 'Empty cell';
          btn.setAttribute('aria-label', `Empty cell ${cell.slot}`);
          grid.appendChild(btn);
          return;
        }

        let btnColor = color;
        if (!btnColor || btnColor === '#ffffff') {
          if (type === CELL_TYPES.DURATION_SEC) btnColor = '#35f2a3';
          else if (type === CELL_TYPES.DURATION_MIN) btnColor = '#ff8c42';
          else if (type === CELL_TYPES.DURATION_SEC_COUNT) btnColor = '#6b9dff';
        }
        btn.style.setProperty('--btn-color', btnColor);

        if (type === CELL_TYPES.COUNTER || type === CELL_TYPES.UNIT) {
          const value = getUnitDisplayValue(habit);
          const description = habitDescriptions[habit] || '';
          const lastUpdateLabel = getCellFlag(habit, 'showLastUpdate') ? formatCounterLastUpdate(habit) : '';
          const breakdown = lastUpdateLabel || description;
          btn.innerHTML = `
            <span class="btn-label">${label}</span>
            <span class="btn-value" id="value-${habit}">${value}</span>
            <span class="btn-breakdown" id="breakdown-${habit}">${breakdown}</span>
          `;

        } else if (type === CELL_TYPES.VALUE) {
          const displayMain = getValueDisplay(habit);
          const description = habitDescriptions[habit] || '';
          btn.innerHTML = `
            <span class="btn-label">${label}</span>
            <span class="btn-value" id="value-${habit}">${displayMain}</span>
            <span class="btn-breakdown" id="breakdown-${habit}">${description}</span>
          `;
        } else if (type === CELL_TYPES.MATH) {
          const cfg = mathSettings[habit] || {};
          const val = computeMathValue(habit, new Set());
          const displayMain = formatMathDisplayValue(val, cfg);
          const breakdown = buildMathBreakdown(habit);
          btn.innerHTML = `
            <span class="btn-label">${label}</span>
            <span class="btn-value" id="value-${habit}">${displayMain}</span>
            <span class="btn-breakdown" id="breakdown-${habit}">${breakdown}</span>
          `;

        } else if (type === CELL_TYPES.MONEY_INCOME || type === CELL_TYPES.MONEY_BUDGET) {
          let weekObj = weekData[currentWeekKey];
          const cfg = moneySettings[habit] || {};
          const currency = cfg.currency || '€';
          const isIncome = type === CELL_TYPES.MONEY_INCOME;
          const description = habitDescriptions[habit] || '';

          let value = 0;

          // Ensure current week object exists so we can store values
          if (!weekObj || typeof weekObj !== 'object') {
            ensureWeekExists();
            weekObj = weekData[currentWeekKey];
          }

          if (weekObj && typeof weekObj === 'object') {
            if (weekObj[habit] == null) {
              if (!isIncome && cfg.startAmount != null) {
                value = cfg.startAmount;
                weekObj[habit] = value;
                saveWeekData();
              } else {
                value = 0;
              }
            } else {
              value = weekObj[habit] || 0;
            }
          } else {
            // Fallback, should not normally happen
            value = !isIncome && cfg.startAmount != null ? cfg.startAmount : 0;
          }

          const displayMain = formatValueWithSuffix(value, currency);
          const parts = [];
          parts.push(currency);
          if (description) parts.push(description);
          const breakdown = parts.join(' · ');

          btn.innerHTML = `
            <span class="btn-label">${label}</span>
            <span class="btn-value" id="value-${habit}">${displayMain}</span>
            <span class="btn-breakdown" id="breakdown-${habit}">${breakdown}</span>
          `;
        } else if (type === CELL_TYPES.TIMER) {
          const timerState = timerStates[habit] || {};
          const settings = timerSettings[habit] || { duration: 20, format: 'mm:ss' };
          const isRunning = timerState.isRunning;
          
          let displayValue = '00:00';
          if (isRunning && timerState.startTime && timerState.remaining) {
            const elapsed = Date.now() - timerState.startTime;
            const remaining = Math.max(0, timerState.remaining - elapsed);
            const seconds = Math.floor(remaining / 1000);
            
            if (settings.format === 'mm') {
              const minutes = Math.ceil(seconds / 60);
              displayValue = formatValueWithSuffix(minutes, 'm');
            } else {
              const m = Math.floor(seconds / 60);
              const s = seconds % 60;
              displayValue = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
          } else {
            // Stopped state - show original duration
            if (settings.format === 'mm') {
              displayValue = formatValueWithSuffix(settings.duration, 'm');
            } else {
              const m = settings.duration;
              displayValue = `${String(m).padStart(2, '0')}:00`;
            }
          }

          if (settings.format !== 'mm') {
            displayValue = formatValueWithSuffix(displayValue, 's');
          }

          const breakdown = `timer cycles ${(timerState.iterations || 0) + 1}`;

          btn.innerHTML = `
            <span class="btn-label">${label}</span>
            <span class="btn-value" id="value-${habit}">${displayValue}</span>
            <span class="btn-breakdown" id="breakdown-${habit}">${breakdown}</span>
          `;
                    if (isRunning) {
            btn.classList.add('running');
            // Set initial progress
            if (timerState.startTime && timerState.remaining) {
              const elapsed = Date.now() - timerState.startTime;
              const remaining = Math.max(0, timerState.remaining - elapsed);
              const seconds = Math.floor(remaining / 1000);
              const secondsInMinute = seconds % 60;
              const progress = ((60 - secondsInMinute) / 60) * 100;
              btn.style.setProperty('--progress', progress);
            }
          }
        } else if (type === CELL_TYPES.COUNTDOWN) {
          const settings = timerSettings[habit] || {};
          let displayValue = '--:--';
          let breakdown = '-- -- --';
          
          if (settings.targetDate) {
            const targetDateTime = new Date(`${settings.targetDate}T${settings.targetTime || '12:00'}`);
            const now = new Date();
            const diff = targetDateTime - now;
            
            if (diff <= 0) {
              displayValue = '00:00';
              breakdown = '0d 0h 0m 0s';
              btn.classList.add('pulsing');
            } else {
              const totalMinutes = Math.floor(diff / (1000 * 60));
              const totalSeconds = Math.floor(diff / 1000);
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = totalSeconds % 60;

              displayValue = formatValueWithSuffix(totalMinutes, 'm');
              breakdown = `${days}d ${hours}h ${minutes}m ${seconds}s`;

              // Mark as running
              btn.classList.add('running');

              // Set initial orientation of the thin line based on current clock minute
              const nowClock = new Date();
              const minuteOfHour = nowClock.getMinutes() + nowClock.getSeconds() / 60;
              const angle = -90 - 360 * (minuteOfHour / 60);
              btn.style.setProperty('--progress-angle', `${angle}deg`);
            }
          }

          const labelText = label ? `until ${label}` : 'until';

          btn.innerHTML = `
            <span class="btn-label">${labelText}</span>
            <span class="btn-value" id="value-${habit}">${displayValue}</span>
            <span class="btn-breakdown" id="breakdown-${habit}">${breakdown}</span>
          `;
        } else if (type === CELL_TYPES.LED_PULSE) {
          // LED Pulse cell
          const settings = ledSettings[habit] || { bpm: 60 };
          const ledState = ledStates[habit] || { isActive: false };
          
          const bpm = settings.bpm || 60;
          const seconds = (60 / bpm).toFixed(1);
          
          btn.innerHTML = `
            <span class="btn-label">${label}</span>
            <span class="btn-value" id="value-${habit}"></span>
            <span class="btn-breakdown" id="breakdown-${habit}">${bpm} bpm / ${seconds}s</span>
          `;
          
          // Start pulse if active
          if (ledState.isActive) {
            startLedPulse(habit, settings);
          } else {
            btn.classList.add('led-off');
          }
        } else if (type === CELL_TYPES.CURRENCY) {
          // Currency exchange rate cell
          const settings = currencySettings[habit] || { from: 'USD', to: 'RUB', amount: 1 };
          const from = (settings.from || 'USD').toUpperCase();
          const to = (settings.to || 'RUB').toUpperCase();
          const amount = settings.amount || 1;
          
          btn.innerHTML = `
            <span class="btn-label">${label || to}</span>
            <span class="btn-value" id="value-${habit}">...</span>
            <span class="btn-breakdown" id="breakdown-${habit}">loading</span>
          `;
          
          // Fetch and display rate
          fetchExchangeRate(from, to).then(rate => {
            const valueEl = document.getElementById(`value-${habit}`);
            const breakdownEl = document.getElementById(`breakdown-${habit}`);
            if (rate !== null) {
              const converted = (amount * rate).toFixed(2);
              if (valueEl) valueEl.textContent = converted;
              if (amount === 1) {
                if (breakdownEl) breakdownEl.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;
              } else {
                if (breakdownEl) breakdownEl.textContent = `${amount} ${from} → ${to}`;
              }
              // Store rate for math calculations
              if (!weekData[currentWeekKey]) weekData[currentWeekKey] = {};
              weekData[currentWeekKey][habit] = rate;
            } else {
              if (valueEl) valueEl.textContent = '—';
              if (breakdownEl) breakdownEl.textContent = 'no data';
            }
          });
        } else {
          // Duration types (DURATION_SEC, DURATION_MIN, DURATION_SEC_COUNT)
          const isRunning = state.isRunning;
          const accumulated = state.accumulated || 0;
          let total = accumulated;
          let runtimeSeconds = 0;

          if (isRunning && state.startTime) {
            runtimeSeconds = Math.floor((Date.now() - state.startTime) / 1000);
            total += runtimeSeconds;
          }

          let displayValue;
          let breakdown;

          if (type === CELL_TYPES.DURATION_SEC) {
            // Show current session length as main value
            const sessionSeconds = (isRunning && state.startTime)
              ? runtimeSeconds
              : (state.lastSession || 0);

            const fmtSession = formatDurationSec(sessionSeconds);
            displayValue = formatValueWithSuffix(fmtSession.main, 's');

            // Breakdown shows total accumulated time
            const fmtTotal = formatDurationSec(total);
            breakdown = fmtTotal.breakdown;
          } else if (type === CELL_TYPES.DURATION_MIN) {
            const totalMin = Math.floor(total / 60);
            const fmt = formatDurationMin(totalMin, total);
            displayValue = formatValueWithSuffix(fmt.main, 'm');
            breakdown = fmt.breakdown;
          } else if (type === CELL_TYPES.DURATION_SEC_COUNT) {
            const fmt = formatDurationSec(total);
            displayValue = formatValueWithSuffix(total, 's');
            breakdown = fmt.breakdown;
          }

          const description = habitDescriptions[habit] || breakdown;

          btn.innerHTML = `
            <span class="btn-label">${label}</span>
            <span class="btn-value" id="value-${habit}">${displayValue}</span>
            <span class="btn-breakdown" id="breakdown-${habit}">${description}</span>
          `;

          if (isRunning) {
            btn.classList.add('running');
            // Set initial progress
            const secondsInMinute = total % 60;
            const progress = ((60 - secondsInMinute) / 60) * 100;
            btn.style.setProperty('--progress', progress);
          }
        }

        if (type === CELL_TYPES.MONEY_INCOME || type === CELL_TYPES.MONEY_BUDGET) {
          attachMoneyPressHandlers(btn, habit, type);
        } else if (type === CELL_TYPES.UNIT || type === CELL_TYPES.COUNTER) {
          attachUnitPressHandlers(btn, habit);
        } else {
          btn.addEventListener('click', () => handleHabitClick(habit));
        }
        grid.appendChild(btn);
      });

      const hasRunning = Object.values(durationStates).some(s => s.isRunning) ||
                         Object.values(timerStates).some(s => s.isRunning) ||
                         HABITS.some(h => habitTypes[h] === CELL_TYPES.COUNTDOWN);
      if (hasRunning) startGlobalInterval();
      else stopGlobalIntervalIfNeeded();

      updateStats();
      scheduleMathRefresh();
    }

    function updateCellDisplay(habit) {
      const typeRaw = habitTypes[habit] || CELL_TYPES.UNIT;
      const type = (typeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : typeRaw;
      if (type !== CELL_TYPES.COUNTER && type !== CELL_TYPES.UNIT) return;

      const valueEl = document.getElementById(`value-${habit}`);
      if (valueEl) {
        const value = getUnitDisplayValue(habit);
        valueEl.textContent = value;
      }

      const breakdownEl = document.getElementById(`breakdown-${habit}`);
      if (breakdownEl) {
        const description = habitDescriptions[habit] || '';
        const lastUpdateLabel = getCellFlag(habit, 'showLastUpdate') ? formatCounterLastUpdate(habit) : '';
        breakdownEl.textContent = lastUpdateLabel || description;
      }      scheduleMathRefresh();


      updateStats();
    }


    function updateMoneyCellDisplay(habit, type) {
      const valueEl = document.getElementById(`value-${habit}`);
      const breakdownEl = document.getElementById(`breakdown-${habit}`);

      const cfg = moneySettings[habit] || {};
      const currency = cfg.currency || '€';
      const isIncome = type === CELL_TYPES.MONEY_INCOME;
      const description = habitDescriptions[habit] || '';
      const baseStep = cfg.step != null ? Math.abs(cfg.step) : 10;
      const step = baseStep === 0 ? 1 : baseStep;

      let rawValue = 0;
      const weekObj = weekData[currentWeekKey];

      if (weekObj && typeof weekObj === 'object') {
        const stored = weekObj[habit];

        if (stored == null) {
          if (!isIncome && cfg.startAmount != null) {
            const startAmount = Number(cfg.startAmount) || 0;
            rawValue = startAmount;
            weekObj[habit] = rawValue;
            saveWeekData();
          } else {
            rawValue = 0;
          }
        } else {
          rawValue = Number(stored) || 0;
        }
      }

      if (valueEl) {
        valueEl.innerHTML = formatValueWithSuffix(rawValue, currency);
      }

      if (breakdownEl) {
        const parts = [];
        if (step) {
          const sign = isIncome ? '+' : '−';
          if (currency) {
            parts.push(`${sign}${step} ${currency}`);
          } else {
            parts.push(`${sign}${step}`);
          }
        } else if (currency) {
          parts.push(currency);
        }
        if (description) parts.push(description);
        breakdownEl.textContent = parts.join(' · ');
      }

      updateStats();
    }
// ===== HEADER =====
    let sunData = null; // {sunrise: Date, sunset: Date}
    
    async function fetchSunData() {
      // Try to get user's location
      if (!navigator.geolocation) return;
      
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        // Fetch sunrise/sunset from free API
        const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`);
        const data = await response.json();
        
        if (data.status === 'OK') {
          sunData = {
            sunrise: new Date(data.results.sunrise),
            sunset: new Date(data.results.sunset)
          };
          updateSunMarkers();
        }
      } catch (e) {
        console.log('Sun data not available:', e.message);
      }
    }
    
    function updateSunMarkers() {
      if (!sunData) return;
      
      const dayStrip = document.getElementById('dayStrip');
      if (!dayStrip) return;
      
      // Remove old markers
      dayStrip.querySelectorAll('.sun-marker').forEach(m => m.remove());
      
      // Calculate positions (% of day)
      const sunriseMinutes = sunData.sunrise.getHours() * 60 + sunData.sunrise.getMinutes();
      const sunsetMinutes = sunData.sunset.getHours() * 60 + sunData.sunset.getMinutes();
      
      const sunrisePercent = (sunriseMinutes / (24 * 60)) * 100;
      const sunsetPercent = (sunsetMinutes / (24 * 60)) * 100;
      
      // Format times
      const sunriseTime = sunData.sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const sunsetTime = sunData.sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      // Create markers
      const sunriseMarker = document.createElement('div');
      sunriseMarker.className = 'sun-marker sunrise';
      sunriseMarker.style.left = `${sunrisePercent}%`;
      sunriseMarker.dataset.label = sunriseTime;
      
      const sunsetMarker = document.createElement('div');
      sunsetMarker.className = 'sun-marker sunset';
      sunsetMarker.style.left = `${sunsetPercent}%`;
      sunsetMarker.dataset.label = sunsetTime;
      
      dayStrip.appendChild(sunriseMarker);
      dayStrip.appendChild(sunsetMarker);
    }

    function updateHeader() {
      const weekEl = document.getElementById('weekDisplay');
      const dateEl = document.getElementById('dateDisplay');
      
      if (weekEl) weekEl.textContent = currentWeekKey;
      if (dateEl) {
        const range = getWeekDateRange(currentWeekKey);
        dateEl.textContent = formatDateRange(range.start, range.end);
      }
      
      updateHeaderTime();
    }

    function updateHeaderTime() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      // Time display
      const timeEl = document.getElementById('headerTime');
      if (timeEl) timeEl.textContent = `${hours}:${minutes}:${seconds}`;

      // Day calculations
      const minutesInDay = now.getHours() * 60 + now.getMinutes();
      const dayProgress = Math.round((minutesInDay / (24 * 60)) * 100);

      // Week calculations
      const dayOfWeek = now.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const minutesInWeek = dayIndex * 24 * 60 + minutesInDay;
      const weekProgress = Math.round((minutesInWeek / (7 * 24 * 60)) * 100);

      // Day percent (left of day strip)
      const dayPercentEl = document.getElementById('dayPercent');
      if (dayPercentEl) dayPercentEl.textContent = `${dayProgress}%`;

      // Day date (right of day strip) - 25 JAN SATURDAY
      const dayDateEl = document.getElementById('headerDayDate');
      if (dayDateEl) {
        const day = String(now.getDate()).padStart(2, '0');
        const monthName = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const dayNameFull = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        dayDateEl.textContent = `${day} ${monthName} ${dayNameFull}`;
      }

      // Week percent (left of week strip)
      const weekPercentEl = document.getElementById('weekPercent');
      if (weekPercentEl) weekPercentEl.textContent = `${weekProgress}%`;

      // Update strip fills
      const dayStripFill = document.getElementById('dayStripFill');
      const weekStripFill = document.getElementById('weekStripFill');
      
      if (dayStripFill) {
        dayStripFill.style.width = `${dayProgress}%`;
        // Sunrise/sunset colors
        const hour = now.getHours();
        let dayColor;
        if (hour >= 5 && hour < 8) {
          dayColor = 'rgba(255,170,68,0.4)'; // Dawn orange
        } else if (hour >= 8 && hour < 17) {
          dayColor = 'rgba(102,170,255,0.3)'; // Day blue
        } else if (hour >= 17 && hour < 20) {
          dayColor = 'rgba(255,119,68,0.4)'; // Dusk orange
        } else {
          dayColor = 'rgba(68,102,170,0.3)'; // Night blue
        }
        dayStripFill.style.background = dayColor;
      }
      
      if (weekStripFill) {
        weekStripFill.style.width = `${weekProgress}%`;
        weekStripFill.style.background = 'rgba(255,140,66,0.25)';
      }
    }

    // ===== STATS =====
    function updateStats() {
      const statsEl = document.getElementById('stats');
      const historyHabits = HABITS.filter(h => habitLabels[h]?.trim() && getCellFlag(h, 'showInHistory'));
      const hasActive = historyHabits.length > 0;

      if (!hasActive) {
        statsEl.innerHTML = '<div style="padding: 16px; text-align: center; opacity: 0.5; font-size: 12px;">No data yet</div>';
        updateHistoryChrome();
        return;
      }

      const allWeeks = Object.keys(weekData).sort().reverse();
      if (allWeeks.length === 0) {
        statsEl.innerHTML = '<div style="padding: 16px; text-align: center; opacity: 0.5; font-size: 12px;">No data yet</div>';
        updateHistoryChrome();
        return;
      }

      let html = '<table class="stats-table"><thead><tr><th>Week</th>';
      historyHabits.forEach(h => {
        const idx = HABITS.indexOf(h);
        html += `<th data-col="${idx}">${habitLabels[h]}</th>`;
      });
      html += '</tr></thead><tbody>';

      allWeeks.forEach(week => {
        html += `<tr><td>${week}</td>`;
        historyHabits.forEach(h => {
          const idx = HABITS.indexOf(h);
          const weekObj = weekData[week];
          const value = (weekObj && typeof weekObj === 'object') ? (weekObj[h] || 0) : 0;
          const typeRaw = habitTypes[h] || CELL_TYPES.UNIT;
          const type = (typeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : typeRaw;
          let display = value;

          if (type === CELL_TYPES.DURATION_SEC) {
            const m = Math.floor(value / 60);
            const s = value % 60;
            display = `${m}:${String(s).padStart(2, '0')}`;
          } else if (type === CELL_TYPES.DURATION_MIN) {
            display = `${value}m`;
          } else if (type === CELL_TYPES.DURATION_SEC_COUNT) {
            display = `${value}s`;
          }

          html += `<td data-col="${idx}">${display}</td>`;
        });
        html += '</tr>';
      });

      // TOTAL row - sum all weeks for ALL types
      html += '<tr style="border-top: 1px solid rgba(255,255,255,0.15);"><td>TOTAL</td>';
      historyHabits.forEach(h => {
        const idx = HABITS.indexOf(h);
        const typeRaw = habitTypes[h] || CELL_TYPES.UNIT;
        const type = (typeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : typeRaw;

        let total = 0;
        Object.keys(weekData).forEach(week => {
          const weekObj = weekData[week];
          if (weekObj && typeof weekObj === 'object') {
            total += (weekObj[h] || 0);
          }
        });

        let display = '-';
        if (total > 0) {
          if (type === CELL_TYPES.DURATION_SEC) {
            const m = Math.floor(total / 60);
            const s = total % 60;
            display = `${m}:${String(s).padStart(2, '0')}`;
          } else if (type === CELL_TYPES.DURATION_MIN) {
            display = `${total}m`;
          } else if (type === CELL_TYPES.DURATION_SEC_COUNT) {
            display = `${total}s`;
          } else {
            display = total;
          }
        }

        html += `<td data-col="${idx}">${display}</td>`;
      });
      html += '</tr>';

      html += '</tbody></table>';
      statsEl.innerHTML = html;
      updateHistoryChrome();
      
      attachTableHighlight();
    }

    // Table highlight on hover
    function attachTableHighlight() {
      const table = document.querySelector('.stats-table');
      if (!table) return;

      const cells = table.querySelectorAll('th, td');
      
      cells.forEach(cell => {
        const handleHighlight = function() {
          const col = this.dataset.col;
          const row = this.closest('tr');

          // Clear existing highlights first
          table.querySelectorAll('.cell-highlight').forEach(c => c.classList.remove('cell-highlight'));

          // Highlight current cell
          this.classList.add('cell-highlight');
          
          // Highlight week label (first cell in row)
          if (row) {
            const weekCell = row.querySelector('td:first-child');
            if (weekCell && weekCell !== this) {
              weekCell.classList.add('cell-highlight');
            }
          }

          // Highlight column header (habit name)
          if (col !== undefined) {
            const headerCell = table.querySelector(`th[data-col="${col}"]`);
            if (headerCell) {
              headerCell.classList.add('cell-highlight');
            }
          }
        };

        const clearHighlight = function() {
          table.querySelectorAll('.cell-highlight').forEach(c => c.classList.remove('cell-highlight'));
        };

        // Mouse events
        cell.addEventListener('mouseenter', handleHighlight);
        cell.addEventListener('mouseleave', clearHighlight);
        
        // Touch events for mobile
        cell.addEventListener('touchstart', function(e) {
          handleHighlight.call(this);
        }, { passive: true });
        
        cell.addEventListener('touchend', function(e) {
          // Keep highlight visible for a moment on touch
          setTimeout(clearHighlight, 500);
        }, { passive: true });
      });
    }

    // ===== CONTROLS =====
    function toggleDecrease() {
      decreaseMode = !decreaseMode;
      document.getElementById('btnDecrease').classList.toggle('active', decreaseMode);
    }

    function copyCurrentWeek() {
      const data = weekData[currentWeekKey];
      const safeData = (data && typeof data === 'object') ? data : {};
      let text = `${currentWeekKey}\n`;
      HABITS.forEach(h => {
        const label = habitLabels[h];
        if (!label?.trim()) return;
        const value = safeData[h] || 0;
        const type = habitTypes[h] || CELL_TYPES.COUNTER;
        let display = value;
        if (type === CELL_TYPES.DURATION_SEC) {
          const m = Math.floor(value / 60);
          const s = value % 60;
          display = `${m}:${String(s).padStart(2, '0')}`;
        } else if (type === CELL_TYPES.DURATION_MIN) {
          display = `${value}m`;
        }
        text += `${label}: ${display}\n`;
      });
      navigator.clipboard?.writeText(text).then(() => alert('Current week copied'));
    }

    function copyPreviousWeek() {
      const prevDate = new Date();
      prevDate.setDate(prevDate.getDate() - 7);
      const prevWeek = getWeekKey(prevDate);
      const data = weekData[prevWeek];
      const safeData = (data && typeof data === 'object') ? data : {};
      
      let text = `${prevWeek}\n`;
      HABITS.forEach(h => {
        const label = habitLabels[h];
        if (!label?.trim()) return;
        const value = safeData[h] || 0;
        const type = habitTypes[h] || CELL_TYPES.COUNTER;
        let display = value;
        if (type === CELL_TYPES.DURATION_SEC) {
          const m = Math.floor(value / 60);
          const s = value % 60;
          display = `${m}:${String(s).padStart(2, '0')}`;
        } else if (type === CELL_TYPES.DURATION_MIN) {
          display = `${value}m`;
        }
        text += `${label}: ${display}\n`;
      });
      navigator.clipboard?.writeText(text).then(() => alert('Previous week copied'));
    }

    function buildCurrentPinExportSnapshot() {
      const exportedTypes = { ...habitTypes };
      Object.keys(exportedTypes).forEach(k => {
        if (exportedTypes[k] === CELL_TYPES.COUNTER) exportedTypes[k] = CELL_TYPES.UNIT;
      });

      return {
        version: APP_VERSION,
        schemaVersion: 3,
        pin: currentPin,
        exportedAt: new Date().toISOString(),

        cells: getCellsSnapshot(),
        cellLayout: normalizeCellLayout(cellLayout),

        weekData,
        habitLabels,
        habitTypes: exportedTypes,
        habitColors,
        habitDescriptions,

        durationStates,
        timerSettings,
        moneySettings,

        unitSettings,
        valueFormats,
        mathSettings,
        cellFlags,

        themeSettings,
        ledSettings,
        ledStates,
        currencySettings,
        currencyCache,
        counterLastUpdate,
        counterChangeLog: normalizeCounterChangeLog(counterChangeLog),
        pinNames,
        pinColors
      };
    }

    function exportData() {
      const exportObj = buildCurrentPinExportSnapshot();
      const dataStr = JSON.stringify(exportObj, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trckng_sstm_pin${currentPin}_export_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

function importData() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json,.txt';
      input.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          try {
            const imported = JSON.parse(reader.result);

            if (imported.snapshotType === 'fullApp') {
              const ok = applyCloudSnapshot(imported);
              if (!ok) throw new Error('Unsupported full app snapshot');
              markCloudDirty('file import');
              alert('Full app snapshot imported successfully');
            } else {
              applyCurrentPinSnapshot(imported);
              markCloudDirty('file import');
              alert('Data imported successfully');
            }
          } catch (err) {
            console.error(err);
            alert('Import failed: invalid file');
          }
        };
        reader.readAsText(file);
      });

      input.click();
    }



    function resetAll() {
      const pinNameRaw = (pinNames && pinNames[currentPin] != null) ? String(pinNames[currentPin]) : '';
      const pinName = pinNameRaw.trim() || getDefaultPinName(currentPin);
      if (!confirm(`RESET ${pinName}?
\nThis will clear all cells and data for this pin.`)) return;

      // Remove all per-pin data from storage
      const pin = currentPin;
      const suffix = `_pin${pin}`;

      const perPinKeys = [
        STORAGE_KEYS.DATA,
        STORAGE_KEYS.LABELS,
        STORAGE_KEYS.TYPES,
        STORAGE_KEYS.COLORS,
        STORAGE_KEYS.DESCRIPTIONS,
        STORAGE_KEYS.DURATION,
        STORAGE_KEYS.TIMER_SETTINGS,
        STORAGE_KEYS.TIMER_STATES,
        STORAGE_KEYS.COUNTER_LAST_UPDATE,
        STORAGE_KEYS.COUNTER_CHANGE_LOG,
        STORAGE_KEYS.MONEY_SETTINGS,
        STORAGE_KEYS.UNIT_SETTINGS,
        STORAGE_KEYS.VALUE_FORMATS,
        STORAGE_KEYS.MATH_SETTINGS,
        STORAGE_KEYS.CELL_FLAGS,
        STORAGE_KEYS.CELL_LAYOUT,
        STORAGE_KEYS.THEME,
        STORAGE_KEYS.LED_SETTINGS,
        STORAGE_KEYS.LED_STATES,
        STORAGE_KEYS.CURRENCY_SETTINGS
      ];

      perPinKeys.forEach(base => {
        localStorage.removeItem(`${base}${suffix}`);
      });

      // Prepare a blank layout for this pin
      const emptyLabels = {};
      const emptyDescriptions = {};
      const emptyTypes = {};
      const emptyColors = {};
      const emptyFlags = normalizeCellFlags({});
      const emptyLayout = normalizeCellLayout({});

      HABITS.forEach(habit => {
        emptyLabels[habit] = '';
        emptyDescriptions[habit] = '';
        emptyTypes[habit] = CELL_TYPES.UNIT;
        emptyColors[habit] = '#ffffff';
      });

      localStorage.setItem(`${STORAGE_KEYS.LABELS}${suffix}`, JSON.stringify(emptyLabels));
      localStorage.setItem(`${STORAGE_KEYS.DESCRIPTIONS}${suffix}`, JSON.stringify(emptyDescriptions));
      localStorage.setItem(`${STORAGE_KEYS.TYPES}${suffix}`, JSON.stringify(emptyTypes));
      localStorage.setItem(`${STORAGE_KEYS.COLORS}${suffix}`, JSON.stringify(emptyColors));
      localStorage.setItem(`${STORAGE_KEYS.CELL_FLAGS}${suffix}`, JSON.stringify(emptyFlags));
      localStorage.setItem(`${STORAGE_KEYS.CELL_LAYOUT}${suffix}`, JSON.stringify(emptyLayout));

      // Reload state for current pin
      loadWeekData();
      loadLabels();
      loadTypes();
      loadColors();
      loadDescriptions();
      loadDurationStates();
      loadTimerSettings();
      loadTimerStates();
      loadMoneySettings();
      loadUnitSettings();
      loadValueFormats();
      loadMathSettings();
      loadCellFlags();
      loadCellLayout();
      loadLedSettings();
      loadLedStates();
      loadCurrencySettings();
      loadThemeSettings();
      applyTheme();
      loadCounterLastUpdate();
      loadCounterChangeLog();

      currentWeekKey = getWeekKey();
      ensureWeekExists();
      renderHabits();
      renderLayoutEditor();
      updateHeader();
      applyPinNamesToUI();
      markCloudDirty('reset pin');
    }

    // ===== PIN SWITCH =====
      function switchPin(pinNum) {
      if (globalInterval) {
        clearInterval(globalInterval);
        globalInterval = null;
      }
      
      // Stop all LED pulses before switching
      stopAllLedPulses();

      currentPin = pinNum;
      document.querySelectorAll('.pin').forEach(p => p.classList.remove('active'));
      document.getElementById(`pin${pinNum}`).classList.add('active');
      
      // Update grid data-pin for pattern styling
      const grid = document.getElementById('habitsGrid');
      if (grid) grid.setAttribute('data-pin', pinNum);
      const layoutGrid = document.getElementById('layoutGrid');
      if (layoutGrid) layoutGrid.setAttribute('data-pin', pinNum);

      loadWeekData();
      loadLabels();
      loadTypes();
      loadColors();
      loadDescriptions();
      loadDurationStates();
      loadTimerSettings();
      loadTimerStates();
      loadMoneySettings();
      loadUnitSettings();
      loadValueFormats();
      loadMathSettings();
      loadCellFlags();
      loadCellLayout();
      loadLedSettings();
      loadLedStates();
      loadCurrencySettings();
      loadThemeSettings();
      applyTheme();
      loadCounterLastUpdate();
      loadPinNames();
      loadPinColors();
      syncPinsFromState();
      currentWeekKey = getWeekKey();
      ensureWeekExists();
      renderHabits();
      renderLayoutEditor();
      updateHeader();
      applyPinNamesToUI();
      // FIXED: Start interval if any timers are running after pin switch
      startGlobalIntervalIfNeeded();
    }

    // ===== EDIT MODALS =====
    function openEditModal() {
      setView(VIEW_MODES.LAYOUT);
      return;
      const container = document.getElementById('editItemsContainer');
      container.innerHTML = '';

      getRenderableCells().forEach(cell => {
        const habit = cell.id;
        const cellNum = String(cell.slot).padStart(2, '0');
        const label = cell.label || '';
        const size = `${cell.layout.colSpan}x${cell.layout.rowSpan}`;

        const item = document.createElement('button');
        item.className = 'edit-item';
        item.innerHTML = `
          <div class="edit-item-label">CELL ${cellNum} · ${size}</div>
          <div class="edit-item-name">${label || "-"}</div>
        `;
        item.querySelector('.edit-item-label').textContent = `CELL ${cellNum} - ${size}`;
        item.addEventListener('click', () => openCellEditModal(habit, cell.slot - 1));
        container.appendChild(item);
      });

      document.getElementById('editModal').classList.add('visible');
    }

    function closeEditModal() {
      if (!document.getElementById('editModal')) return;
      document.getElementById('editModal').classList.remove('visible');
    }


function openCellEditModal(habit, index) {
      editingHabit = habit;
      const cellNum = String(index + 1).padStart(2, '0');

      document.getElementById('cellEditLabel').textContent = `CELL ${cellNum}`;
      document.getElementById('cellEditInput').value = habitLabels[habit] || '';
      document.getElementById('cellEditColor').value = habitColors[habit] || '#ffffff';
      document.getElementById('cellEditDescription').value = habitDescriptions[habit] || '';

      const layout = getCellLayout(habit);
      const layoutSize = getLayoutSizeId(layout);
      document.querySelectorAll('#cellEditModal .type-btn[data-layout-size]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layoutSize === layoutSize);
      });

      const typeRaw = habitTypes[habit] || CELL_TYPES.UNIT;
      const type = (typeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : typeRaw;

      const moneyCfg = moneySettings[habit] || {};
      const stepField = document.getElementById('moneyStep');
      const currencyField = document.getElementById('moneyCurrency');
      const startField = document.getElementById('moneyStartAmount');
      if (stepField) stepField.value = moneyCfg.step != null ? moneyCfg.step : 10;
      if (currencyField) currencyField.value = moneyCfg.currency || '€';
      if (startField) startField.value = moneyCfg.startAmount != null ? moneyCfg.startAmount : '';
      document.querySelectorAll('#cellEditModal .type-btn[data-type]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
      });

      // Load timer settings if exists
      const settings = timerSettings[habit] || {
        duration: 20,
        format: 'mm:ss',
        sound: 'soft_chime',
        volume: 50,
        vibrate: true,
        message: '',
        targetDate: '',
        targetTime: '12:00'
      };

      document.getElementById('timerDuration').value = settings.duration || 20;
      document.getElementById('timerSound').value = settings.sound || 'soft_chime';
      document.getElementById('timerVolume').value = settings.volume || 50;
      document.getElementById('volumeValue').textContent = `${settings.volume || 50}%`;
      document.getElementById('timerMessage').value = settings.message || '';
      document.getElementById('countdownDate').value = settings.targetDate || '';
      document.getElementById('countdownTime').value = settings.targetTime || '12:00';
      document.getElementById('countdownSound').value = settings.sound || 'soft_chime';
      document.getElementById('countdownVolume').value = settings.volume || 50;
      document.getElementById('countdownVolumeValue').textContent = `${settings.volume || 50}%`;
      document.getElementById('countdownMessage').value = settings.message || '';

      // Set format buttons
      document.querySelectorAll('#cellEditModal [data-format]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.format === (settings.format || 'mm:ss'));
      });

      // Set vibrate buttons (timer)
      document.querySelectorAll('#cellEditModal [data-vibrate]').forEach(btn => {
        const isOn = settings.vibrate !== false;
        btn.classList.toggle('active', 
          (btn.dataset.vibrate === 'on' && isOn) || 
          (btn.dataset.vibrate === 'off' && !isOn)
        );
      });

      // Set vibrate buttons (countdown)
      document.querySelectorAll('#cellEditModal [data-vibrate-cd]').forEach(btn => {
        const isOn = settings.vibrate !== false;
        btn.classList.toggle('active', 
          (btn.dataset.vibrateCd === 'on' && isOn) || 
          (btn.dataset.vibrateCd === 'off' && !isOn)
        );
      });

      // Populate LED fields
      const lCfg = ledSettings[habit] || { bpm: 60 };
      const lBpm = document.getElementById('ledBpm');
      if (lBpm) lBpm.value = lCfg.bpm || 60;

      // Populate Currency fields
      const cCfg = currencySettings[habit] || { from: 'USD', to: 'RUB' };
      const cFrom = document.getElementById('currencyFrom');
      const cTo = document.getElementById('currencyTo');
      if (cFrom) cFrom.value = cCfg.from || 'USD';
      if (cTo) cTo.value = cCfg.to || 'RUB';

      // Populate Unit fields
      const uCfg = unitSettings[habit] || { step: 1, total: false };
      const uStep = document.getElementById('unitStep');
      const uTotal = document.getElementById('unitTotal');
      if (uStep) uStep.value = (uCfg.step != null) ? uCfg.step : 1;
      if (uTotal) uTotal.checked = uCfg.total === true;

      // Populate Value fields
      const vFmt = valueFormats[habit] || 'raw';
      const vSel = document.getElementById('valueFormat');
      if (vSel) vSel.value = vFmt;

      // Populate flag fields
      const flags = getCellFlags(habit);
      const flagHistory = document.getElementById('cellFlagHistory');
      const flagLastUpdate = document.getElementById('cellFlagLastUpdate');
      if (flagHistory) flagHistory.checked = flags.showInHistory !== false;
      if (flagLastUpdate) flagLastUpdate.checked = flags.showLastUpdate !== false;

      // Populate Math selectors/options
      const buildOptions = (selectEl) => {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        HABITS.forEach((h, idx) => {
          const cellNum = String(idx + 1).padStart(2, '0');
          const name = habitLabels[h] ? habitLabels[h] : `CELL ${cellNum}`;
          const opt = document.createElement('option');
          opt.value = h;
          opt.textContent = name;
          selectEl.appendChild(opt);
        });
      };

      buildOptions(document.getElementById('mathSourceA'));
      buildOptions(document.getElementById('mathSourceB'));

      const mCfg = mathSettings[habit] || { a: HABITS[0], op: 'add', bMode: 'cell', b: HABITS[1], bNum: 1, formatFrom: 'a', tapCycles: false };
      const mA = document.getElementById('mathSourceA');
      const mOp = document.getElementById('mathOp');
      const mB = document.getElementById('mathSourceB');
      const mBN = document.getElementById('mathNumberB');
      const mFmt = document.getElementById('mathFormatFrom');
      const mTap = document.getElementById('mathTapCycles');

      if (mA) mA.value = mCfg.a || HABITS[0];
      if (mOp) mOp.value = mCfg.op || 'add';
      if (mB) mB.value = mCfg.b || HABITS[1] || HABITS[0];
      if (mBN) mBN.value = (mCfg.bNum != null) ? mCfg.bNum : 1;
      if (mFmt) mFmt.value = mCfg.formatFrom || 'a';
      if (mTap) mTap.checked = mCfg.tapCycles === true;

      // B mode buttons
      document.querySelectorAll('#cellEditModal .type-btn[data-math-bmode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mathBmode === (mCfg.bMode || 'cell'));
      });

      // Toggle B input UI
      const bCellWrap = document.getElementById('mathBCellWrap');
      const bNumWrap = document.getElementById('mathBNumberWrap');
      const bm = mCfg.bMode || 'cell';
      if (bCellWrap) bCellWrap.style.display = (bm === 'cell') ? 'block' : 'none';
      if (bNumWrap) bNumWrap.style.display = (bm === 'number') ? 'block' : 'none';


      // Show/hide appropriate fields
      updateTimerFieldsVisibility(type);

      document.getElementById('cellEditModal').classList.add('visible');
      setTimeout(() => document.getElementById('cellEditInput').focus(), 100);
    }

    function updateTimerFieldsVisibility(type) {
      const timerFields = document.getElementById('timerSettingsFields');
      const countdownFields = document.getElementById('countdownSettingsFields');
      const moneyFields = document.getElementById('moneySettingsFields');
      const unitFields = document.getElementById('unitSettingsFields');
      const valueFields = document.getElementById('valueSettingsFields');
      const mathFields = document.getElementById('mathSettingsFields');
      const ledFields = document.getElementById('ledSettingsFields');
      const currencyFields = document.getElementById('currencySettingsFields');
      const descField = document.getElementById('descriptionField');
      const moneyStartField = document.getElementById('moneyStartAmountField');

      const t = typeof type === 'string' ? type : (type || '');

      const show = (el, on) => { if (el) el.style.display = on ? 'block' : 'none'; };

      show(timerFields, t === CELL_TYPES.TIMER);
      show(countdownFields, t === CELL_TYPES.COUNTDOWN);
      show(moneyFields, t === CELL_TYPES.MONEY_INCOME || t === CELL_TYPES.MONEY_BUDGET);
      show(unitFields, t === CELL_TYPES.UNIT || t === CELL_TYPES.COUNTER);
      show(valueFields, t === CELL_TYPES.VALUE);
      show(mathFields, t === CELL_TYPES.MATH);
      show(ledFields, t === CELL_TYPES.LED_PULSE);
      show(currencyFields, t === CELL_TYPES.CURRENCY);

      // Description is useful for most types, but keep it hidden for pure math and currency
      show(descField, t !== CELL_TYPES.MATH && t !== CELL_TYPES.CURRENCY);

      // Budget start amount only for Budget
      show(moneyStartField, t === CELL_TYPES.MONEY_BUDGET);
    }
    
    function closeCellEditModal() {
      document.getElementById('cellEditModal').classList.remove('visible');
      editingHabit = null;
    }
function saveCellEdit() {
      if (!editingHabit) return;

      const newLabel = document.getElementById('cellEditInput').value.trim();
      const newColor = document.getElementById('cellEditColor').value;
      const newDescription = document.getElementById('cellEditDescription').value.trim();
      const activeTypeBtn = document.querySelector('#cellEditModal .type-btn.active[data-type]');
      const newType = (activeTypeBtn && activeTypeBtn.dataset.type) ? activeTypeBtn.dataset.type : CELL_TYPES.UNIT;
      const normalizedType = (newType === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : newType;


      const oldTypeRaw = habitTypes[editingHabit];
      const oldType = (oldTypeRaw === CELL_TYPES.COUNTER) ? CELL_TYPES.UNIT : oldTypeRaw;
      const typeChanged = oldType !== normalizedType;

      const oldIsDuration =
        oldType === CELL_TYPES.DURATION_SEC ||
        oldType === CELL_TYPES.DURATION_MIN ||
        oldType === CELL_TYPES.DURATION_SEC_COUNT;

      const newIsDuration =
        normalizedType === CELL_TYPES.DURATION_SEC ||
        normalizedType === CELL_TYPES.DURATION_MIN ||
        normalizedType === CELL_TYPES.DURATION_SEC_COUNT;

      const oldIsTimer =
        oldType === CELL_TYPES.TIMER ||
        oldType === CELL_TYPES.COUNTDOWN;

      const newIsTimer =
        normalizedType === CELL_TYPES.TIMER ||
        normalizedType === CELL_TYPES.COUNTDOWN;

      if (!newLabel) {
        // Empty name hides the cell from TRACK. Data stays recoverable through LAYOUT.
      } else if (typeChanged) {
        // Type changed
        if (oldIsDuration && newIsDuration) {
          // Duration to duration - convert values
          Object.keys(weekData).forEach(week => {
            if (weekData[week] && typeof weekData[week] === 'object') {
              const oldValue = weekData[week][editingHabit] || 0;
              let seconds = oldValue;
              if (oldType === CELL_TYPES.DURATION_MIN) {
                seconds = oldValue * 60;
              }
              if (normalizedType === CELL_TYPES.DURATION_MIN) {
                weekData[week][editingHabit] = Math.floor(seconds / 60);
              } else {
                weekData[week][editingHabit] = seconds;
              }
            }
          });
        } else {
          // Any other type change - reset
          if (normalizedType === CELL_TYPES.MONEY_INCOME || normalizedType === CELL_TYPES.MONEY_BUDGET) {
            // For money cells, start "empty" so budget can apply start amount on first display
            Object.keys(weekData).forEach(week => {
              if (weekData[week] && typeof weekData[week] === 'object') {
                delete weekData[week][editingHabit];
              }
            });
          } else {
            Object.keys(weekData).forEach(week => {
              if (weekData[week] && typeof weekData[week] === 'object') {
                weekData[week][editingHabit] = 0;
              }
            });
          }
          delete durationStates[editingHabit];
          delete timerStates[editingHabit];
          delete timerSettings[editingHabit];
          delete moneySettings[editingHabit];
        }
      }

      // Save timer/countdown settings
      if (normalizedType === CELL_TYPES.TIMER) {
        const formatBtn = document.querySelector('[data-format].active');
        const vibrateBtn = document.querySelector('[data-vibrate].active');
        timerSettings[editingHabit] = {
          duration: parseInt(document.getElementById('timerDuration').value, 10) || 20,
          format: formatBtn ? formatBtn.dataset.format : 'mm:ss',
          sound: document.getElementById('timerSound').value || 'soft_chime',
          volume: parseInt(document.getElementById('timerVolume').value, 10) || 50,
          vibrate: vibrateBtn ? vibrateBtn.dataset.vibrate === 'on' : true,
          message: document.getElementById('timerMessage').value.trim()
        };
      } else if (normalizedType === CELL_TYPES.COUNTDOWN) {
        const vibrateCdBtn = document.querySelector('[data-vibrate-cd].active');
        timerSettings[editingHabit] = {
          targetDate: document.getElementById('countdownDate').value,
          targetTime: document.getElementById('countdownTime').value || '12:00',
          sound: document.getElementById('countdownSound').value || 'soft_chime',
          volume: parseInt(document.getElementById('countdownVolume').value, 10) || 50,
          vibrate: vibrateCdBtn ? vibrateCdBtn.dataset.vibrateCd === 'on' : true,
          message: document.getElementById('countdownMessage').value.trim()
        };
      } else {
        delete timerSettings[editingHabit];
      }

      // Save money settings
      if (normalizedType === CELL_TYPES.MONEY_INCOME || normalizedType === CELL_TYPES.MONEY_BUDGET) {
        const stepInput = parseFloat(document.getElementById('moneyStep').value);
        const currencyInput = document.getElementById('moneyCurrency').value.trim();
        const startInputRaw = document.getElementById('moneyStartAmount').value;
        const startInput = startInputRaw === '' ? NaN : parseFloat(startInputRaw);

        moneySettings[editingHabit] = {
          step: !isNaN(stepInput) && stepInput !== 0 ? stepInput : 10,
          currency: currencyInput || '€'
        };

        if (!isNaN(startInput)) {
          moneySettings[editingHabit].startAmount = startInput;
        } else {
          delete moneySettings[editingHabit].startAmount;
        }
      } else {
        delete moneySettings[editingHabit];
      }

      habitLabels[editingHabit] = newLabel;
      habitColors[editingHabit] = newColor;
      habitTypes[editingHabit] = normalizedType;
      habitDescriptions[editingHabit] = newDescription;

      saveLabels();
      saveColors();
      saveTypes();
      saveDescriptions();
      saveTimerSettings();
      saveMoneySettings();
      saveWeekData();
      saveDurationStates();
      saveTimerStates();
      saveCounterLastUpdate();

      cellFlags[editingHabit] = {
        ...getCellFlags(editingHabit),
        showInHistory: Boolean(document.getElementById('cellFlagHistory')?.checked),
        showLastUpdate: Boolean(document.getElementById('cellFlagLastUpdate')?.checked)
      };
      saveCellFlags();

      // Persist settings for new types
      if (normalizedType === CELL_TYPES.UNIT) {
        const step = Number(document.getElementById('unitStep')?.value);
        unitSettings[editingHabit] = {
          step: (Number.isFinite(step) && step > 0) ? Math.floor(step) : 1,
          total: Boolean(document.getElementById('unitTotal')?.checked)
        };
        saveUnitSettings();
      } else {
        delete unitSettings[editingHabit];
        saveUnitSettings();
      }

      if (normalizedType === CELL_TYPES.VALUE) {
        const fmt = document.getElementById('valueFormat')?.value || 'raw';
        valueFormats[editingHabit] = fmt;
        saveValueFormats();
      } else {
        delete valueFormats[editingHabit];
        saveValueFormats();
      }

      if (normalizedType === CELL_TYPES.MATH) {
        const a = document.getElementById('mathSourceA')?.value || '';
        const op = document.getElementById('mathOp')?.value || 'add';
        const bMode = document.querySelector('#cellEditModal .type-btn.active[data-math-bmode]')?.dataset.mathBmode || 'cell';
        const b = document.getElementById('mathSourceB')?.value || '';
        const bNum = Number(document.getElementById('mathNumberB')?.value);
        const formatFrom = document.getElementById('mathFormatFrom')?.value || 'a';
        const tapCycles = Boolean(document.getElementById('mathTapCycles')?.checked);

        mathSettings[editingHabit] = {
          a,
          op,
          bMode,
          b,
          bNum: Number.isFinite(bNum) ? bNum : 1,
          formatFrom,
          tapCycles
        };

        if (wouldCreateMathCycle(editingHabit)) {
          // Revert and warn, keep modal open
          delete mathSettings[editingHabit];
          document.getElementById('mathStatusLine').textContent = 'Cycle detected. Settings not saved.';
          return;
        } else {
          document.getElementById('mathStatusLine').textContent = '';
          saveMathSettings();
        }
      } else {
        delete mathSettings[editingHabit];
        saveMathSettings();
      }

      // Save LED settings
      if (normalizedType === CELL_TYPES.LED_PULSE) {
        const bpm = Number(document.getElementById('ledBpm')?.value) || 60;
        ledSettings[editingHabit] = { bpm: Math.max(1, Math.min(300, bpm)) };
        saveLedSettings();
      } else {
        delete ledSettings[editingHabit];
        delete ledStates[editingHabit];
        saveLedSettings();
        saveLedStates();
      }

      // Save Currency settings
      if (normalizedType === CELL_TYPES.CURRENCY) {
        const from = (document.getElementById('currencyFrom')?.value || 'USD').toUpperCase().trim();
        const to = (document.getElementById('currencyTo')?.value || 'RUB').toUpperCase().trim();
        currencySettings[editingHabit] = { from, to };
        saveCurrencySettings();
      } else {
        delete currencySettings[editingHabit];
        saveCurrencySettings();
      }

      const activeLayoutBtn = document.querySelector('#cellEditModal .type-btn.active[data-layout-size]');
      setCellLayoutSize(editingHabit, activeLayoutBtn?.dataset.layoutSize || '1x1');

      closeCellEditModal();
      renderHabits();
      renderLayoutEditor();
    }


function openInfoModal() {
      localStorage.setItem(STORAGE_KEYS.SEEN_INFO, 'true');
      const quickInfoBtn = document.getElementById('btnQuickInfo');
      if (quickInfoBtn) quickInfoBtn.classList.remove('pulse');
      document.getElementById('infoModal').classList.add('visible');
    }

    function closeInfoModal() {
      document.getElementById('infoModal').classList.remove('visible');
    }

    function syncThemeModalInputs() {
      const t = themeSettings || defaultThemeSettings();
      document.getElementById('themeBg').value = t.bg || '#000000';
      document.getElementById('themeText').value = t.text || '#ffffff';
      document.getElementById('themeStroke').value = t.stroke || '#ffffff';
    }

    function openThemeModal() {
      syncThemeModalInputs();
      document.getElementById('themeModal').classList.add('visible');
    }

    function closeThemeModal() {
      document.getElementById('themeModal').classList.remove('visible');
    }


    // Simple helper to toggle help panels
    function togglePanelVisibility(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('visible');
    }

    function registerServiceWorker() {
      if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const reloadKey = `trckng_sw_reloaded_${APP_VERSION}`;
        if (sessionStorage.getItem(reloadKey) === 'true') return;
        sessionStorage.setItem(reloadKey, 'true');
        window.location.reload();
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/TRCKNG-SSTM/service-worker.js')
          .then(registration => registration.update())
          .catch(error => console.warn('Service worker registration failed', error));
      });
    }

// ===== INIT =====
    function updateCellDiagonalAngle() {
      const sampleCell = document.querySelector('.buttons-grid .btn-habit');
      if (!sampleCell) return;
      const rect = sampleCell.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const angleRad = Math.atan(rect.height / rect.width);
      const angleDeg = angleRad * 180 / Math.PI;
      document.documentElement.style.setProperty('--cell-diagonal-angle', angleDeg + 'deg');
    }

    function init() {
      // Enable CSS :active selector on iOS devices
      document.addEventListener('touchstart', () => {}, { passive: true });
      registerServiceWorker();

      loadCloudSyncState();
      loadSignupUnlockState();
      runWithoutCloudDirty(() => {
        loadWeekData();
        loadLabels();
        loadTypes();
        loadColors();
        loadDescriptions();
        loadDurationStates();
        loadTimerSettings();
        loadTimerStates();
        loadMoneySettings();
        loadUnitSettings();
        loadValueFormats();
        loadMathSettings();
        loadCellFlags();
        loadCellLayout();
        loadLedSettings();
        loadLedStates();
        loadCurrencySettings();
        loadCurrencyCache();
        loadThemeSettings();
        loadViewMode();
        applyTheme();
        loadCounterLastUpdate();
        loadCounterChangeLog();
        loadPinNames();
        loadPinColors();
        syncPinsFromState();
      });
      
      // Check if week changed - reset duration states for new week
      const lastWeekKey = localStorage.getItem('trckng_last_week_key');
      if (lastWeekKey && lastWeekKey !== currentWeekKey) {
        console.log('New week detected! Resetting duration states.');
        durationStates = {};
        saveDurationStates();
      }
      localStorage.setItem('trckng_last_week_key', currentWeekKey);
      
      runWithoutCloudDirty(() => ensureWeekExists());

      renderHabits();
      renderLayoutEditor();
      setView(currentView);
      updateHeader();
      applyPinNamesToUI();
      
      // Fetch sunrise/sunset data
      fetchSunData();
      
      // Always start global interval for "X ago" updates
      startGlobalInterval();

      if (!localStorage.getItem(STORAGE_KEYS.SEEN_INFO)) {
        document.getElementById('btnQuickInfo').classList.add('pulse');
      }

      // Update clock every second (fixes lag issue)
      clockInterval = setInterval(updateHeaderTime, 1000);

      document.querySelectorAll('.pin').forEach(btn => {
        btn.addEventListener('click', () => switchPin(parseInt(btn.dataset.pin)));
      });

      document.querySelectorAll('.view-tab').forEach(btn => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
      });

      document.getElementById('btnDecrease').addEventListener('click', toggleDecrease);
      document.getElementById('btnUndo').addEventListener('click', undoLastCounterChange);
      const layoutPackBtn = document.getElementById('btnLayoutPack');
      if (layoutPackBtn) layoutPackBtn.addEventListener('click', packCurrentLayout);
      const layoutPinNameBtn = document.getElementById('btnLayoutPinName');
      if (layoutPinNameBtn) layoutPinNameBtn.addEventListener('click', renameCurrentPin);
      const layoutPinColor = document.getElementById('layoutPinColor');
      if (layoutPinColor) {
        layoutPinColor.addEventListener('input', event => setCurrentPinFillColor(event.target.value));
      }
      const layoutThemeBtn = document.getElementById('btnLayoutTheme');
      if (layoutThemeBtn) layoutThemeBtn.addEventListener('click', openThemeModal);
      const layoutNotifyBtn = document.getElementById('btnLayoutNotify');
      if (layoutNotifyBtn) layoutNotifyBtn.addEventListener('click', requestNotificationPermission);
      const layoutInfoBtn = document.getElementById('btnLayoutInfo');
      if (layoutInfoBtn) layoutInfoBtn.addEventListener('click', openInfoModal);
      const cellEditHelpBtn = document.getElementById('btnCellEditHelp');
      if (cellEditHelpBtn) {
        cellEditHelpBtn.addEventListener('click', () => togglePanelVisibility('cellEditHelpPanel'));
      }
      document.getElementById('btnCopy').addEventListener('click', copyCurrentWeek);
      document.getElementById('btnCopyPrev').addEventListener('click', copyPreviousWeek);
      document.getElementById('btnExport').addEventListener('click', exportData);
      document.getElementById('btnImport').addEventListener('click', importData);
      document.getElementById('btnReset').addEventListener('click', resetAll);
      document.getElementById('btnQuickInfo').addEventListener('click', openInfoModal);
      document.getElementById('btnAccount').addEventListener('click', openAccountModal);
      document.getElementById('btnCloudSync').addEventListener('click', manualCloudSync);
    document.getElementById('accountModalClose').addEventListener('click', closeAccountModal);
    document.getElementById('accountConfigToggle').addEventListener('click', toggleAccountConfig);
    document.getElementById('accountConfigSave').addEventListener('click', saveSupabaseConfigFromModal);
    document.getElementById('accountSignIn').addEventListener('click', signInAccount);
    document.getElementById('accountSignUp').addEventListener('click', signUpAccount);
    document.getElementById('accountSignOut').addEventListener('click', signOutAccount);
    document.getElementById('accountUpload').addEventListener('click', uploadCloudSnapshot);
    document.getElementById('accountLoad').addEventListener('click', loadCloudSnapshot);

    document.getElementById('valueModalCancel').addEventListener('click', closeValueModal);
    document.getElementById('valueModalClear').addEventListener('click', () => {
      document.getElementById('valueModalInput').value = 0;
    });
    document.getElementById('valueModalSave').addEventListener('click', () => {
      if (!editingValueHabit) return closeValueModal();
      ensureWeekExists();
      const previousValue = Number(weekData[currentWeekKey][editingValueHabit] || 0);
      const v = Number(document.getElementById('valueModalInput').value);
      const nextValue = Number.isFinite(v) ? v : 0;
      weekData[currentWeekKey][editingValueHabit] = nextValue;
      recordCounterChange(editingValueHabit, previousValue, nextValue, null, null, 'value');
      saveWeekData();
      saveCounterChangeLog();
      renderHabits();
      closeValueModal();
    });

    // Currency modal listeners
    document.getElementById('currencyModalCancel').addEventListener('click', closeCurrencyModal);
    document.getElementById('currencyModalReset').addEventListener('click', () => {
      document.getElementById('currencyModalInput').value = 1;
      updateCurrencyModalResult();
    });
    document.getElementById('currencyModalInput').addEventListener('input', updateCurrencyModalResult);
    document.getElementById('currencyModalSave').addEventListener('click', () => {
      if (!editingCurrencyHabit) return closeCurrencyModal();
      const amount = parseFloat(document.getElementById('currencyModalInput').value) || 1;
      const settings = currencySettings[editingCurrencyHabit] || { from: 'USD', to: 'RUB' };
      settings.amount = amount;
      currencySettings[editingCurrencyHabit] = settings;
      saveCurrencySettings();
      renderHabits();
      closeCurrencyModal();
    });

    document.getElementById('themeCancel').addEventListener('click', closeThemeModal);
    document.getElementById('themeReset').addEventListener('click', () => {
      themeSettings = defaultThemeSettings();
      syncThemeModalInputs();
      applyTheme();
      saveThemeSettings();
    });
    document.getElementById('themeSave').addEventListener('click', () => {
      themeSettings = {
        bg: document.getElementById('themeBg').value,
        text: document.getElementById('themeText').value,
        stroke: document.getElementById('themeStroke').value
      };
      applyTheme();
      saveThemeSettings();
      closeThemeModal();
    });
      document.getElementById('btnInfoClose').addEventListener('click', closeInfoModal);

      document.getElementById('cellEditCancel').addEventListener('click', closeCellEditModal);
      document.getElementById('cellEditSave').addEventListener('click', saveCellEdit);

      document.querySelectorAll('#cellEditModal .type-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            // Type buttons
            if (btn.dataset.type) {
              document.querySelectorAll('#cellEditModal .type-btn[data-type]').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              updateTimerFieldsVisibility(btn.dataset.type);
              return;
            }
    
            // Format buttons (Duration)
            if (btn.dataset.format) {
              document.querySelectorAll('#cellEditModal [data-format]').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              return;
            }
    
            // Vibrate (Timer)
            if (btn.dataset.vibrate) {
              document.querySelectorAll('#cellEditModal [data-vibrate]').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              return;
            }
    
            // Vibrate (Countdown)
            if (btn.dataset.vibrateCd) {
              document.querySelectorAll('#cellEditModal [data-vibrate-cd]').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              return;
            }

            // Layout size
            if (btn.dataset.layoutSize) {
              document.querySelectorAll('#cellEditModal .type-btn[data-layout-size]').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              return;
            }
    
            // Math B mode
            if (btn.dataset.mathBmode) {
              document.querySelectorAll('#cellEditModal .type-btn[data-math-bmode]').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              const bm = btn.dataset.mathBmode;
              const bCellWrap = document.getElementById('mathBCellWrap');
              const bNumWrap = document.getElementById('mathBNumberWrap');
              if (bCellWrap) bCellWrap.style.display = (bm === 'cell') ? 'block' : 'none';
              if (bNumWrap) bNumWrap.style.display = (bm === 'number') ? 'block' : 'none';
              return;
            }

            // LED mode
            if (btn.dataset.ledMode) {
              document.querySelectorAll('#cellEditModal .type-btn[data-led-mode]').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              return;
            }
          });
        });

      // Volume sliders
      document.getElementById('timerVolume').addEventListener('input', (e) => {
        document.getElementById('volumeValue').textContent = `${e.target.value}%`;
      });
      
      document.getElementById('countdownVolume').addEventListener('input', (e) => {
        document.getElementById('countdownVolumeValue').textContent = `${e.target.value}%`;
      });

      
      // Sound preview buttons
      const timerSoundSelect = document.getElementById('timerSound');
      const timerSoundTestBtn = document.getElementById('timerSoundTest');
      if (timerSoundSelect && timerSoundTestBtn) {
        timerSoundTestBtn.addEventListener('click', () => {
          const volume = parseInt(document.getElementById('timerVolume').value) || 50;
          const sound = timerSoundSelect.value || 'soft_chime';
          playNotificationSound(sound, volume);
        });
      }

      const countdownSoundSelect = document.getElementById('countdownSound');
      const countdownSoundTestBtn = document.getElementById('countdownSoundTest');
      if (countdownSoundSelect && countdownSoundTestBtn) {
        countdownSoundTestBtn.addEventListener('click', () => {
          const volume = parseInt(document.getElementById('countdownVolume').value) || 50;
          const sound = countdownSoundSelect.value || 'soft_chime';
          playNotificationSound(sound, volume);
        });
      }

      document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.classList.remove('visible');
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal.visible').forEach(m => m.classList.remove('visible'));
        }
      });

      applyPinNamesToUI();
      setupSignupUnlockGesture();
      setView(currentView);
      updateCellDiagonalAngle();
      window.addEventListener('resize', updateCellDiagonalAngle);
      window.addEventListener('trckng-supabase-sdk-loaded', () => setupSupabaseAccount(true));
      window.addEventListener('online', () => {
        accountStatusOverride = null;
        triggerCloudSync('online', { force: true });
      });
      window.addEventListener('focus', () => {
        triggerCloudSync('focus');
      });
      window.addEventListener('pageshow', () => {
        triggerCloudSync('pageshow', { force: true });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          triggerCloudSync('visible');
        }
      });
      setupSupabaseAccount();
      triggerCloudSync('startup', { force: true });

    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
