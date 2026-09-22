'use strict';
(() => {
  const store = window.TRCKNG_STORAGE, client = window.TRCKNG_PREPARED_CLIENT?.client;
  const owner = window.TRCKNG_ACCOUNT_OWNER || null, table = 'trckng_v2_snapshots';
  const $ = id => document.getElementById(id);
  const read = (key, fallback = null) => JSON.parse(store.getItem(key) || JSON.stringify(fallback));
  const put = (key, value) => store.setItem(key, JSON.stringify(value));
  const t = (ru, en) => window.SstmI18n?.language === 'en' ? en : ru;
  // Keep the deployed RPC signature: this release needs no database migration.
  const commitRequest = (expected_revision, state) => ({ expected_revision, state, device: window.getSupabaseDeviceId(), mutation_id: crypto.randomUUID() });
  let session = null, busy = false, started = false, conflict = read('sstm_v2_choose_copy', false), cloudRow = null;
  let ready = read('sstm_v2_initialized', false), revision = read('sstm_v2_revision', 0), serial = read('sstm_v2_serial', 0);
  function setConflict(value) { conflict = value; put('sstm_v2_choose_copy', value); }
  const state = (message, tone = 'idle') => {
    window.managedAccountState({ session, client, busy, conflict, message, tone });
    document.body.classList.toggle('account-locked', !session || !ready);
    if ($('migrationGate')) $('migrationGate').hidden = !session || ready;
    if ($('migrationMessage') && message) $('migrationMessage').textContent = message;
  };
  const meta = row => ({ updatedAt: row.updated_at, deviceId: row.device_id, version: 'v2' });
  const currentRow = async () => {
    if (!session || session.user.id !== owner) return null;
    const { data, error } = await client.from(table).select('app_state,revision,updated_at,device_id,write_id').eq('user_id', owner).maybeSingle();
    if (error) throw error;
    cloudRow = data; renderCopies(); return data;
  };
  function renderCopies() {
    if (!$('v2CopyChoice')) return;
    const signedIn = Boolean(session), disabled = busy || !navigator.onLine;
    $('v2CopyChoice').hidden = !signedIn || !ready;
    $('v2CopyChoice').classList.toggle('has-conflict', conflict);
    $('v2CopyHelp').textContent = conflict
      ? t('Копии различаются. Выбери, какую использовать. Можно сначала скачать файл этого устройства.', 'The copies differ. Choose which one to use. You can download this device’s file first.')
      : t('Все PIN и история синхронизируются вместе.', 'All PINs and history sync together.');
    $('v2LocalMeta').textContent = (store.getItem('sstm_v2_device_name') || t('Это устройство', 'This device')) + ' · ' + t('локальные записи', 'local records');
    $('v2CloudMeta').textContent = cloudRow ? new Date(cloudRow.updated_at).toLocaleString(window.SstmI18n?.language === 'en' ? 'en-GB' : 'ru-RU') + ' · ' + String(cloudRow.device_id || '').slice(0, 8) : t('Облачная копия ещё не проверена', 'Cloud copy not checked yet');
    $('accountUpload').disabled = disabled || !signedIn || !ready;
    $('accountLoad').disabled = disabled || !signedIn;
    $('accountSyncNow').disabled = disabled || conflict || !ready;
    $('accountSyncNow').hidden = !signedIn || !ready || conflict;
    $('v2Export').hidden = !signedIn || !ready;
    $('v2Import').hidden = !signedIn;
    $('v2Import').disabled = busy;
    $('accountAdvanced').hidden = !signedIn;
    $('v2Recovery').hidden = !store.getItem('sstm_v2_recovery');
  }
  function adopt(row) {
    window.SstmData.validate(row.app_state);
    if (row.app_state.dataset !== 'sstm-v2') throw new Error(t('Нужен файл v2.', 'A v2 file is required.'));
    store.transaction(() => {
      window.applyCloudSnapshot(row.app_state); put('sstm_v2_revision', Number(row.revision)); put('sstm_v2_initialized', true);
      store.removeItem('sstm_v2_pending'); window.setCloudDirty(false); setConflict(false);
    });
    revision = Number(row.revision); ready = true;
    window.managedAccountState({ meta: meta(row) }); window.dispatchEvent(new Event('sstm-v2-loaded'));
  }
  function failure(error) {
    if (error.code === '40001') {
      setConflict(true); store.removeItem('sstm_v2_pending');
      state(t('Копии различаются — выбери устройство или облако.', 'Copies differ — choose this device or the cloud.'), 'warn');
    } else state(t('Синхронизация не завершена. Записи сохранены на устройстве; повтори при подключении.', 'Sync did not finish. Records remain on this device; retry when connected.'), 'error');
  }
  async function commit(pending) {
    const request = { ...pending.request }; delete request.device_name;
    const { data, error } = await client.rpc('commit_trckng_v2', request);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.revision) throw new Error('Missing revision');
    revision = Number(row.revision); put('sstm_v2_revision', revision); store.removeItem('sstm_v2_pending');
    cloudRow = { ...row, app_state: pending.request.state };
    window.managedAccountState({ meta: meta(row) });
    if (serial === pending.serial) window.setCloudDirty(false);
    return row;
  }
  async function sync() {
    if (busy || !session || session.user.id !== owner || !navigator.onLine) return;
    busy = true; state(); let completed = false;
    try {
      if (conflict) { await currentRow(); return; }
      const pending = read('sstm_v2_pending');
      if (pending) {
        const result = await commit(pending);
        if (!ready) adopt({ ...result, app_state: pending.request.state });
      }
      const row = await currentRow();
      if (!row) { state(ready ? t('Облачная копия не найдена. Выбери «С этого устройства».', 'No cloud copy. Choose “Use this device”.') : t('Создай поле или загрузи файл v2.', 'Create a field or import a v2 file.')); return; }
      if (!ready || Number(row.revision) !== revision && !window.managedAccountDirty()) adopt(row);
      else if (Number(row.revision) !== revision) { failure({ code: '40001' }); return; }
      if (ready && window.managedAccountDirty()) {
        const next = { serial, request: commitRequest(revision, window.buildCloudSnapshot()) };
        put('sstm_v2_pending', next); await commit(next);
      }
      completed = true; state(t('Всё сохранено', 'All saved'), 'ok');
    } catch (error) { failure(error); }
    finally { busy = false; state(); if (completed && ready && !conflict && window.managedAccountDirty()) window.scheduleCloudAutosync('v2 pending'); }
  }
  async function chooseDevice() {
    if (busy || !ready || !session || !navigator.onLine) return;
    busy = true; state(); let completed = false;
    try {
      // Resolve an uncertain request using its original mutation id before making another.
      const pending = read('sstm_v2_pending');
      if (pending) { try { await commit(pending); } catch (error) { if (error.code !== '40001') throw error; store.removeItem('sstm_v2_pending'); } }
      const row = await currentRow();
      if (!confirm(t('Использовать записи этого устройства для всех устройств? Текущая облачная копия будет заменена. Копия до замены останется здесь.', 'Use this device’s records on all devices? This replaces the current cloud copy. The previous copy will be kept here.'))) return;
      const snapshot = window.buildCloudSnapshot(); window.SstmData.validate(snapshot);
      const next = { serial, request: commitRequest(Number(row?.revision || 0), snapshot) };
      if (row) put('sstm_v2_recovery', row.app_state);
      put('sstm_v2_pending', next); await commit(next); setConflict(false); completed = true;
      state(t('Копия этого устройства сохранена в облаке.', 'This device’s copy is saved in the cloud.'), 'ok');
    } catch (error) { failure(error); }
    finally { busy = false; state(); if (completed && window.managedAccountDirty()) window.scheduleCloudAutosync('v2 pending'); }
  }
  async function chooseCloud() {
    if (busy || !session || !navigator.onLine) return;
    busy = true; state();
    try {
      const row = await currentRow();
      if (!row) { state(t('В облаке пока нет записей.', 'No cloud records yet.'), 'warn'); return; }
      window.SstmData.validate(row.app_state);
      if (!confirm(t('Загрузить облачную копию на это устройство? Локальные записи будут заменены. Копия до замены останется здесь.', 'Load the cloud copy on this device? Local records will be replaced. The previous copy will be kept here.'))) return;
      put('sstm_v2_recovery', window.buildCloudSnapshot()); adopt(row); state(t('Загружена облачная копия.', 'Cloud copy loaded.'), 'ok');
    } catch (error) { failure(error); }
    finally { busy = false; state(); }
  }
  async function receive(next) {
    session = next;
    if ((next?.user.id || null) !== owner) {
      ready = false; state(); const target = new URL(location.href); target.searchParams.set('mode', next ? 'account' : 'demo'); location.replace(target.href); return;
    }
    state(); if (next) setTimeout(sync, 0);
  }
  function download(value, name) {
    const link = document.createElement('a'); link.download = name; link.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  function importFile() {
    if (busy || !session) return;
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = async () => {
      if (!input.files[0]) return;
      if (busy) { alert(t('Дождись синхронизации и выбери файл ещё раз.', 'Wait for sync to finish, then choose the file again.')); return; }
      busy = true; state();
      try {
        const snapshot = JSON.parse(await input.files[0].text()); window.SstmData.validate(snapshot);
        if (snapshot.dataset !== 'sstm-v2') throw Error(t('Выбери файл, сохранённый из v2.', 'Choose a file exported from v2.'));
        if (!confirm(t('Загрузить файл на это устройство? Облако изменится только после выбора «С этого устройства».', 'Import this file on this device? The cloud changes only after you choose “Use this device”.'))) return;
        // Block autosync before changing the local copy, including on reload.
        store.transaction(() => {
          if (ready) put('sstm_v2_recovery', window.buildCloudSnapshot());
          setConflict(true); store.removeItem('sstm_v2_pending'); window.applyCloudSnapshot(snapshot);
          put('sstm_v2_initialized', true); ready = true; window.markCloudDirty('v2 file import');
        });
        window.dispatchEvent(new Event('sstm-v2-loaded'));
        state(t('Файл загружен на устройство. Выбери копию для синхронизации.', 'File imported on this device. Choose a copy for sync.'), 'warn');
      } catch (error) { alert(error.message); }
      finally { busy = false; state(); }
    };
    input.click();
  }
  function installUI() {
    const gate = document.createElement('section'); gate.id = 'migrationGate'; gate.hidden = true;
    gate.innerHTML = '<strong>ТВОЁ ПОЛЕ</strong><p id="migrationMessage">Подключаем аккаунт…</p><div class="migration-actions"><button id="accountCreateField" type="button">СОЗДАТЬ ПУСТОЕ ПОЛЕ</button><button id="migrationRetry" type="button">ПРОВЕРИТЬ СНОВА</button><button id="v2FirstImport" type="button">ЗАГРУЗИТЬ ФАЙЛ V2</button></div>';
    document.querySelector('.header').after(gate); $('migrationRetry').onclick = sync; $('accountCreateField').onclick = createField; $('v2FirstImport').onclick = importFile;
    const content = $('accountModal').firstElementChild;
    const choice = document.createElement('section'); choice.id = 'v2CopyChoice';
    choice.innerHTML = '<p id="v2CopyHelp"></p><div class="v2-copy-grid"><div><p id="v2LocalMeta" data-no-i18n></p></div><div><p id="v2CloudMeta" data-no-i18n></p></div></div>';
    const oldSection = $('accountLoad').closest('.account-section');
    choice.querySelector('.v2-copy-grid > div').append($('accountUpload')); choice.querySelector('.v2-copy-grid > div:last-child').append($('accountLoad')); oldSection.remove();
    const signedInActions = document.createElement('div'); signedInActions.id = 'v2AccountActions';
    signedInActions.innerHTML = '<div class="v2-file-actions"><button id="v2Export" class="modal-btn" type="button">СКАЧАТЬ ФАЙЛ V2</button><button id="v2Import" class="modal-btn" type="button">ЗАГРУЗИТЬ ФАЙЛ V2</button></div><button id="accountSyncNow" class="modal-btn" type="button">СИНХРОНИЗИРОВАТЬ</button>';
    content.querySelector('.account-card').after(choice, signedInActions);
    $('accountUpload').hidden = false; $('accountUpload').textContent = 'С ЭТОГО УСТРОЙСТВА';
    $('accountUpload').addEventListener('click', event => { event.stopImmediatePropagation(); void chooseDevice(); }, true);
    $('accountLoad').textContent = 'ИЗ ОБЛАКА';
    $('accountSyncNow').onclick = sync; $('v2Export').onclick = () => { if (ready) download(window.buildCloudSnapshot(), 'sstm-v2-export.json'); }; $('v2Import').onclick = importFile;
    const advanced = document.createElement('details'); advanced.id = 'accountAdvanced';
    advanced.innerHTML = '<summary>Это устройство</summary><label for="v2DeviceName">Имя устройства</label><input id="v2DeviceName" class="cell-edit-input" type="text" maxlength="80"><button id="v2DeviceNameSave" class="modal-btn" type="button">СОХРАНИТЬ ИМЯ</button><button id="v2Recovery" class="modal-btn" type="button">СКАЧАТЬ КОПИЮ ДО ЗАМЕНЫ</button>';
    content.append(advanced); advanced.append($('accountSignOut'));
    $('v2DeviceName').value = store.getItem('sstm_v2_device_name') || '';
    $('v2DeviceNameSave').onclick = () => { store.setItem('sstm_v2_device_name', $('v2DeviceName').value.trim().slice(0, 80)); renderCopies(); };
    $('v2Recovery').onclick = () => { const value = read('sstm_v2_recovery'); if (value) download(value, 'sstm-v2-previous.json'); };
    $('accountConfigBody').hidden = true; $('accountConfigToggle').hidden = true; $('accountSignUp').hidden = false; $('accountSignUp').textContent = 'СОЗДАТЬ АККАУНТ'; $('accountEmailLabel').title = '';
    $('btnExport').addEventListener('click', event => { event.stopImmediatePropagation(); $('v2Export').click(); }, true);
    $('btnImport').addEventListener('click', event => { event.stopImmediatePropagation(); importFile(); }, true);
    let wasConflict = false;
    window.addEventListener('trckng-account-state', event => {
      renderCopies();
      if (event.detail.conflict && !wasConflict) $('accountModal').classList.add('visible');
      wasConflict = event.detail.conflict;
    });
    window.addEventListener('online', renderCopies); window.addEventListener('offline', renderCopies);
    window.addEventListener('sstm-language-changed', renderCopies);
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
      const pending = { serial, request: commitRequest(0, snapshot) };
      put('sstm_v2_pending', pending); const row = await commit(pending);
      const verified = await currentRow();
      if (!verified || !window.isSameData(verified.app_state, snapshot)) throw Error('Field verification failed');
      adopt({ ...row, app_state: verified.app_state }); state('Всё сохранено', 'ok');
      window.TRCKNG_NAVIGATION.fromAccount();
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
      client.auth.getSession().then(({ data }) => receive(data.session)); return true;
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

    async signOut() { if (client) await client.auth.signOut(); }, load: chooseCloud, upload: chooseDevice
  };
  window.TRCKNG_ACCOUNT = api;
})();
