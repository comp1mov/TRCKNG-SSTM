'use strict';
// Recency is a projection of positive marks, independent of the displayed count.
(function (root) {
  function lastMark(settings = {}, log = [], habit) {
    if (Object.hasOwn(settings, 'lastMarkAt')) return Number.isFinite(settings.lastMarkAt) && settings.lastMarkAt > 0 ? settings.lastMarkAt : null;
    return log.reduce((last, e) => e.habit === habit && !e.undoneAt &&
      ['unit', 'counter', 'tap'].includes(e.source) && e.nextValue > e.previousValue && Number.isFinite(e.at)
      ? Math.max(last || 0, e.at) : last, null);
  }
  function display(at, now = Date.now(), language = 'en') {
    if (!at) return { main: '—', suffix: '', label: language === 'ru' ? 'НЕТ ОТМЕТКИ' : 'NO MARK' };
    const seconds = Math.max(0, Math.floor((now - at) / 1000)), ru = language === 'ru';
    if (seconds >= 48 * 3600) {
      const days = Math.floor(seconds / 86400);
      const word = days % 10 === 1 && days % 100 !== 11 ? 'день' : [2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100) ? 'дня' : 'дней';
      return { main: String(days), suffix: ru ? word : 'days', label: ru ? 'НАЗАД' : 'AGO' };
    }
    if (seconds >= 3600) return { main: `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}`, suffix: ru ? 'ч:мин' : 'h:min', label: ru ? 'НАЗАД' : 'AGO' };
    return { main: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, suffix: ru ? 'мин:с' : 'min:s', label: ru ? 'НАЗАД' : 'AGO' };
  }
  const api = { lastMark, display };
  if (typeof module !== 'undefined') module.exports = api;
  else root.SstmUnitRecency = api;
})(typeof window !== 'undefined' ? window : globalThis);
