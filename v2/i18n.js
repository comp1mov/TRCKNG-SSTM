'use strict';
(() => {
  const key = 'sstm_ui_language';
  let saved; try { saved = localStorage.getItem(key); } catch (_) {}
  const requested = new URL(location.href).searchParams.get('lang');
  let language = (requested || saved) === 'ru' ? 'ru' : 'en';
  const entries = new Map(), originals = new WeakMap(), attributeSources = new WeakMap();
  const protectedContent = 'script,style,code,pre,textarea,[contenteditable],[data-no-i18n],.btn-label,.btn-value,.btn-breakdown,.layout-cell-name,.pin,.account-value,.stats-table th[data-col],.history-matrix tbody th,.matrix-records,.matrix-detail-header strong,.cycle-name:not(.unnamed),.cycle-moments,.moment-row strong,#momentWeekTags,#tagSuggestions,#momentContext,#workHistorySelect option,#moduleTrack option:not([value=""])';
  for (const line of window.SstmTranslations.trim().split('\n')) {
    const [ru, en] = line.split('|'); if (!en) continue;
    entries.set(ru, { ru, en }); entries.set(en, { ru, en });
  }
  const patterns = [
    ['Название точки {0}', 'Point {0} name'], ['Название отрезка {0}', 'Interval {0} name'],
    ['Теги отрезка {0}', 'Interval {0} tags'], ['Точка {0} · название необязательно', 'Point {0} · optional name'],
    ['Отрезок {0} · название необязательно', 'Interval {0} · optional name'],
    ['Время точки {0} · местное время устройства', 'Point {0} time · local device time'],
    ['Время точки {0}', 'Point {0} time'], ['Исправить время точки {0}', 'Edit point {0} time'],
    ['Переименовать точку {0}', 'Rename point {0}'], ['Переименовать отрезок {0}', 'Rename interval {0}'],
    ['Изменить теги отрезка {0}', 'Edit interval {0} tags'], ['Отрезок {0}: {1}', 'Interval {0}: {1}'],
    ['точка {0}', 'point {0}'], ['отрезок {0}', 'interval {0}'], ['{0} · идёт', '{0} · running'],
    ['УБРАТЬ ПОСЛЕДНЮЮ ТОЧКУ {0}', 'REMOVE LAST POINT {0}'],
    ['Последние {0} записей · общая шкала 0–{1} ч', 'Last {0} recordings · shared 0–{1} h scale'],
    ['{0} / час', '{0} / hour'], ['{0} каждую секунду работы', '{0} each work second'],
    ['Сценарий для PIN {0}. Проверь настройки и нажми SAVE.', 'Scenario for PIN {0}. Review settings and press SAVE.'],
    ['{0} полных ч', '{0} whole hours'], ['{0} · сохранено', '{0} · saved'],
    ['Состояние · PIN {0}', 'State · PIN {0}'], ['Слово · PIN {0}', 'Word · PIN {0}'],
    ['3 PIN · {0} кнопок · история и настройки · копия от {1}', '3 PINs · {0} buttons · history and settings · copy from {1}'],
    ['Вся запись · отрезок {0}', 'Recording · interval {0}'],
    ['Запись {0} · {1} · идёт', 'Recording {0} · {1} · running'],
    ['ЗАПИСЬ {0} · ИДЁТ', 'RECORDING {0} · RUNNING'], ['ЗАПИСЬ {0} · СОХРАНЕНА', 'RECORDING {0} · SAVED'],
    ['{0} → сейчас', '{0} → now'], ['{0} → идёт', '{0} → running'],
    ['Найти / другие записи · {0}', 'Find / other recordings · {0}'],
    ['История исправлений · все записи · {0}', 'Correction history · all recordings · {0}'],
    ['Ставка {0} / час · PIN {1}', 'Rate {0} / hour · PIN {1}'],
    ['Полных отработанных часов: {0}', 'Whole hours worked: {0}'],
    ['Следующий полный час: {0} из 60 мин', 'Next whole hour: {0} of 60 min'],
    ['{0} кнопок · поле {1}', '{0} buttons · field {1}'], ['{0} м', '{0} m'], ['{0} ч', '{0} h'],
    ['Запись {0}', 'Recording {0}'], ['ЗАПИСЬ {0}', 'RECORDING {0}']
  ].flatMap(([ru, en]) => [ru, en].map(source => {
    const slots = [], escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\\\{(\d+)\\\}/g, (_, n) => { slots.push(Number(n)); return '(.+?)'; });
    return { regex: new RegExp(`^${regex}$`), slots, ru, en };
  }));
  function text(value) {
    const str = String(value), trimmed = str.trim(), entry = entries.get(trimmed);
    let translated = entry?.[language];
    if (translated === undefined && trimmed.endsWith('.') && entries.has(trimmed.slice(0, -1))) translated = entries.get(trimmed.slice(0, -1))[language] + '.';
    if (translated === undefined) for (const p of patterns) {
      const match = p.regex.exec(trimmed); if (!match) continue;
      const args = {}; p.slots.forEach((slot, i) => { args[slot] = match[i + 1]; });
      translated = p[language].replace(/\{(\d+)\}/g, (_, n) => args[n]); break;
    }
    return translated === undefined ? str : str.replace(trimmed, () => translated);
  }
  function translateNode(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(protectedContent) && !parent.closest('[data-ui-state]')) return;
    if (parent.closest('.cycle-tags') && !['+ тег', '+ tag'].includes(node.data)) return;
    const prior = originals.get(node), source = prior && node.data === prior.last ? prior.source : node.data;
    const translated = text(source);
    originals.set(node, { source, last: translated });
    if (translated !== node.data) node.data = translated;
  }
  function translateAttributes(element) {
    if (element.closest('script,style,code,pre,[data-no-i18n]')) return;
    let prior = attributeSources.get(element); if (!prior) { prior = {}; attributeSources.set(element, prior); }
    for (const attr of ['title', 'placeholder', 'aria-label']) {
      const value = element.getAttribute(attr); if (!value) continue;
      const source = prior[attr]?.last === value ? prior[attr].source : value, translated = text(source);
      prior[attr] = { source, last: translated };
      if (translated !== value) element.setAttribute(attr, translated);
    }
  }
  function apply(root = document.body) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { translateNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateNode(walker.currentNode);
    root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(translateAttributes);
  }
  let started = false;
  function start() {
    if (started) return; started = true; document.documentElement.lang = language; apply();
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') translateNode(record.target);
        else if (record.type === 'attributes') translateAttributes(record.target);
        else record.addedNodes.forEach(apply);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label'] });
  }
  function setLanguage(value) {
    if (!['en', 'ru'].includes(value)) return;
    language = value; document.documentElement.lang = value;
    try { localStorage.setItem(key, value); } catch (_) {}
    const target = new URL(location.href); target.searchParams.set('lang', value); history.replaceState(null, '', target);
    apply(); window.dispatchEvent(new Event('sstm-language-changed')); window.SstmReadability?.fit();
  }
  window.SstmI18n = { text, start, apply, setLanguage, get language() { return language; }, get locale() { return language === 'ru' ? 'ru-RU' : 'en-GB'; } };
  document.documentElement.lang = language;
  const confirm = window.confirm.bind(window), alert = window.alert.bind(window);
  window.confirm = message => confirm(text(message)); window.alert = message => alert(text(message));
  start();
})();
