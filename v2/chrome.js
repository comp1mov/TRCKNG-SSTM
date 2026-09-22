'use strict';

// Device-only presentation preference. Move the existing controls, preserving
// their handlers and drafts; collapsing never changes tracking or field layout.
(() => {
  const $ = selector => document.querySelector(selector);
  const header = $('.header'), menu = $('#surfaceMenu'), toggle = $('#surfacePanelToggle');
  const small = matchMedia('(max-width:800px), (max-height:560px)');
  const section = (label, id) => {
    const details = document.createElement('details'); details.className = 'surface-menu-section'; details.id = id;
    const summary = document.createElement('summary'); summary.textContent = label;
    const body = document.createElement('div'); details.append(summary, body); menu.append(details); return body;
  };
  const settings = section('Вид и настройки', 'surfaceAppearance');
  for (const selector of ['#surfaceNight', '.surface-language', '.surface-prompt-setting', '#surfaceDemoLink']) {
    const item = menu.querySelector(selector); if (item) settings.append(item);
  }
  const fieldSettings = section('Управление полем', 'surfaceFieldSettings');
  const controls = menu.querySelector('.controls'); if (controls) fieldSettings.append(controls);
  const hint = menu.querySelector(':scope > p'); if (hint) fieldSettings.append(hint);
  // Account owns file transfer; do not duplicate these actions among field tools.
  for (const id of ['btnExport', 'btnImport']) { const button = $('#' + id); if (button) button.hidden = true; }
  const heading = document.createElement('div'); heading.className = 'surface-menu-heading';
  const version = document.createElement('span'); version.textContent = 'SSTM v2 · 0.11.0';
  const reload = document.createElement('button'); reload.type = 'button'; reload.textContent = 'ОБНОВИТЬ'; reload.id = 'surfaceReload';
  reload.onclick = async () => {
    if (!confirm(window.SstmI18n.language === 'en' ? 'Reload the app? Saved records stay on this device. Unsaved text in open forms will be lost.' : 'Обновить приложение? Сохранённые записи останутся на устройстве. Несохранённый текст в открытых формах будет потерян.')) return;
    try { await (await navigator.serviceWorker?.getRegistration())?.update(); } catch (_) {}
    location.reload();
  };
  heading.append(version, reload); menu.prepend(heading);
  const groups = [$('.view-tabs'), $('.controls-edit'), $('#surfaceWelcome')].map((element, i) => {
    const home = document.createComment('expanded panel position'); element.before(home);
    if (!element.id) element.id = `surfacePanelGroup${i}`;
    return { element, home };
  });
  toggle.setAttribute('aria-controls', groups.map(({ element }) => element.id).join(' '));
  const preferences = new Map();
  const preferenceKey = () => `sstm_ui_chrome_${small.matches ? 'small' : 'large'}`;
  function preferred() {
    const key = preferenceKey();
    let saved = preferences.get(key);
    if (saved === undefined) { try { saved = localStorage.getItem(key); } catch (_) {} }
    return small.matches || saved === 'compact';
  }
  function apply(compact) {
    const focused = document.activeElement;
    menu.hidden = true; $('#surfaceMenuButton').setAttribute('aria-expanded', 'false');
    document.body.classList.toggle('surface-compact', compact);
    for (const { element, home } of groups) {
      if (compact) (element.classList.contains('controls-edit') ? fieldSettings : menu).append(element); else home.after(element);
    }
    if (compact) heading.after(groups[0].element);
    toggle.textContent = compact ? '⌄' : '⌃';
    toggle.setAttribute('aria-expanded', String(!compact));
    toggle.setAttribute('aria-label', compact ? 'Показать панели' : 'Свернуть панели');
    toggle.title = compact ? 'Показать панели' : 'Свернуть панели';
    if (groups.some(({ element }) => element.contains(focused))) toggle.focus({ preventScroll: true });
  }
  toggle.onclick = () => {
    const compact = !document.body.classList.contains('surface-compact'), key = preferenceKey();
    preferences.set(key, compact ? 'compact' : 'expanded');
    try { localStorage.setItem(key, preferences.get(key)); } catch (_) {}
    apply(compact);
  };
  // Account actions should open their window without an overlapping menu.
  menu.addEventListener('click', event => {
    if (event.target.closest('.view-tab,#surfaceScenarios,#surfaceMoments,#btnInfo,#btnExport,#btnImport,#surfaceSignIn')) {
      menu.hidden = true; $('#surfaceMenuButton').setAttribute('aria-expanded', 'false');
    }
  });
  let dismissedFromField = false;
  document.addEventListener('pointerdown', event => {
    dismissedFromField = false;
    if (!menu.hidden && !menu.contains(event.target) && !$('#surfaceMenuButton').contains(event.target)) {
      dismissedFromField = Boolean(event.target.closest('.view-panel,#cycleClock'));
      menu.hidden = true; $('#surfaceMenuButton').setAttribute('aria-expanded', 'false');
      if (dismissedFromField) { event.preventDefault(); event.stopImmediatePropagation(); }
    }
  }, true);
  // The original counters use touch/mouse press handlers, not only click.
  for (const type of ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click']) document.addEventListener(type, event => {
    if (dismissedFromField && event.target.closest('.view-panel,#cycleClock')) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, { capture: true, passive: false });
  document.addEventListener('pointercancel', () => { dismissedFromField = false; });
  function fitMenu() {
    const rect = $('.surface-head').getBoundingClientRect(), parent = header.getBoundingClientRect();
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.offsetTop + viewport.height : innerHeight;
    menu.style.top = `${small.matches ? rect.bottom : rect.bottom - parent.top}px`;
    menu.style.maxHeight = `${Math.max(44, bottom - rect.bottom - 12)}px`;
  }
  small.addEventListener('change', () => apply(preferred()));
  new ResizeObserver(fitMenu).observe(header);
  window.visualViewport?.addEventListener('resize', fitMenu);
  window.visualViewport?.addEventListener('scroll', fitMenu);
  window.addEventListener('resize', fitMenu);
  apply(preferred()); fitMenu();
})();
