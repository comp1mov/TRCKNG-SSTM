'use strict';
(() => {
  const HOUR = 3600000;
  function anchor(now, hours) {
    const end = new Date(now); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 1);
    return end.getTime() - hours * HOUR;
  }
  function clip(start, end, from, to) {
    const a = Math.max(start, from), b = Math.min(end, to);
    return b > a ? { left: (a - from) / (to - from) * 100, width: (b - a) / (to - from) * 100 } : null;
  }
  function days(from, to) {
    const result = [], date = new Date(from); date.setHours(0, 0, 0, 0);
    while (date.getTime() < to) {
      const start = date.getTime(); date.setDate(date.getDate() + 1);
      result.push({ start, end: date.getTime(), ...clip(start, date.getTime(), from, to) });
    }
    return result;
  }
  const api = { HOUR, anchor, clip, days };
  if (typeof module !== 'undefined') module.exports = api;
  else window.SstmCalendarModel = api;
})();
