'use strict';
// Every hand derives from wall-clock time, never from a timer's start or frame count.
(() => {
  const grid = document.getElementById('habitsGrid');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null, nodes = [];
  const angles = at => {
    const d = new Date(at), second = d.getSeconds() + d.getMilliseconds() / 1000;
    const minute = d.getMinutes() + second / 60;
    return { second: second * 6, minute: minute * 6, hour: (d.getHours() % 12 + minute / 60) * 30 };
  };
  function paint() {
    clearTimeout(timer); timer = null;
    if (document.hidden || document.body.dataset.view !== 'track' || document.body.classList.contains('account-locked') || !nodes.length) return;
    const now = Date.now(), a = angles(reduced.matches ? Math.floor(now / 1000) * 1000 : now);
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      if (box.right < 0 || box.left > innerWidth || box.bottom < 0 || box.top > innerHeight) continue;
      for (const key of ['hour', 'minute', 'second']) node.style.setProperty(`--clock-${key}`, `${a[key]}deg`);
    }
    timer = setTimeout(paint, reduced.matches ? 1000 : 125);
  }
  function hydrate() {
    nodes = [...grid.querySelectorAll('.btn-habit[data-type="countdown"]')];
    for (const node of nodes) if (!node.querySelector('.countdown-dial')) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('countdown-dial'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = '<path class="clock-ticks" d="M50 3v5 M97 50h-5 M50 97v-5 M3 50h5"/><line class="clock-hand clock-hour" x1="50" y1="50" x2="50" y2="25"/><line class="clock-hand clock-minute" x1="50" y1="50" x2="50" y2="12"/><line class="clock-hand clock-second" x1="50" y1="56" x2="50" y2="5"/><rect class="clock-hub" x="48.5" y="48.5" width="3" height="3"/>';
      node.prepend(svg); node.title = 'До события. Стрелки идут по текущим часам устройства; число показывает оставшееся время.';
      // The old line used the same pseudo-element as the field's running dot.
      node.classList.add('clock-synced');
    }
    paint();
  }
  new MutationObserver(hydrate).observe(grid, { childList: true });
  new MutationObserver(paint).observe(document.body, { attributes: true, attributeFilter: ['data-view', 'class'] });
  document.addEventListener('visibilitychange', paint); window.addEventListener('focus', paint);
  reduced.addEventListener('change', paint);
  hydrate();
})();
