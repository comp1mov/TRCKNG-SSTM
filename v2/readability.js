'use strict';
// Fit values to their actual module, independently of language or saved data.
(() => {
  const grid = document.getElementById('habitsGrid');
  const canvas = document.createElement('canvas'), measure = canvas.getContext('2d');
  let frame;
  function fit() {
    frame = null;
    for (const value of grid.querySelectorAll('.btn-value:not(.module-main),.module-main')) {
      const tile = value.closest('.btn-habit');
      if (!tile || !tile.clientWidth) continue;
      const text = value.textContent, time = !tile.classList.contains('module-work') && /^(\d+:\d{2})(:\d{2})$/.exec(text);
      if (time && !value.querySelector('.face-time-main')) {
        const main = document.createElement('span'), seconds = document.createElement('span');
        main.className = 'face-time-main'; main.textContent = time[1];
        seconds.className = 'face-time-seconds'; seconds.textContent = time[2];
        value.replaceChildren(main, seconds);
      }
      const tileStyle = getComputedStyle(tile), available = tile.clientWidth - parseFloat(tileStyle.paddingLeft) - parseFloat(tileStyle.paddingRight);
      const style = getComputedStyle(value);
      let baseline = Math.min(96, tile.clientHeight * .47);
      if (tile.classList.contains('module-work')) {
        const siblings = [...tile.children].filter(n => n !== value && getComputedStyle(n).display !== 'none');
        const occupied = siblings.reduce((sum, n) => sum + n.getBoundingClientRect().height, 0) + (parseFloat(tileStyle.rowGap) || 0) * siblings.length + parseFloat(tileStyle.paddingTop) + parseFloat(tileStyle.paddingBottom);
        baseline = Math.min(baseline, Math.max(12, (tile.clientHeight - occupied - 2) / 1.05));
      }
      measure.font = `400 100px ${style.fontFamily}`;
      const sample = time ? time[1] : text;
      const width = tile.classList.contains('module-work')
        ? measure.measureText(value.querySelector('.module-digits')?.textContent || '0').width + measure.measureText(value.querySelector('.module-fraction')?.textContent || '').width * .55
        : measure.measureText(sample || '0').width;
      const fitted = Math.max(12, Math.min(baseline, (available - 2) * 100 / Math.max(1, width)));
      const size = `${Math.floor(fitted)}px`;
      if (value.style.fontSize !== size) value.style.fontSize = size;
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(fit); };
  new MutationObserver(schedule).observe(grid, { subtree: true, childList: true, characterData: true });
  new ResizeObserver(schedule).observe(grid);
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['data-cell-size', 'data-view'] });
  document.fonts.ready.then(schedule); window.addEventListener('resize', schedule);
  window.SstmReadability = { fit: schedule }; schedule();
})();
