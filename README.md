# TRCKNG SSTM v0.02

Modular weekly habit tracking system. Personal tracking journal built for weekly checkpoints and Obsidian integration.

## What is it?

A minimalist web app to track habits weekly. You define what to track, and the system records data over time. Simple, local-first, offline-capable.

## Features

- **Weekly tracking** — automatic week numbering (ISO 8601)
- **Customizable habits** — add/remove/reorder tracking items easily
- **Data persistence** — localStorage keeps data locally on your device
- **Migration-friendly** — change habit list without losing history
- **Export/Import** — backup data as JSON, restore anytime
- **Previous week snapshot** — COPY button for last week to paste into Obsidian
- **Decrease mode** — toggle to subtract instead of add (useful for tracking reductions)
- **Offline support** — works completely offline via service worker
- **PWA ready** — install as app on mobile or desktop
- **Monday reminder** — notification to export data to Obsidian

## How to use

1. Click habit button to increment counter
2. **COPY** — copies previous week's data for Obsidian
3. **EXPORT** — saves full JSON history to clipboard
4. **IMPORT** — restore from backed-up JSON file
5. **DECREASE** — toggle mode to subtract (-1) instead of add (+1)

## Setup (GitHub Pages)

1. Fork or create repo: `tracking-system`
2. Enable GitHub Pages in Settings → Pages
3. App available at: `https://username.github.io/tracking-system`
4. Install as PWA (on mobile: "Add to Home Screen", on desktop: install button in browser)

## Customization

Edit `habits` array in `index.html`:

```javascript
const habits = [
  "sport",    // add/remove/reorder here
  "cig", 
  "want",
  // ...
];

const habitLabels = {
  "sport": "Sport",  // display names
  "cig": "Cig",
  // ...
};
```

Data auto-migrates when you change the list.

## Data format

```json
{
  "2026W01": {
    "sport": 5,
    "cig": 0,
    "want": 3,
    ...
  },
  "2025W52": { ... }
}
```

Keep this file backed up locally!

## Version history

- **v0.02** — Added DECREASE mode, COPY prev week, better export/import, POST habit
- **v0.01** — Initial release

---

Made for personal tracking. Fully local. No ads, no tracking, no cloud sync.
