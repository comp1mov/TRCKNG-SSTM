'use strict';
(() => {
  const store = window.TRCKNG_STORAGE, client = window.TRCKNG_PREPARED_CLIENT?.client;
  const owner = window.TRCKNG_ACCOUNT_OWNER || null, table = 'trckng_v2_snapshots';
  const $ = id => document.getElementById(id);
  const read = (key, fallback = null) => JSON.parse(store.getItem(key) || JSON.stringify(fallback));
  const put = (key, value) => store.setItem(key, JSON.stringify(value));
  let session = null, busy = false, started = false, preview = null, conflict = false;
  let ready = read('sstm_v2_initialized', false), revision = read('sstm_v2_revision', 0);
  let serial = read('sstm_v2_serial', 0);
  const state = (message, tone = 'idle') => {
    window.managedAccountState({ session, client, busy, conflict, message, tone });
    document.body.classList.toggle('account-locked', !session || !ready);
    const gate = $('migrationGate'); if (gate) gate.hidden = !session || ready;
    if ($('migrationMessage') && message) $('migrationMessage').textContent = message;
  };
  const meta = row => ({ updatedAt: row.updated_at, deviceId: row.device_id, version: 'v2' });
  const currentRow = async () => {
    if (!session || session.user.id !== owner) return null;
    const result = await client.from(table).select('app_state,revision,updated_at,device_id,write_id').eq('user_id', owner).maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  };
  function adopt(row) {
    window.SstmData.validate(row.app_state);
    if (row.app_state.dataset !== 'sstm-v2') throw new Error('Облачная копия не относится к v2.');
    store.transaction(() => {
      window.applyCloudSnapshot(row.app_state);
      put('sstm_v2_revision', Number(row.revision)); put('sstm_v2_initialized', true);
      store.removeItem('sstm_v2_pending'); window.setCloudDirty(false);
    });
    revision = Number(row.revision); ready = true; conflict = false;
    window.managedAccountState({ meta: meta(row) });
    window.dispatchEvent(new Event('sstm-v2-loaded'));
  }
  function failure(error) {
    if (error.code === '40001') {
      conflict = true; store.removeItem('sstm_v2_pending');
      state('На другом устройстве есть изменения. Твоя копия сохранена здесь; открой аккаунт.', 'warn');
    } else state(error.code === 'PGRST205' || error.code === 'PGRST202'
      ? 'Хранилище v2 ещё не подключено. V1 остаётся доступной по прежней ссылке.'
      : 'Не удалось синхронизировать v2. Локальная копия сохранена; можно повторить.', 'error');
  }
  async function commit(pending) {
    const { data, error } = await client.rpc('commit_trckng_v2', pending.request);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.revision) throw new Error('Не получено подтверждение записи.');
    revision = Number(row.revision); put('sstm_v2_revision', revision);
    store.removeItem('sstm_v2_pending');
    window.managedAccountState({ meta: meta(row) });
    if (serial === pending.serial) window.setCloudDirty(false);
    return row;
  }
  async function sync() {
    if (busy || !session || session.user.id !== owner || conflict || !navigator.onLine) return;
    busy = true; state();
    try {
      let pending = read('sstm_v2_pending');
      if (pending) {
        const result = await commit(pending);
        if (!ready) adopt({ ...result, app_state: pending.request.state });
      }
      const row = await currentRow();
      if (!row) { state(ready ? 'Облачная копия не найдена. Локальные записи сохранены.' : 'Создай своё поле. Кнопки можно добавлять постепенно.'); return; }
      if (!ready || Number(row.revision) !== revision && !window.managedAccountDirty()) adopt(row);
      else if (Number(row.revision) !== revision) { failure({ code: '40001' }); return; }
      if (ready && window.managedAccountDirty()) {
        pending = { serial, request: { expected_revision: revision, state: window.buildCloudSnapshot(), device: window.getSupabaseDeviceId(), mutation_id: crypto.randomUUID() } };
        put('sstm_v2_pending', pending); await commit(pending);
      }
      state('Всё сохранено', 'ok');
    } catch (error) { failure(error); }
    finally { busy = false; state(); if (ready && !conflict && window.managedAccountDirty()) window.scheduleCloudAutosync('v2 pending'); }
  }
  async function receive(next) {
    session = next;
    if ((next?.user.id || null) !== owner) {
      ready = false; state();
      const target = new URL(location.href); target.searchParams.set('mode', next ? 'account' : 'demo');
      location.replace(target.href); return;
    }
    state();
    if (next) setTimeout(sync, 0);
  }
  function installUI() {
    const gate = document.createElement('section'); gate.id = 'migrationGate'; gate.hidden = true;
    gate.innerHTML = '<strong>ТВОЁ ПОЛЕ</strong><p id="migrationMessage">Подключаем аккаунт…</p><div class="migration-actions"><button id="accountCreateField" type="button">СОЗДАТЬ ПУСТОЕ ПОЛЕ</button><button id="migrationRetry" type="button">ПРОВЕРИТЬ СНОВА</button></div><details id="migrationAdvanced"><summary>Перенести из v1</summary><p>Копия трёх PIN и истории. V1 продолжит работать отдельно.</p><div id="migrationSummary"></div><div class="migration-actions"><button id="migrationPreview" type="button">ПОДГОТОВИТЬ КОПИЮ V1</button><button id="migrationApply" type="button" hidden>СОЗДАТЬ МОЮ V2</button><a href="../">ОТКРЫТЬ V1 ↗</a></div></details>';
    document.querySelector('.header').after(gate);
    $('migrationPreview').onclick = prepare;
    $('migrationApply').onclick = migrate;
    $('migrationRetry').onclick = sync;
    $('accountCreateField').onclick = createField;
    const content = $('accountModal').firstElementChild;
    const advanced = document.createElement('details'); advanced.id = 'accountAdvanced';
    advanced.innerHTML = '<summary>Резервные копии и восстановление</summary>';
    content.append(advanced);
    advanced.append($('accountLoad').closest('.account-section'));
    const syncNow = document.createElement('button'); syncNow.id = 'accountSyncNow'; syncNow.className = 'modal-btn'; syncNow.textContent = 'СИНХРОНИЗИРОВАТЬ'; syncNow.onclick = () => api.sync();
    content.insertBefore(syncNow, advanced);
    const backup = document.createElement('button'); backup.id = 'v2SourceBackup'; backup.className = 'modal-btn'; backup.textContent = 'СКАЧАТЬ ИСХОДНУЮ КОПИЮ V1';
    backup.onclick = async () => {
      if (!session || !ready) return;
      const { data, error } = await client.from(table).select('source_state').eq('user_id', owner).single();
      if (error || !data?.source_state) { state('Исходная копия недоступна.', 'warn'); return; }
      download(data.source_state, 'sstm-v1-source.json');
    };
    advanced.append(backup);
    $('accountUpload').hidden = true; $('accountLoad').textContent = 'ЗАГРУЗИТЬ СОХРАНЁННУЮ V2';
    $('accountConfigBody').hidden = true; $('accountConfigToggle').hidden = true;
    $('accountSignUp').hidden = false;
    $('accountSignUp').textContent = 'СОЗДАТЬ АККАУНТ';
    $('accountEmailLabel').title = '';
    // Export always includes all PINs and the cycle journal in v2.
    $('btnExport').addEventListener('click', event => { event.stopImmediatePropagation(); download(window.buildCloudSnapshot(), 'sstm-v2-export.json'); }, true);
    $('btnImport').addEventListener('click', event => {
      event.stopImmediatePropagation();
      const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
      input.onchange = async () => {
        if (!input.files[0]) return;
        try {
          const snapshot = JSON.parse(await input.files[0].text()); window.SstmData.validate(snapshot);
          if (snapshot.dataset !== 'sstm-v2') throw new Error('Для v1 используй перенос из аккаунта.');
          if (!confirm('Восстановить эту копию v2? Текущая локальная копия будет сохранена как резервная.')) return;
          put('sstm_v2_recovery', window.buildCloudSnapshot());
          store.transaction(() => window.applyCloudSnapshot(snapshot)); window.markCloudDirty('v2 restore');
        } catch (error) { alert(error.message); }
      };
      input.click();
    }, true);
    const recovery = document.createElement('button'); recovery.className = 'modal-btn'; recovery.textContent = 'СКАЧАТЬ КОПИЮ ДО ВОССТАНОВЛЕНИЯ';
    recovery.onclick = () => { const value = read('sstm_v2_recovery'); if (value) download(value, 'sstm-v2-recovery.json'); else state('Резервная локальная копия пока не создавалась.'); };
    advanced.append(recovery);
    const exported = document.createElement('button'); exported.className = 'modal-btn'; exported.textContent = 'СКАЧАТЬ МОИ ДАННЫЕ';
    exported.onclick = () => { if (ready) download(window.buildCloudSnapshot(), 'sstm-v2-export.json'); };
    advanced.prepend(exported); advanced.prepend(advanced.querySelector('summary'));
    window.addEventListener('trckng-account-state', event => {
      advanced.hidden = !event.detail.signedIn || !ready;
      backup.hidden = !read('sstm_v2_migration');
      recovery.hidden = !store.getItem('sstm_v2_recovery');
      syncNow.hidden = !event.detail.signedIn || !ready; syncNow.disabled = event.detail.busy;
      if (event.detail.conflict) { advanced.open = true; $('accountModal').classList.add('visible'); }
    });
  }
  function download(value, name) {
    const link = document.createElement('a'); link.download = name; link.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  async function sourceRow() {
    const { data, error } = await client.from(window.TRCKNG_CONFIG.supabaseTable || 'trckng_snapshots').select('app_state,updated_at').eq('user_id', owner).maybeSingle();
    if (error) throw error;
    if (!data?.app_state) throw new Error('В аккаунте нет копии v1. Сначала сохрани её через SYNC в v1.');
    window.SstmData.validate(data.app_state); return data;
  }
  async function prepare() {
    if (busy || !session || ready) return;
    busy = true; state('Проверяем исходную копию…');
    try {
      if (localStorage.getItem('trckng_sstm_cloud_dirty') === 'true') throw new Error('В v1 есть несинхронизированные изменения. Открой v1 и нажми SYNC перед переносом.');
      const existing = await currentRow(); if (existing) { adopt(existing); return; }
      preview = await sourceRow();
      const pins = preview.app_state.pinData;
      const buttons = pins.reduce((n, p) => n + Object.values(p.habitLabels || {}).filter(label => String(label).trim()).length, 0);
      $('migrationSummary').textContent = `3 PIN · ${buttons} кнопок · история и настройки · копия от ${new Date(preview.updated_at).toLocaleString()}`;
      $('migrationApply').hidden = false;
      state('Копия подготовлена. Существующие таймеры и записи сохранят свои типы.');
    } catch (error) { $('migrationApply').hidden = true; preview = null; state(error.message, 'warn'); }
    finally { busy = false; state(); }
  }
  async function createField() {
    if (busy || !session || ready || session.user.id !== owner) return;
    busy = true; state('Создаём поле…');
    try {
      const existing = await currentRow(); if (existing) { adopt(existing); return; }
      const snapshot = window.buildCloudSnapshot();
      snapshot.currentPin = 0; snapshot.currentView = 'track';
      snapshot.pinNames = { 0: 'PIN 1', 1: 'PIN 2', 2: 'PIN 3' };
      snapshot.pinData.forEach(pin => {
        pin.habitLabels = Object.fromEntries(Object.keys(pin.habitLabels).map(id => [id, '']));
        pin.weekData = {}; pin.durationStates = {}; pin.durationSessions = []; pin.counterChangeLog = [];
      });
      window.SstmData.validate(snapshot);
      const pending = { serial, request: { expected_revision: 0, state: snapshot, device: window.getSupabaseDeviceId(), mutation_id: crypto.randomUUID() } };
      put('sstm_v2_pending', pending); const row = await commit(pending);
      const verified = await currentRow();
      if (!verified || !window.isSameData(verified.app_state, snapshot)) throw Error('Field verification failed');
      adopt({ ...row, app_state: verified.app_state }); state('Всё сохранено', 'ok');
      window.TRCKNG_NAVIGATION.fromAccount();
    } catch (error) { failure(error); }
    finally { busy = false; state(); }
  }
  async function migrate() {
    if (busy || !preview || ready) return;
    busy = true; state('Создаём отдельную копию v2…');
    try {
      const fresh = await sourceRow();
      if (fresh.updated_at !== preview.updated_at) { preview = null; $('migrationApply').hidden = true; state('V1 изменилась. Подготовь копию ещё раз, чтобы перенести последние записи.', 'warn'); return; }
      const snapshot = window.SstmData.migrate(preview.app_state, preview.updated_at);
      const pending = { serial, request: { expected_revision: 0, state: snapshot, device: window.getSupabaseDeviceId(), mutation_id: crypto.randomUUID(), source: preview.app_state, source_at: preview.updated_at } };
      put('sstm_v2_pending', pending);
      const row = await commit(pending);
      // Read back and compare every copied field before adopting it locally.
      const verified = await currentRow();
      if (!verified || !window.isSameData(verified.app_state, snapshot)) throw new Error('Проверка копии не завершена. Нажми «Проверить снова».');
      adopt({ ...row, app_state: verified.app_state }); preview = null;
      state('V2 ГОТОВА · V1 ПРОДОЛЖАЕТ ЖИТЬ ОТДЕЛЬНО', 'ok');
    } catch (error) { failure(error); }
    finally { busy = false; state(); }
  }
  const api = {
    get ready() { return ready; },
    changed() { serial++; put('sstm_v2_serial', serial); },
    setup() {
      if (started) return true; started = true; installUI();
      if (!client) { state('Не настроен аккаунт Supabase.', 'error'); return false; }
      client.auth.onAuthStateChange((event, next) => { void receive(next); });
      client.auth.getSession().then(({ data }) => receive(data.session));
      return true;
    },
    async session() { return session; }, fetch: currentRow, sync,
    async signIn() {
      if (busy || !client) return; busy = true; state('ВХОД…');
      try { const credentials = window.getAccountCredentials(); const { error } = await client.auth.signInWithPassword(credentials); if (error) throw error; $('accountPassword').value = ''; }
      catch (_) { state('Не удалось войти. Проверь почту и пароль.', 'error'); }
      finally { busy = false; state(); }
    },
    async signUp() {
      if (busy || !client || session) return; busy = true; state('СОЗДАЁМ АККАУНТ…');
      try {
        const credentials = window.getAccountCredentials();
        if (credentials.password.length < 8) { state('Пароль — минимум 8 символов.', 'warn'); return; }
        const { data, error } = await client.auth.signUp(credentials);
        if (error) throw error;
        $('accountPassword').value = '';
        state(data.session ? 'Аккаунт создан.' : 'Проверь почту: подтверди адрес и затем войди здесь.', 'ok');
      } catch (_) { state('Не удалось создать аккаунт. Проверь почту и пароль или попробуй войти.', 'error'); }
      finally { busy = false; state(); }
    },
    async signOut() { if (client) await client.auth.signOut(); },
    async load() {
      if (busy || !session) return;
      if (window.managedAccountDirty() && !confirm('Загрузить облачную v2? Текущая локальная копия останется в резервной копии в этом аккаунте на устройстве.')) return;
      busy = true; state();
      try { const row = await currentRow(); if (row) { put('sstm_v2_recovery', window.buildCloudSnapshot()); adopt(row); } }
      catch (error) { failure(error); }
      finally { busy = false; state(); }
    }
  };
  window.TRCKNG_ACCOUNT = api;
})();
