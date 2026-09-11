'use strict';

// Device-only presentation preference. Move the existing controls, preserving
// their handlers and drafts; collapsing never changes tracking or field layout.
(() => {
  const $ = selector => document.querySelector(selector);
  const header = $('.header'), menu = $('#surfaceMenu'), toggle = $('#surfacePanelToggle');
  const small = matchMedia('(max-width:600px), (max-height:560px)');
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
    return saved === 'compact' || saved !== 'expanded' && small.matches;
  }
  function apply(compact) {
    const focused = document.activeElement;
    menu.hidden = true; $('#surfaceMenuButton').setAttribute('aria-expanded', 'false');
    document.body.classList.toggle('surface-compact', compact);
    for (const { element, home } of groups) {
      if (compact) menu.append(element); else home.after(element);
    }
    if (compact) menu.prepend(groups[0].element, groups[1].element);
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
    if (event.target.closest('.view-tab,#surfaceScenarios,#btnInfo,#btnExport,#btnImport,#surfaceSignIn')) {
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
    menu.style.top = `${rect.bottom - parent.top}px`;
    menu.style.maxHeight = `${Math.max(44, bottom - rect.bottom - 12)}px`;
  }
  small.addEventListener('change', () => apply(preferred()));
  new ResizeObserver(fitMenu).observe(header);
  window.visualViewport?.addEventListener('resize', fitMenu);
  window.visualViewport?.addEventListener('scroll', fitMenu);
  window.addEventListener('resize', fitMenu);
  apply(preferred()); fitMenu();
})();
