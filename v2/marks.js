'use strict';
(() => {
  const M = window.SstmMoments, D = window.SstmData, T = window.SstmTagInput, store = window.TRCKNG_STORAGE, previous = window.TRCKNG_MODULES;
  const $ = id => document.getElementById(id), read = () => JSON.parse(store.getItem('sstm_v2_cycles') || 'null') || D.emptyJournal();
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
  const button = (text, action, cls) => { const n = el('button', text, cls); n.type = 'button'; n.onclick = action; return n; };
  const clock = at => new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = at => new Date(at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  let draft = null, wordDraft = null, inlineNode = null, suggestions = [], suggestionIndex = -1, composing = false, wheelPage = 0, weekAt = Date.now(), filter = '', lastSaved = null;
  const ready = () => !window.TRCKNG_ACCOUNT || window.TRCKNG_ACCOUNT.ready;
  const draftKey = d => `${d.source.pin}/${d.source.cellId}`;
  function wordDrafts() {
    const values = JSON.parse(store.getItem('sstm_v2_tag_drafts') || '{}'), old = JSON.parse(store.getItem('sstm_v2_moment_draft') || 'null');
    if (old?.kind === 'tag') { values[draftKey(old)] ||= old; store.setItem('sstm_v2_tag_drafts', JSON.stringify(values)); store.removeItem('sstm_v2_moment_draft'); }
    return values;
  }
  const saveWord = () => { if (wordDraft) { const values = wordDrafts(); values[draftKey(wordDraft)] = wordDraft; store.setItem('sstm_v2_tag_drafts', JSON.stringify(values)); } };
  const clearWord = () => { if (wordDraft) { const values = wordDrafts(); delete values[draftKey(wordDraft)]; store.setItem('sstm_v2_tag_drafts', JSON.stringify(values)); } wordDraft = null; };
  const newDraft = cell => { const at = Date.now(); return { id: crypto.randomUUID(), kind: cell.type, at, offsetMinutes: new Date(at).getTimezoneOffset(), source: { pin: cell.pin, cellId: cell.id, label: cell.label }, text: '' }; };
  function persist(journal) {
    if (!ready()) throw Error('Сначала открой свой аккаунт.');
    D.validateJournal(journal); store.setItem('sstm_v2_cycles', JSON.stringify(journal));
    window.markCloudDirty('moment'); refresh(); renderWeek(); window.dispatchEvent(new Event('sstm-v2-moments-changed'));
  }
  const modal = el('div', null, 'modal'); modal.id = 'momentModal';
  modal.innerHTML = `<div><p id="momentWhen" class="moment-when"></p><p id="momentContext" class="moment-note"></p>
    <section id="momentStateForm"><p class="moment-note">Коснись состояния — оно сразу сохранится. Или веди из центра к слову и отпусти.</p><div id="stateWheel" class="state-wheel"><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="111"/><path d="M150 18v264 M18 150h264 M57 57l186 186 M57 243L243 57"/></svg><button id="stateOrigin" type="button" aria-label="Веди из центра к состоянию">●</button><div id="stateOptions"></div></div><nav id="statePages"><button id="statePrevious" type="button" aria-label="Предыдущие состояния">←</button><output id="statePageLabel"></output><button id="stateNext" type="button" aria-label="Следующие состояния">→</button></nav><details id="stateCustom"><summary>+ СВОЁ СОСТОЯНИЕ</summary><form id="stateAddForm"><label for="stateNewLabel">Название для меню</label><input id="stateNewLabel" maxlength="40" placeholder="Своё слово" autocomplete="off"><button type="submit">ДОБАВИТЬ В МЕНЮ</button></form></details></section>
    <p id="momentError" role="alert"></p><button id="momentCancel" type="button">ОТМЕНА</button></div>`;
  document.body.append(modal);
  modal.querySelector('#stateWheel svg').setAttribute('preserveAspectRatio', 'none');
  const history = el('div', null, 'modal'); history.id = 'momentHistoryModal';
  history.innerHTML = '<div><nav class="moment-week-nav"><button id="momentWeekPrev" type="button" aria-label="Предыдущая неделя отметок">←</button><output id="momentWeekLabel"></output><button id="momentWeekNext" type="button" aria-label="Следующая неделя отметок">→</button></nav><button id="momentWeekToday" type="button">ЭТА НЕДЕЛЯ</button><p class="moment-note">Слова, состояния и теги отрезков · все PIN. Недели — пн–вс по часам этого устройства.</p><div id="momentWeekTags"></div><div id="momentWeekRows"></div></div>';
  document.body.append(history);
  const inline = el('form', null, 'tag-inline'); inline.id = 'momentTagForm'; inline.hidden = true;
  inline.innerHTML = '<input id="momentWords" maxlength="500" placeholder="#слово" aria-label="Хештег" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="tagSuggestions"><div class="tag-inline-actions"><button id="tagSave" type="submit" aria-label="Сохранить тег">✓</button><button id="tagCancel" type="button" aria-label="Отменить ввод тега">×</button></div><p id="tagInlineError" role="alert"></p>';
  document.body.append(inline);
  const popup = el('div', null, 'tag-suggestions'); popup.id = 'tagSuggestions'; popup.hidden = true; popup.setAttribute('role', 'listbox'); popup.setAttribute('aria-label', 'Подсказки тегов'); document.body.append(popup);
  function parkWord() {
    inlineNode?.classList.remove('tag-editing'); inlineNode = null; inline.hidden = true;
    popup.hidden = true; $('momentWords').setAttribute('aria-expanded', 'false'); $('momentWords').removeAttribute('aria-activedescendant');
    document.body.append(inline); wordDraft = null; refresh();
  }
  function positionSuggestions() {
    if (!inlineNode || popup.hidden) return;
    const box = inline.getBoundingClientRect(), vv = window.visualViewport;
    const top = vv?.offsetTop || 0, left = vv?.offsetLeft || 0, width = vv?.width || innerWidth, height = vv?.height || innerHeight;
    const below = top + height - box.bottom - 8, above = box.top - top - 8, maxHeight = Math.min(224, Math.max(44, below, above));
    const popupWidth = Math.min(260, width - 16), actualHeight = Math.min(suggestions.length * 44 + 2, maxHeight);
    popup.style.width = `${popupWidth}px`; popup.style.maxHeight = `${maxHeight}px`;
    popup.style.left = `${Math.max(left + 8, Math.min(box.left, left + width - popupWidth - 8))}px`;
    popup.style.top = `${below >= actualHeight || below >= above ? box.bottom + 2 : Math.max(top + 4, box.top - actualHeight - 2)}px`;
  }
  function selectSuggestion(index) {
    suggestionIndex = index;
    [...popup.children].forEach((n, i) => n.setAttribute('aria-selected', String(i === index)));
    if (index >= 0) { $('momentWords').setAttribute('aria-activedescendant', popup.children[index].id); popup.children[index].scrollIntoView({ block: 'nearest' }); }
    else $('momentWords').removeAttribute('aria-activedescendant');
  }
  function useSuggestion(word) {
    const input = $('momentWords'), value = T.complete(input.value, input.selectionStart, word);
    input.value = value.text; input.focus({ preventScroll: true }); input.setSelectionRange(value.caret, value.caret);
    wordDraft.text = value.text; saveWord(); popup.hidden = true; suggestions = []; selectSuggestion(-1); input.setAttribute('aria-expanded', 'false');
  }
  function updateSuggestions() {
    if (!inlineNode || !wordDraft) return;
    const input = $('momentWords'); suggestions = composing ? [] : T.suggest(read(), input.value, input.selectionStart);
    popup.replaceChildren(...suggestions.map((word, index) => {
      const b = button(`#${word}`, () => useSuggestion(word)); b.id = `tag-option-${index}`; b.setAttribute('role', 'option'); b.tabIndex = -1;
      b.onpointerdown = e => e.preventDefault(); b.onpointermove = () => selectSuggestion(index); return b;
    }));
    selectSuggestion(-1); popup.hidden = !suggestions.length; input.setAttribute('aria-expanded', String(!popup.hidden)); positionSuggestions();
  }
  function openWord(cell, node) {
    if (!ready()) return;
    parkWord(); wordDraft = wordDrafts()[`${cell.pin}/${cell.id}`] || newDraft(cell); saveWord();
    inlineNode = node; node.classList.add('tag-editing'); node.append(inline); inline.hidden = false;
    const input = $('momentWords'); input.value = wordDraft.text; $('tagInlineError').textContent = ''; composing = false;
    $('surfaceHint').textContent = `${clock(wordDraft.at)} · введи слово · Enter / ✓ сохранить · Esc свернуть`;
    // Keep focus in the initiating tap so iOS can open its software keyboard.
    input.focus({ preventScroll: true }); node.scrollIntoView({ block: 'nearest', inline: 'nearest' }); updateSuggestions();
  }
  inline.onsubmit = e => {
    e.preventDefault(); if (!wordDraft || composing) return;
    try {
      const saved = wordDraft; persist(M.record(read(), saved)); clearWord(); parkWord(); lastSaved = saved.id;
      $('surfaceHint').textContent = `${clock(saved.at)} · ${M.tags(saved.text).map(t => `#${t}`).join(' ')} · сохранено`; $('momentUndo').hidden = false;
    } catch (error) { $('tagInlineError').textContent = error.message; $('surfaceHint').textContent = error.message; popup.hidden = true; input.setAttribute('aria-expanded', 'false'); selectSuggestion(-1); }
  };
  $('tagCancel').onclick = () => { clearWord(); parkWord(); };
  const input = $('momentWords');
  input.oninput = () => { if (wordDraft) { wordDraft.text = input.value; saveWord(); $('tagInlineError').textContent = ''; updateSuggestions(); } };
  input.oncompositionstart = () => { composing = true; updateSuggestions(); }; input.oncompositionend = () => { composing = false; input.oninput(); };
  input.onclick = updateSuggestions;
  input.onkeydown = e => {
    if (e.isComposing || composing) return;
    if (['ArrowDown', 'ArrowUp'].includes(e.key) && suggestions.length && !popup.hidden) { e.preventDefault(); selectSuggestion((suggestionIndex + (e.key === 'ArrowDown' ? 1 : suggestions.length - 1) + suggestions.length) % suggestions.length); }
    if (e.key === 'Enter' && !popup.hidden && suggestionIndex >= 0) { e.preventDefault(); useSuggestion(suggestions[suggestionIndex]); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); parkWord(); }
  };
  document.addEventListener('pointerdown', e => { if (inlineNode && !inlineNode.contains(e.target) && !popup.contains(e.target)) parkWord(); }, true);
  document.addEventListener('focusin', e => { if (inlineNode && !inlineNode.contains(e.target) && !popup.contains(e.target)) parkWord(); });
  document.addEventListener('keydown', e => { if (inlineNode && e.key === 'Escape' && inline.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); parkWord(); } }, true);
  document.addEventListener('scroll', positionSuggestions, true); window.addEventListener('resize', positionSuggestions);
  window.visualViewport?.addEventListener('resize', () => { if (inlineNode) { input.scrollIntoView({ block: 'nearest' }); positionSuggestions(); } });
  window.visualViewport?.addEventListener('scroll', positionSuggestions);
  new MutationObserver(() => { if (inlineNode && (document.body.dataset.view !== 'track' || document.body.classList.contains('account-locked'))) parkWord(); }).observe(document.body, { attributes: true, attributeFilter: ['data-view', 'class'] });
  function open(cell) {
    if (!ready()) return;
    parkWord();
    wheelPage = 0;
    draft = newDraft(cell);
    renderCapture(); modal.classList.add('visible');
    requestAnimationFrame(() => { if (draft && modal.classList.contains('visible')) $('stateOptions').querySelector('button')?.focus(); });
  }
  function renderCapture() {
    if (!draft) return;
    $('momentWhen').textContent = `${date(draft.at)} · ${clock(draft.at)}`;
    const context = M.intervalAt(read(), draft.at);
    modal.querySelector('.surface-panel-title').textContent = 'СОСТОЯНИЕ';
    $('momentContext').textContent = `${draft.source.label} · PIN ${draft.source.pin + 1}${context ? ` · ${context.name}` : ''}`;
    $('momentError').textContent = '';
    renderWheel();
  }
  function capture(stateId) {
    if (!draft) return;
    try {
      const saved = draft;
      const next = M.record(read(), { ...draft, stateId }); persist(next);
      draft = null; lastSaved = saved.id; modal.classList.remove('visible');
      const mark = next.moments.find(m => m.id === saved.id);
      $('surfaceHint').textContent = `${clock(mark.at)} · ${mark.state?.label || mark.tags.map(t => `#${t}`).join(' ')} · сохранено`;
      $('momentUndo').hidden = false;
    } catch (error) { $('momentError').textContent = error.message; }
  }
  $('momentCancel').onclick = () => { draft = null; modal.classList.remove('visible'); };
  function renderWheel() {
    const all = M.options(read()), pages = Math.ceil(all.length / 8); wheelPage = Math.max(0, Math.min(pages - 1, wheelPage));
    const choices = all.slice(wheelPage * 8, wheelPage * 8 + 8);
    $('stateOptions').replaceChildren(...choices.map((o, i) => {
      const a = (-90 + i * 45) * Math.PI / 180, b = button(o.label, () => capture(o.id), 'state-option'); b.dataset.state = o.id;
      b.style.left = `${50 + Math.cos(a) * 37}%`; b.style.top = `${50 + Math.sin(a) * 37}%`; return b;
    }));
    $('statePages').hidden = pages < 2; $('statePageLabel').textContent = `${wheelPage + 1} / ${pages}`;
    $('statePrevious').disabled = wheelPage === 0; $('stateNext').disabled = wheelPage === pages - 1;
  }
  $('statePrevious').onclick = () => { wheelPage--; renderWheel(); }; $('stateNext').onclick = () => { wheelPage++; renderWheel(); };
  $('stateAddForm').onsubmit = event => {
    event.preventDefault();
    try {
      const next = M.addOption(read(), $('stateNewLabel').value); persist(next);
      wheelPage = Math.floor((M.options(next).length - 1) / 8); renderWheel();
      $('stateNewLabel').value = ''; $('stateCustom').open = false; $('momentError').textContent = '';
      $('stateOptions').lastElementChild?.focus();
    } catch (error) { $('momentError').textContent = error.message; }
  };
  let pointer = null, hovered = null;
  const wheel = $('stateWheel');
  const highlight = target => { hovered?.classList.remove('hovered'); hovered = target?.closest('.state-option'); hovered?.classList.add('hovered'); };
  wheel.addEventListener('pointerdown', e => { if (e.target.id !== 'stateOrigin' || !e.isPrimary) return; e.preventDefault(); pointer = e.pointerId; wheel.setPointerCapture(pointer); });
  wheel.addEventListener('pointermove', e => { if (e.pointerId === pointer) highlight(document.elementFromPoint(e.clientX, e.clientY)); });
  wheel.addEventListener('pointerup', e => {
    if (e.pointerId !== pointer) return;
    const choice = document.elementFromPoint(e.clientX, e.clientY)?.closest('.state-option')?.dataset.state;
    pointer = null; highlight(null); wheel.releasePointerCapture(e.pointerId); e.preventDefault(); if (choice) capture(choice);
  });
  wheel.addEventListener('pointercancel', () => { pointer = null; highlight(null); });
  function renderWeek() {
    const week = M.week(read(), weekAt); $('momentWeekLabel').textContent = `${date(week.start)} — ${date(week.end - 1)}`;
    const all = button('ВСЕ', () => { filter = ''; renderWeek(); }); all.setAttribute('aria-pressed', String(!filter));
    $('momentWeekTags').replaceChildren(all, ...week.tags.map(([tag, count]) => { const b = button(`#${tag} · ${count}`, () => { filter = filter === tag ? '' : tag; renderWeek(); }); b.dataset.tag = tag; b.setAttribute('aria-pressed', String(filter === tag)); return b; }));
    const rows = $('momentWeekRows'); rows.replaceChildren(); let day = '';
    for (const m of week.entries.filter(e => !filter || e.tags.includes(filter))) {
      const label = date(m.at); if (label !== day) { rows.append(el('h3', label, 'moment-day')); day = label; }
      const row = el('article', null, 'moment-row'); row.dataset.momentId = m.id; row.dataset.kind = m.kind;
      const time = el('time', clock(m.at)); time.dateTime = new Date(m.at).toISOString();
      row.append(time, el('strong', m.label));
      row.append(el('small', m.kind === 'interval' ? `${clock(m.at)} → ${date(m.until)} ${clock(m.until)} · ${m.tags.map(t => `#${t}`).join(' ')}` : `${m.kind === 'state' ? 'Состояние' : 'Слово'} · PIN ${m.source.pin + 1}${m.interval ? ` · ${m.interval.name}` : ''}`));
      rows.append(row);
    }
    if (!rows.childElementCount) rows.append(el('p', filter ? 'В этой неделе нет отметок с этим словом.' : 'Пока пусто. Нажми # или выбери состояние на поле.', 'moment-note'));
  }
  for (const [id, amount] of [['momentWeekPrev', -7], ['momentWeekNext', 7]]) $(id).onclick = () => { const at = new Date(weekAt); at.setDate(at.getDate() + amount); weekAt = +at; filter = ''; renderWeek(); };
  $('momentWeekToday').onclick = () => { weekAt = Date.now(); filter = ''; renderWeek(); };
  function refresh() {
    const j = read();
    if (inlineNode && !inlineNode.isConnected) parkWord();
    const drafts = wordDrafts();
    for (const n of document.querySelectorAll('.btn-habit.moment-control')) {
      const kind = n.dataset.type, last = (j.moments || []).filter(m => !m.deletedAt && m.kind === kind && m.source.pin === Number(n.dataset.sourcePin) && m.source.cellId === n.dataset.cellId).at(-1);
      n.querySelector('.moment-last').textContent = last ? last.state?.label || last.tags.map(t => `#${t}`).join(' ') : kind === 'tag' ? 'ЗАПОМНИТЬ СЛОВО' : 'КАК ТЫ СЕЙЧАС';
      n.querySelector('.moment-time').textContent = last ? clock(last.at) : 'НАЖМИ И ВЫБЕРИ';
      if (kind === 'tag' && drafts[`${n.dataset.sourcePin}/${n.dataset.cellId}`]) { n.querySelector('.moment-last').textContent = drafts[`${n.dataset.sourcePin}/${n.dataset.cellId}`].text || '#…'; n.querySelector('.moment-time').textContent = 'ЧЕРНОВИК'; }
    }
  }
  for (const [kind, label] of [['tag', '# ХЕШТЕГ'], ['state', 'СОСТОЯНИЕ']]) {
    const b = button(label); b.dataset.type = kind; b.className = 'type-btn'; document.querySelector('#cellEditModal .type-selector').append(b);
  }
  window.TRCKNG_MODULES = {
    ...previous,
    prepareEdit(context) {
      const prior = previous.prepareEdit?.(context);
      if (!['tag', 'state'].includes(context.type)) return prior;
      return () => { prior?.(); persist(M.upgrade(read())); };
    },
    render(cell, grid) {
      if (!['tag', 'state'].includes(cell.type) || !cell.label.trim()) return previous.render(cell, grid);
      const n = cell.type === 'tag' ? el('div', null, 'btn-habit moment-control') : button('', () => open(cell), 'btn-habit moment-control'); n.id = `btn-${cell.id}`; n.dataset.type = cell.type; n.dataset.cellId = cell.id; n.dataset.sourcePin = cell.pin;
      n.style.setProperty('--btn-color', cell.color); window.applyCellLayoutToElement(n, cell.layout);
      const face = cell.type === 'tag' ? button('', () => openWord(cell, n), 'tag-trigger') : n;
      if (cell.type === 'tag') { face.setAttribute('aria-label', cell.label); n.append(face); }
      face.append(el('span', cell.type === 'tag' ? '#' : '✳', 'moment-symbol'), el('span', '', 'moment-last'), el('span', '', 'moment-time'), el('span', cell.label, 'btn-label')); grid.append(n); return true;
    },
    installNavigation() {
      previous.installNavigation();
      const show = () => { renderWeek(); history.classList.add('visible'); };
      const link = button('# СЛОВА / СОСТОЯНИЯ', show); link.id = 'historyMoments'; $('historyView').prepend(link);
      const undo = button('↶ ОТМЕТКУ', () => { try { persist(M.remove(read(), lastSaved)); lastSaved = null; undo.hidden = true; $('surfaceHint').textContent = 'Последняя отметка отменена.'; } catch (error) { $('surfaceHint').textContent = error.message; } });
      undo.id = 'momentUndo'; undo.hidden = true;
      document.querySelector('.surface-footer').insertBefore(undo, $('surfaceStatus'));
    }
  };
  new MutationObserver(refresh).observe($('habitsGrid'), { childList: true });
  window.addEventListener('sstm-v2-loaded', () => { refresh(); renderWeek(); if (draft) renderCapture(); });
  window.addEventListener('sstm-v2-recordings-changed', () => { refresh(); renderWeek(); });
})();
