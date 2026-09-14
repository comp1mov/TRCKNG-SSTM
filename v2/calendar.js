'use strict';
(() => {
  const model = window.SstmCalendarModel, recordings = window.SstmRecordings;
  const host = document.createElement('section'); host.id = 'recordingCalendar'; host.dataset.noI18n = '';
  document.getElementById('cycleClock').after(host);
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = './calendar.css'; document.head.append(style);
  let hours = 48, from = model.anchor(Date.now(), hours), signature = '', liveBars = [];
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const ru = () => (window.SstmI18n?.locale || 'ru').startsWith('ru');
  const t = (a, b) => ru() ? a : b;
  const btn = (text, action) => { const node = el('button', text); node.type = 'button'; node.onclick = action; return node; };
  const nav = el('div', undefined, 'calendar-nav');
  const prev = btn('←', () => move(-1)), next = btn('→', () => move(1));
  const nowButton = btn('', () => { from = model.anchor(Date.now(), hours); refresh(true); });
  const range = el('strong'), size = el('select'); size.id = 'calendarHours';
  for (const n of [48, 72]) { const option = el('option', String(n)); option.value = n; size.append(option); }
  size.onchange = () => { hours = Number(size.value); from = model.anchor(Date.now(), hours); refresh(true); };
  nav.append(prev, size, next, nowButton, range);
  const scroll = el('div', undefined, 'calendar-scroll'), axis = el('div', undefined, 'calendar-axis');
  scroll.append(axis); host.append(nav, scroll);
  function move(direction) { from += direction * hours * model.HOUR; refresh(true); }
  function place(node, geometry) { node.style.left = `${geometry.left}%`; node.style.width = `${geometry.width}%`; }
  function refresh(force = false) {
    if (document.body.classList.contains('personal-cycle')) return;
    const journal = recordings.read(), now = Date.now(), to = from + hours * model.HOUR;
    const locale = window.SstmI18n?.locale || 'ru-RU';
    const key = JSON.stringify([journal.cycles, from, hours, locale]);
    if (force || key !== signature) {
      signature = key; axis.replaceChildren(); liveBars = [];
      prev.setAttribute('aria-label', t('Предыдущее окно', 'Previous window'));
      next.setAttribute('aria-label', t('Следующее окно', 'Next window'));
      nowButton.textContent = t('СЕЙЧАС', 'NOW'); size.setAttribute('aria-label', t('Часов на шкале', 'Timeline hours'));
      for (const option of size.options) option.textContent = `${option.value} ${t('ч', 'h')}`;
      const date = value => new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      range.textContent = `${date(from)} — ${date(to - 1)}`;
      axis.append(el('small', t('МОИ ЗАПИСИ · нажми на отрезок', 'MY RECORDINGS · tap an interval'), 'calendar-caption'));
      let count = 0;
      for (const [i, cycle] of window.SstmData.visibleCycles(journal).entries()) {
        if (!model.clip(cycle.startedAt, cycle.endedAt ?? now, from, to) && !(cycle.endedAt === null && cycle.startedAt >= from && cycle.startedAt < to)) continue;
        count++;
        const row = el('div', undefined, 'calendar-record-row');
        const label = btn(`${t('Запись', 'Recording')} ${i + 1} ↗`, () => recordings.open(cycle.id)); label.className = 'calendar-record-label';
        row.append(label);
        for (const [n, part] of recordings.segments(cycle, now).entries()) {
          const geometry = model.clip(part.start, part.end, from, to) || (part.live && part.start >= from && part.start < to ? { left: (part.start - from) / (to - from) * 100, width: 0 } : null); if (!geometry) continue;
          const name = part.name || `${t('Отрезок', 'Interval')} ${n + 1}`;
          const bar = btn(name, () => recordings.open(cycle.id, part.point.id)); bar.className = 'calendar-part';
          bar.title = `${name} · ${new Date(part.start).toLocaleString(locale)} → ${part.live ? t('сейчас', 'now') : new Date(part.end).toLocaleString(locale)}`;
          bar.setAttribute('aria-label', bar.title); bar.style.setProperty('--part-color', ['#b9c96e', '#65aeb9', '#a58bbc', '#be956a'][n % 4]);
          place(bar, geometry); row.append(bar); if (part.live) liveBars.push({ bar, start: part.start });
        }
        axis.append(row);
      }
      if (!count) axis.append(el('p', t('В этом окне нет записей', 'No recordings in this window'), 'calendar-empty'));
      const dayRow = el('div', undefined, 'calendar-days');
      for (const day of model.days(from, to)) {
        const block = el('div', `${date(day.start)} · 00:00`, 'calendar-day'); place(block, day); dayRow.append(block);
        const line = el('div', undefined, 'calendar-midnight'); line.style.left = `${day.left}%`; axis.append(line);
      }
      axis.append(dayRow);
      const marker = el('div', undefined, 'calendar-now-marker'); marker.id = 'calendarNowMarker'; marker.append(el('span', t('СЕЙЧАС', 'NOW'))); axis.append(marker);
    }
    const marker = document.getElementById('calendarNowMarker'); marker.hidden = now < from || now >= to; marker.style.left = `${(now - from) / (to - from) * 100}%`;
    for (const item of liveBars) { const geometry = model.clip(item.start, now, from, to); if (geometry) place(item.bar, geometry); }
    if (force && now >= from && now < to) scroll.scrollLeft = Math.max(0, (now - from) / (to - from) * axis.offsetWidth - scroll.clientWidth / 2);
  }
  window.addEventListener('sstm-calendar-view', () => refresh(true));
  window.addEventListener('sstm-v2-loaded', () => refresh(true));
  window.addEventListener('sstm-v2-recordings-changed', () => refresh(true));
  setInterval(refresh, 1000); refresh();
})();
