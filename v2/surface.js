'use strict';

// Reuse the existing engine and identity, with a separate v2 dataset. The points
// experiment remains at points-lab.html, with its original IndexedDB store.
(() => {
  const $ = selector => document.querySelector(selector);
  const url = path => new URL(path, location.href).href;
  const requestedMode = new URL(location.href).searchParams.get('mode');
  let demo = requestedMode === 'demo', viewStorage;
  const accountUrl = () => { const target = new URL(location.href); target.searchParams.set('mode', 'account'); target.searchParams.delete('surface'); return target.href; };
  const demoUrl = () => { const target = new URL(location.href); target.searchParams.set('mode', 'demo'); target.searchParams.delete('surface'); return target.href; };
  let status = {}, activeModal = null;
  const parked = new Map();
  const cameraKey = 'trckng_v2_surface_camera';
  let cameras = {};
  const pinNumber = () => Number($('.pin.active')?.dataset.pin || 0);
  const visibleView = () => document.body.dataset.view || 'track';
  const step = () => Number(document.body.dataset.cellSize || 128);
  const saveCameras = () => { try { viewStorage.setItem(cameraKey, JSON.stringify(cameras)); } catch (_) {} };
  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = url(path);
      script.onload = resolve; script.onerror = () => reject(new Error('Не удалось загрузить приложение. Проверь соединение и обнови страницу.'));
      document.body.append(script);
    });
  }
  function textButton(id, label) { const el = document.getElementById(id); if (el) el.textContent = label; return el; }
  function cameraId() { return `${pinNumber()}:${visibleView()}`; }
  function remember() {
    const view = document.querySelector('.view-panel:not([hidden])');
    if (view && visibleView() !== 'history') cameras[cameraId()] = { x: view.scrollLeft, y: view.scrollTop, size: step() };
    saveCameras();
  }
  function restore() {
    const view = document.querySelector('.view-panel:not([hidden])');
    const c = cameras[cameraId()] || {};
    const size = [96, 128, 160, 192].includes(c.size) ? c.size : innerWidth < 600 ? 96 : 128;
    document.body.dataset.cellSize = String(size);
    document.body.style.setProperty('--module-size', `${size}px`);
    view?.scrollTo(c.x || 0, c.y || 0);
    $('#surfaceZoom').textContent = `${Math.round(size / 128 * 100)}%`;
    $('#surfaceZoomOut').disabled = size === 96; $('#surfaceZoomIn').disabled = size === 192;
  }
  function updateStatus(next) {
    status = next;
    if (demo) {
      $('#surfaceWelcome').hidden = false;
      $('#surfaceAccount').textContent = 'МОЙ АККАУНТ';
      $('#surfaceStatus').textContent = 'ДЕМО · ИЗМЕНЕНИЯ ТОЛЬКО ДО ОБНОВЛЕНИЯ';
      $('#surfaceStatus').dataset.warning = 'false';
      return;
    }
    document.body.classList.toggle('account-locked', !next.signedIn || next.ready === false);
    $('#surfaceWelcome').hidden = next.signedIn;
    $('#surfaceAccount').textContent = next.signedIn ? 'АККАУНТ' : 'ВОЙТИ';
    const backLabel = !next.signedIn ? '← К ПРИМЕРАМ' : next.ready === false ? '← К ПЕРЕНОСУ' : '← НА ПОЛЕ';
    textButton('accountBackToField', backLabel); textButton('accountModalClose', backLabel);
    $('#surfaceStatus').textContent = !next.online ? 'ОФЛАЙН · ИЗМЕНЕНИЯ НА УСТРОЙСТВЕ' :
      next.busy ? 'СИНХРОНИЗАЦИЯ…' : next.conflict ? 'НУЖНО ВЫБРАТЬ КОПИЮ В АККАУНТЕ' :
      next.dirty ? next.signedIn ? 'ИЗМЕНЕНИЯ ОЖИДАЮТ СИНХРОНИЗАЦИИ' : 'ЛОКАЛЬНО · ВОЙДИ ДЛЯ СИНХРОНИЗАЦИИ' :
      next.signedIn ? next.ready === false ? 'ПОДГОТОВЬ СВОЮ КОПИЮ V2' : 'V2 СОХРАНЕНА · V1 ОТДЕЛЬНО' : 'ВОЙДИ, ЧТОБЫ ЗАГРУЗИТЬ СВОИ PIN';
    $('#surfaceStatus').dataset.warning = String(Boolean(next.conflict || next.dirty));
    $('#accountAuthActions').parentElement.classList.toggle('signed-in', next.signedIn);
  }
  function openAccount() { if (demo) location.href = accountUrl(); else window.openAccountModal(); }
  function dismissPanelsForNavigation() {
    for (const modal of document.querySelectorAll('.modal.visible')) {
      if (modal.id === 'accountModal') { parked.delete(modal.id); modal.classList.remove('visible'); }
      else minimize(modal);
    }
    renderDock(); closeMenu();
  }
  function goToField() {
    if (!demo && !status.signedIn) { location.assign(demoUrl()); return; }
    dismissPanelsForNavigation();
    if (!demo && status.ready === false) {
      $('#migrationGate')?.scrollIntoView({ block: 'nearest' }); $('#migrationPreview')?.focus(); return;
    }
    window.setView('track'); $('#btnViewTrack').focus();
  }
  window.TRCKNG_NAVIGATION = { fromAccount: goToField };
  function closeMenu() { $('#surfaceMenu').hidden = true; $('#surfaceMenuButton').setAttribute('aria-expanded', 'false'); }
  function arrangeCell(id) {
    closeMenu(); window.setView('layout');
    window.openCellEditModal(id, window.getCellsSnapshot().findIndex(cell => cell.id === id));
  }
  function renderDock() {
    const dock = $('#surfaceDock'); dock.replaceChildren();
    for (const [id, item] of parked) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = `${item.title}${item.pin === null ? '' : ` / PIN ${item.pin + 1}`} ↗`;
      button.onclick = () => {
        if (activeModal) minimize(activeModal);
        if (item.pin !== null && pinNumber() !== item.pin) window.switchPin(item.pin);
        parked.delete(id); item.el.classList.add('visible'); renderDock();
      };
      dock.append(button);
    }
    dock.hidden = parked.size === 0;
  }
  function minimize(modal) {
    const item = { el: modal, pin: ['accountModal', 'cycleModal', 'infoModal', 'scenarioModal', 'workHistoryModal', 'momentModal', 'momentHistoryModal'].includes(modal.id) ? null : Number(modal.dataset.sourcePin ?? pinNumber()), title: modal.querySelector('.surface-panel-title')?.textContent || 'ОКНО' };
    parked.set(modal.id, item); modal.classList.remove('visible'); renderDock();
  }
  function editorStamp(modal, sourcePin) {
    const keys = modal.id === 'cellEditModal' ? ['labels', 'types', 'colors', 'descriptions', 'timer_settings', 'money_settings', 'unit_settings', 'value_formats', 'math_settings', 'cell_flags', 'cell_layout', 'led_settings', 'currency_settings'] :
      modal.id === 'valueModal' ? ['data'] : modal.id === 'currencyModal' ? ['currency_settings'] : [];
    return JSON.stringify(keys.map(key => {
      try {
        const value = JSON.parse((window.TRCKNG_STORAGE || localStorage).getItem(`trckng_sstm_${key}_pin${sourcePin}`) || '{}');
        if (key === 'data') return Object.fromEntries(Object.entries(value).map(([week, cells]) => [week, cells?.[modal.dataset.subjectId]]));
        return value[modal.dataset.subjectId] ?? null;
      } catch (_) { return 'unavailable'; }
    }));
  }
  function setupPanels() {
    const labels = { momentModal: 'ОТМЕТИТЬ МОМЕНТ', momentHistoryModal: 'СЛОВА / СОСТОЯНИЯ', scenarioModal: 'СЦЕНАРИИ / ПОМОЩЬ', workHistoryModal: 'РАБОТА / РАСЧЁТ', cycleModal: 'ОТРЕЗКИ', accountModal: 'АККАУНТ V2', cellEditModal: 'КНОПКА', valueModal: 'ЗНАЧЕНИЕ', currencyModal: 'КОНВЕРТЕР', correctionModal: 'КОРРЕКЦИЯ', dashboardModal: 'ШКАЛЫ', themeModal: 'ЦВЕТА', infoModal: 'О ПРОЕКТЕ' };
    for (const modal of document.querySelectorAll('.modal')) {
      const content = modal.firstElementChild; if (!content) continue;
      const head = document.createElement('div'); head.className = 'surface-panel-head';
      const title = document.createElement('span'); title.className = 'surface-panel-title'; title.textContent = labels[modal.id] || 'НАСТРОЙКИ';
      const min = document.createElement('button'); min.type = 'button'; min.textContent = '—'; min.setAttribute('aria-label', 'Свернуть окно');
      min.onclick = () => minimize(modal);
      const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Закрыть окно');
      close.onclick = () => { parked.delete(modal.id); if (modal.id === 'cellEditModal') window.closeCellEditModal(); else modal.classList.remove('visible'); renderDock(); };
      if (modal.id === 'accountModal') {
        const back = $('#accountBackToField'); back.classList.add('surface-back');
        head.append(back, title, min, close); content.querySelector('.account-navigation')?.remove();
      } else head.append(title, min, close);
      content.prepend(head);
      // A save always uses the editor's source field, including after a desktop
      // PIN switch. This adapter never serializes credentials or form content.
      modal.addEventListener('click', e => {
        if (!e.target.closest('button') || e.target.closest('.surface-panel-head') || ['accountModal', 'cycleModal', 'infoModal', 'scenarioModal', 'workHistoryModal', 'momentModal', 'momentHistoryModal'].includes(modal.id)) return;
        const sourcePin = Number(modal.dataset.sourcePin);
        if (e.target.closest('#cellEditSave,#valueModalSave,#currencyModalSave') && modal.surfaceStamp !== undefined && modal.surfaceStamp !== editorStamp(modal, sourcePin)) {
          e.preventDefault(); e.stopImmediatePropagation();
          let warning = modal.querySelector('.surface-stale');
          if (!warning) { warning = document.createElement('p'); warning.className = 'surface-stale'; warning.setAttribute('role', 'alert'); content.insertBefore(warning, head.nextSibling); }
          warning.textContent = 'Эта кнопка изменилась после открытия окна. Черновик оставлен здесь. Закрой окно и открой кнопку заново, чтобы работать с актуальными данными.';
          return;
        }
        if (Number.isInteger(sourcePin) && sourcePin !== pinNumber()) window.switchPin(sourcePin);
      }, true);
      new MutationObserver(() => {
        if (modal.classList.contains('visible')) {
          if (activeModal && activeModal !== modal && activeModal.classList.contains('visible')) minimize(activeModal);
          activeModal = modal; modal.dataset.sourcePin = String(pinNumber());
          parked.delete(modal.id); renderDock(); closeMenu();
        } else if (activeModal === modal) activeModal = null;
        document.body.classList.toggle('surface-panel-open', Boolean(document.querySelector('.modal.visible')));
      }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    }
  }
  function setupUI() {
    const container = $('.container'), header = $('.header');
    const head = document.createElement('div'); head.className = 'surface-head';
    head.innerHTML = '<a class="surface-brand" href="../">SSTM <small>v2 / 0.5.1</small></a><span class="surface-time">ТВОЁ ПОЛЕ</span><button id="surfaceAccount" type="button">ВОЙТИ</button><button id="surfaceMenuButton" type="button" aria-expanded="false">МЕНЮ</button>';
    header.prepend(head);
    $('.surface-brand').href = demo ? demoUrl() : accountUrl();
    $('.surface-brand').addEventListener('click', event => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); goToField();
    });
    const menu = document.createElement('div'); menu.id = 'surfaceMenu'; menu.hidden = true;
    menu.append($('.controls'));
    menu.insertAdjacentHTML('beforeend', '<button id="surfaceCalendar" type="button" aria-pressed="false">ПРОЦЕНТЫ НА ШКАЛЕ</button><a href="points-lab.html">ТОЧКИ · ЛОКАЛЬНЫЙ ЭКСПЕРИМЕНТ ↗</a><p>Кнопки, записи и расположение сохраняются через твой аккаунт. Новые модули добавляются в режиме «Расставить».</p>');
    const exampleLink = document.createElement('a'); exampleLink.href = demoUrl(); exampleLink.id = 'surfaceDemoLink'; exampleLink.textContent = 'ОТКРЫТЬ ДЕМО С ПРИМЕРАМИ ↗'; menu.prepend(exampleLink);
    const v1Link = document.createElement('a'); v1Link.href = '../'; v1Link.textContent = 'ОТКРЫТЬ V1 ↗'; menu.append(v1Link);
    header.append(menu);
    const bar = document.createElement('div'); bar.className = 'surface-tools'; bar.append($('.pins'), $('.view-tabs')); header.append(bar);
    const actions = $('.controls-edit');
    textButton('btnDecrease', '− РЕЖИМ');
    const undoNumber = textButton('btnUndo', '↶ ЧИСЛО');
    undoNumber.title = 'Отменить последнее изменение числовой кнопки'; undoNumber.setAttribute('aria-label', undoNumber.title);
    textButton('btnViewTrack', 'ПОЛЕ'); textButton('btnViewLayout', 'РАССТАВИТЬ'); textButton('btnViewHistory', 'ИСТОРИЯ');
    $('#btnAccount').hidden = true;
    const zoom = document.createElement('div'); zoom.className = 'surface-zoom';
    zoom.innerHTML = '<button id="surfaceHome" type="button">К КНОПКАМ</button><button id="surfaceZoomOut" aria-label="Уменьшить масштаб" type="button">−</button><output id="surfaceZoom">100%</output><button id="surfaceZoomIn" aria-label="Увеличить масштаб" type="button">+</button>';
    actions.append(zoom); header.append(actions);
    const welcome = document.createElement('div'); welcome.id = 'surfaceWelcome';
    welcome.innerHTML = '<div><strong>ТВОИ PIN — В ТВОЁМ АККАУНТЕ</strong><p>Войди с прежними почтой и паролем. В первый раз создадим отдельную копию v2; затем она будет загружаться автоматически.</p></div><button id="surfaceSignIn" type="button">ВОЙТИ И ЗАГРУЗИТЬ</button>';
    if (demo) {
      document.body.classList.add('surface-demo');
      $('.surface-brand').href = demoUrl();
      $('.surface-time').textContent = 'ДЕМО / ТЕСТОВЫЕ ДАННЫЕ';
      welcome.innerHTML = '<div><strong>ПОПРОБУЙ НА ПРИМЕРАХ</strong><p>Кнопки, настройки и история работают. Данные вымышленные; после обновления начнём заново.</p></div><button id="surfaceSignIn" type="button" hidden>МОЙ АККАУНТ</button><button id="surfaceDemoReset" type="button">СБРОСИТЬ ДЕМО</button>';
      menu.querySelector('p').textContent = 'В этом демо все изменения временные. Три PIN, разные типы кнопок и две недели примеров истории. Чтобы вести свои записи, открой «Мой аккаунт».';
      $('#btnCloudSync').hidden = true; $('#btnImport').hidden = true; $('#btnLayoutNotify').hidden = true;
    }
    header.append(welcome);
    $('#surfaceDemoReset')?.addEventListener('click', () => location.reload());
    const footer = document.createElement('footer'); footer.className = 'surface-footer';
    footer.innerHTML = '<span id="surfaceHint">Нажми кнопку, чтобы записать · РАССТАВИТЬ — настройки</span><button id="surfaceStatus" type="button">ПОДКЛЮЧЕНИЕ…</button>';
    container.append(footer);
    const dock = document.createElement('nav'); dock.id = 'surfaceDock'; dock.hidden = true; dock.setAttribute('aria-label', 'Свёрнутые окна'); container.insertBefore(dock, footer);
    $('#surfaceAccount').onclick = openAccount; $('#surfaceSignIn').onclick = openAccount; $('#surfaceStatus').onclick = openAccount;
    $('#surfaceMenuButton').onclick = () => { const open = menu.hidden; menu.hidden = !open; $('#surfaceMenuButton').setAttribute('aria-expanded', String(open)); };
    $('#surfaceCalendar').onclick = () => { const open = document.body.classList.toggle('show-calendar'); if (open) $('#cycleCalendar').click(); $('#surfaceCalendar').setAttribute('aria-pressed', String(open)); closeMenu(); };
    $('#surfaceHome').onclick = () => { document.querySelector('.view-panel:not([hidden])')?.scrollTo(0, 0); remember(); };
    const zoomBy = delta => { remember(); cameras[cameraId()] = { ...(cameras[cameraId()] || {}), size: Math.min(192, Math.max(96, step() + delta)) }; restore(); saveCameras(); };
    $('#surfaceZoomOut').onclick = () => zoomBy(-32); $('#surfaceZoomIn').onclick = () => zoomBy(32);
    document.querySelectorAll('.pin, .view-tab').forEach(button => button.addEventListener('pointerdown', remember));
    document.querySelectorAll('.view-tab').forEach(button => button.addEventListener('click', dismissPanelsForNavigation, true));
    new MutationObserver(() => { restore(); $('#surfaceHint').textContent = visibleView() === 'layout' ? 'Нажми пустую ячейку или кнопку, чтобы настроить её' : 'Нажми кнопку, чтобы записать · РАССТАВИТЬ — настройки'; }).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
    document.querySelectorAll('.pin').forEach(button => button.addEventListener('click', () => requestAnimationFrame(restore)));
    document.querySelectorAll('.view-panel').forEach(view => view.addEventListener('scroll', () => { if (!view.hidden) remember(); }, { passive: true }));
    $('#habitsGrid').addEventListener('click', event => { const cell = event.target.closest('.empty-field-cell'); if (cell) arrangeCell(cell.dataset.cellId); });
    const refreshLabels = () => {
      document.querySelectorAll('.empty-field-cell').forEach(cell => { cell.textContent = '+'; cell.title = 'Настроить свободную ячейку'; });
      document.querySelectorAll('.layout-cell[data-empty="true"] .layout-cell-name').forEach(label => { label.textContent = 'СВОБОДНО'; });
      document.querySelectorAll('.layout-cell').forEach(cell => { cell.tabIndex = 0; cell.setAttribute('role', 'group'); cell.setAttribute('aria-label', 'Настройка кнопки'); });
    };
    new MutationObserver(refreshLabels).observe($('#habitsGrid'), { childList: true });
    new MutationObserver(refreshLabels).observe($('#layoutGrid'), { childList: true });
    $('#layoutGrid').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.layout-cell')) { e.preventDefault(); arrangeCell(e.target.dataset.cellId); } });
    textButton('accountSignIn', 'ВОЙТИ'); textButton('accountSignOut', 'ВЫЙТИ ИЗ АККАУНТА');
    textButton('accountBackToField', demo ? '← НА ПОЛЕ' : '← К ПРИМЕРАМ'); textButton('accountModalClose', demo ? '← НА ПОЛЕ' : '← К ПРИМЕРАМ');
    textButton('accountLoad', 'ЗАГРУЗИТЬ ИЗ ОБЛАКА'); textButton('accountUpload', 'СОХРАНИТЬ В ОБЛАКО');
    $('#accountPassword').placeholder = 'Пароль';
    $('#accountPassword').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#accountSignIn').click(); } });
    $('#accountEmail').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#accountPassword').focus(); } });
    setupPanels(); restore(); refreshLabels();
    const resizePanels = new ResizeObserver(() => {
      document.body.style.setProperty('--panel-top', `${Math.ceil(header.getBoundingClientRect().bottom)}px`);
      document.body.style.setProperty('--panel-bottom', `${Math.ceil(footer.getBoundingClientRect().height + (dock.hidden ? 0 : dock.getBoundingClientRect().height))}px`);
    });
    [header, footer, dock].forEach(element => resizePanels.observe(element));
    window.addEventListener('trckng-account-state', event => updateStatus(event.detail));
    window.addEventListener('online', () => updateStatus({ ...status, online: true }));
    window.addEventListener('offline', () => updateStatus({ ...status, online: false }));
    window.addEventListener('pagehide', remember);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!menu.hidden) closeMenu();
      else if (document.querySelector('.modal.visible')) dismissPanelsForNavigation();
      else return;
      event.preventDefault(); event.stopImmediatePropagation();
    }, true);
  }
  async function boot() {
    window.TRCKNG_SURFACE = 'v2';
    await loadScript('../app-config.js');
    await loadScript('./modules.js'); await loadScript('./moments.js'); await loadScript('./data.js');
    // Explicit demo links never initialize Auth or read an existing session.
    // For an ordinary first visit, the SDK decides whether this is a returning account.
    if (!demo) {
      try {
        await loadScript('./vendor/supabase-2.116.0.js');
        const config = window.TRCKNG_CONFIG || {};
        const projectUrl = localStorage.getItem('trckng_sstm_supabase_url') || config.supabaseUrl;
        const key = localStorage.getItem('trckng_sstm_supabase_anon_key') || config.supabaseAnonKey;
        const table = config.supabaseTable || 'trckng_snapshots';
        if (projectUrl && key) {
          const client = window.supabase.createClient(projectUrl.trim(), key.trim(), { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } });
          window.TRCKNG_PREPARED_CLIENT = { client, signature: `${projectUrl.trim()}|${key.trim()}|${table.trim()}` };
          const { data, error } = await client.auth.getSession();
          window.TRCKNG_ACCOUNT_OWNER = data.session?.user.id || null;
          if (requestedMode !== 'account') demo = Boolean(error || !data.session);
        } else demo = requestedMode !== 'account';
      } catch (_) { demo = requestedMode !== 'account'; }
    }
    if (demo) {
      // Discard the session-probe client before running the demo. This also
      // removes its auth listeners, so another tab's login cannot affect the demo.
      if (requestedMode !== 'demo') { location.replace(demoUrl()); return; }
      await loadScript('./demo-data.js');
      window.TRCKNG_DEMO = true;
      window.TRCKNG_STORAGE = window.SstmDemo.createStorage();
      window.TRCKNG_PREPARED_CLIENT?.client.auth.stopAutoRefresh();
      document.body.dataset.mode = 'demo';
    } else {
      document.body.dataset.mode = 'account';
      document.body.classList.add('account-locked');
      window.TRCKNG_CLOUD_TABLE = 'trckng_v2_snapshots';
      // One engine writer per local account. Separate devices use cloud revisions.
      if (window.TRCKNG_ACCOUNT_OWNER) {
        if (!navigator.locks) throw new Error('Для сохранения v2 нужен современный браузер с защищённым локальным хранилищем.');
        const acquired = await new Promise((resolve, reject) => {
          navigator.locks.request(`sstm-v2:${window.TRCKNG_ACCOUNT_OWNER}`, { ifAvailable: true }, lock => {
            if (!lock) { resolve(false); return; }
            resolve(true);
            return new Promise(release => window.addEventListener('pagehide', release, { once: true }));
          }).catch(reject);
        });
        if (!acquired) throw new Error('V2 уже открыта в другой вкладке. Продолжай там или закрой её и обнови эту страницу.');
        window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
      }
      const memory = new Map();
      const backing = window.TRCKNG_ACCOUNT_OWNER ? localStorage : { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
      window.TRCKNG_STORAGE = window.SstmData.storage(backing, window.TRCKNG_ACCOUNT_OWNER);
      await loadScript('./account.js');
    }
    viewStorage = window.TRCKNG_STORAGE;
    window.TRCKNG_SNAPSHOT = {
      export: () => {
        const modules = JSON.parse(viewStorage.getItem('sstm_v2_modules') || 'null') || window.SstmModules.empty();
        const journal = JSON.parse(viewStorage.getItem('sstm_v2_cycles') || 'null') || window.SstmData.emptyJournal();
        const modern = Boolean(modules.tracks.length || journal.version === 2);
        return { dataset: 'sstm-v2', dataVersion: modern ? 2 : 1, ...(modern ? { moduleJournal: modules } : {}), migration: JSON.parse(viewStorage.getItem('sstm_v2_migration') || 'null'), cycleJournal: journal };
      },
      validate: snapshot => { window.SstmData.validate(snapshot); if (snapshot.dataset !== 'sstm-v2') throw new Error('Используй перенос v1 через аккаунт.'); },
      apply: snapshot => { viewStorage.setItem('sstm_v2_cycles', JSON.stringify(snapshot.cycleJournal || window.SstmData.emptyJournal())); viewStorage.setItem('sstm_v2_modules', JSON.stringify(snapshot.moduleJournal || window.SstmModules.empty())); viewStorage.setItem('sstm_v2_migration', JSON.stringify(snapshot.migration || null)); }
    };
    try { cameras = JSON.parse(viewStorage.getItem(cameraKey)) || {}; } catch (_) { /* Device-only view. */ }
    const response = await fetch(url('../index.html'));
    if (!response.ok) throw new Error('Не удалось открыть интерфейс. Обнови страницу.');
    const source = new DOMParser().parseFromString(await response.text(), 'text/html');
    // Only the trusted local repository template is used here, never a user export.
    source.querySelectorAll('script').forEach(script => script.remove());
    document.body.replaceChildren(...[...source.body.children].map(node => document.importNode(node, true)));
    document.body.classList.add('v2-surface');
    await loadScript('./cycles.js');
    await loadScript('./scenarios.js');
    await loadScript('./tag-input.js');
    await loadScript('./marks.js');
    setupUI();
    window.TRCKNG_MODULES.installNavigation();
    await loadScript('../history-matrix.js'); await loadScript('../app.js');
    window.TRCKNG_RESUME_CELL_EDITOR = () => {
      const saved = parked.get('cellEditModal');
      if (saved) {
        if (pinNumber() !== saved.pin) window.switchPin(saved.pin);
        parked.delete('cellEditModal'); saved.el.classList.add('visible'); renderDock();
      }
      return Boolean(saved || $('#cellEditModal.visible'));
    };
    // The old engine owns one editor per kind. Resume an existing draft before
    // opening a second editor of that kind, so its form/context cannot be lost.
    for (const [name, id] of Object.entries({ openCellEditModal: 'cellEditModal', openValueModal: 'valueModal', openCurrencyModal: 'currencyModal', openDurationCorrectionModal: 'correctionModal', openThemeModal: 'themeModal', openDashboardModal: 'dashboardModal' })) {
      const original = window[name]; if (typeof original !== 'function') continue;
      window[name] = function (...args) {
        const saved = parked.get(id);
        if (saved) {
          if (pinNumber() !== saved.pin) window.switchPin(saved.pin);
          parked.delete(id); saved.el.classList.add('visible'); renderDock();
          $('#surfaceHint').textContent = 'Открыт незавершённый черновик. Сохрани или закрой его, чтобы настроить другую кнопку.';
          return;
        }
        const result = original.apply(this, args);
        const modal = document.getElementById(id);
        modal.dataset.subjectId = String(args[0] || '');
        modal.surfaceStamp = editorStamp(modal, pinNumber());
        modal.querySelector('.surface-stale')?.remove();
        return result;
      };
    }
    await loadScript('./field.js');
    await loadScript('./clocks.js');
    restore();
    if (!demo && !status.signedIn) openAccount();
    // Account changes/sign-out are navigated once by account.js.
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js', { scope: './' }).then(registration => {
      // Sign-in can navigate while the first install is claiming the old page.
      // Claim the new page too, without reloading or interrupting capture.
      const worker = registration.installing || registration.waiting || registration.active;
      if (!worker) return;
      const claim = () => { if (worker.state === 'activated') worker.postMessage({ type: 'SSTM_V2_CLAIM' }); };
      worker.addEventListener('statechange', claim); claim();
    }).catch(error => console.warn('V2 offline shell unavailable', error.message));
  }
  boot().catch(error => {
    const message = document.createElement('p'); message.id = 'surfaceLoadError'; message.setAttribute('role', 'alert'); message.textContent = error.message;
    const back = document.createElement('a'); back.href = '../'; back.textContent = 'ОТКРЫТЬ v1'; document.body.append(message, back);
  });
})();
