'use strict';
// Pure completion rules can later serve other editable module faces.
(function (root) {
  const normalize = text => text.normalize('NFKC').toLocaleLowerCase('ru-RU');
  function token(text, caret = text.length) {
    caret = Math.max(0, Math.min(text.length, caret)); let start = caret, end = caret;
    while (start && !/[\s,#]/u.test(text[start - 1])) start--;
    while (end < text.length && !/[\s,#]/u.test(text[end])) end++;
    return { start, end, prefix: normalize(text.slice(start, caret)) };
  }
  function suggest(journal, text, caret) {
    const part = token(text, caret), words = new Map();
    const add = (value, at) => { const word = normalize(value); const prior = words.get(word) || { word, count: 0, at: 0 }; prior.count++; prior.at = Math.max(prior.at, at); words.set(word, prior); };
    for (const m of journal.moments || []) if (!m.deletedAt) for (const word of m.tags) add(word, m.at);
    for (const c of journal.cycles) if (!c.deletedAt) for (const p of c.points) if (!c.deletedIntervals?.[p.id]) for (const word of c.tags?.[p.id] || []) add(word, p.at);
    const other = new Set(normalize(text.slice(0, part.start) + ' ' + text.slice(part.end)).split(/[\s,#]+/u));
    for (const c of journal.cycles) if (!c.deletedAt) for (const p of c.points) for (const word of p.tags || []) add(word, p.at);
    for (const c of journal.cycles) if (!c.deletedAt) for (const p of c.checkpoints || []) {
      const owner = c.points.findLast(boundary => boundary.at <= p.at);
      if (!c.deletedIntervals?.[owner?.id]) for (const word of p.tags) add(word, p.at);
    }
    return [...words.values()].filter(item => item.word.startsWith(part.prefix) && !other.has(item.word))
      .sort((a, b) => b.count - a.count || b.at - a.at || a.word.localeCompare(b.word, 'ru')).slice(0, 5).map(item => item.word);
  }
  function complete(text, caret, word) {
    const part = token(text, caret), prefix = text.slice(0, part.start), suffix = text.slice(part.end);
    const inserted = `${prefix.endsWith('#') ? '' : '#'}${word}${suffix && /^[\s,#]/u.test(suffix) ? '' : ' '}`;
    return { text: prefix + inserted + suffix, caret: prefix.length + inserted.length };
  }
  const api = { token, suggest, complete };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SstmTagInput = api;
  if (typeof document !== 'undefined') {
    const format = input => {
      if (!input.matches?.('#momentWords,#cyclePromptTags,input[data-draft-field="tags"]')) return;
      const before = input.value, caret = input.selectionStart ?? before.length;
      const prefix = text => text.replace(/(^|[\s,])([^\s,#])/gu, '$1#$2');
      const after = prefix(before);
      if (after !== before) { input.value = after; const position = prefix(before.slice(0, caret)).length; input.setSelectionRange(position, position); }
    };
    document.addEventListener('input', event => { if (!event.isComposing) format(event.target); }, true);
    document.addEventListener('compositionend', event => { format(event.target); event.target.dispatchEvent(new Event('input', { bubbles: true })); }, true);
  }
})(globalThis);
