# The Guillotine Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the Guillotine fantasy football league website with a premium dark dashboard aesthetic, mobile-first design, rebuilt standings table, and thematic personality — while keeping the working backend, data flow, and core JS modules intact.

**Architecture:** Incremental reskin. Rebuild `table-renderer.js` and `table.css` from scratch. Rewrite `main.css` with new design system (Oswald + Inter typography, refined color tokens, mobile-first breakpoints). Update all 8 HTML pages to use the new shared nav/footer shell. Keep `api.js`, `color-utils.js`, and `season-state.js` unchanged. Backend untouched.

**Tech Stack:** Vanilla HTML/CSS/JS (no framework, no build step). Google Fonts (Oswald, Inter). Inline SVG for thematic icons. html2canvas for PNG export. Deployed on Vercel as static files + Python FastAPI serverless.

---

## File Map

### New Files
- `frontend/css/design-system.css` — CSS custom properties, typography, spacing scale, resets, shared component styles (cards, buttons, badges)
- `frontend/css/nav.css` — Shared navigation (sticky top bar, hamburger menu, season selector) and footer styles
- `frontend/css/table-new.css` — Rebuilt standings table styles, mobile-first with view mode variants
- `frontend/js/table-renderer-new.js` — Rebuilt table DOM generation, clean implementation
- `frontend/js/nav.js` — Shared navigation logic (hamburger toggle, current page highlighting)
- `frontend/js/svg-icons.js` — Inline SVG icon functions (skull, trophy, blade, blood-drip divider)

### Modified Files
- `frontend/css/main.css` — Gutted and rebuilt: remove old hero, old nav, old cards; import new design system; keep page-specific styles for rules/transactions/etc
- `frontend/css/table.css` — Deleted (replaced by `table-new.css`)
- `frontend/index.html` — New nav shell, elimination summary card, restructured layout
- `frontend/rules.html` — New nav shell, restyled with design system
- `frontend/average-finishes.html` — New nav shell, restyled table, manager links
- `frontend/draft-order.html` — New nav shell, restyled
- `frontend/transactions.html` — New nav shell, restyled
- `frontend/death-bell.html` — New nav shell, restyled with thematic elements
- `frontend/season-recap.html` — New nav shell, restyled
- `frontend/manager.html` — New nav shell, restyled with sparklines, proper linking
- `frontend/404.html` — New nav shell, restyled
- `frontend/js/app.js` — Update to use new table renderer, new nav, elimination summary card logic
- `frontend/js/table-renderer.js` — Kept as backup initially, then deleted after new renderer is verified

### Unchanged Files
- `frontend/js/api.js` — No changes
- `frontend/js/color-utils.js` — No changes
- `frontend/js/season-state.js` — No changes
- `frontend/data/*.json` — No changes
- `api/` — Entire backend unchanged
- `vercel.json` — No changes (routes already handle all pages)

---

## Task 1: Design System CSS Foundation

**Files:**
- Create: `frontend/css/design-system.css`

- [ ] **Step 1: Create the design system CSS file with custom properties**

```css
/* frontend/css/design-system.css */

/* === FONTS === */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Oswald:wght@400;500;600;700&display=swap');

/* === DESIGN TOKENS === */
:root {
  /* Colors */
  --bg: #08080c;
  --bg-elevated: #0f0f14;
  --surface: rgba(255, 255, 255, 0.03);
  --surface-hover: rgba(255, 255, 255, 0.06);
  --surface-border: rgba(255, 255, 255, 0.06);
  --surface-border-hover: rgba(255, 255, 255, 0.12);

  --accent: #dc2626;
  --accent-dim: rgba(220, 38, 38, 0.15);
  --accent-border: rgba(220, 38, 38, 0.3);
  --success: #22c55e;
  --success-dim: rgba(34, 197, 94, 0.15);
  --warning: #f59e0b;

  --gold: #fbbf24;
  --silver: #a8a8a8;
  --bronze: #cd7f32;

  --text-primary: #f5f5f5;
  --text-secondary: #888;
  --text-tertiary: #666;
  --text-on-accent: #fff;

  /* Typography */
  --font-heading: 'Oswald', sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  --text-xs: 0.6875rem;   /* 11px */
  --text-sm: 0.8125rem;   /* 13px */
  --text-base: 0.875rem;  /* 14px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.375rem;    /* 22px */
  --text-2xl: 1.75rem;    /* 28px */
  --text-3xl: 2.25rem;    /* 36px */

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.4);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;

  /* Layout */
  --nav-height: 44px;
  --max-width: 1400px;
  --page-padding: var(--space-4);
}

@media (min-width: 768px) {
  :root {
    --page-padding: var(--space-6);
  }
}

/* === RESET === */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--text-primary);
  background-color: var(--bg);
  min-height: 100vh;
  overflow-x: hidden;
}

a {
  color: inherit;
  text-decoration: none;
}

img, svg {
  display: block;
  max-width: 100%;
}

button {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

select {
  font: inherit;
  color: inherit;
  background: var(--bg-elevated);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
}

table {
  border-collapse: collapse;
  width: 100%;
}

ul, ol {
  list-style: none;
}

/* === TYPOGRAPHY === */
h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  line-height: 1.2;
}

h1 { font-size: var(--text-3xl); }
h2 { font-size: var(--text-2xl); }
h3 { font-size: var(--text-xl); }
h4 { font-size: var(--text-lg); }

.label {
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-tertiary);
}

.stat-value {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: var(--text-2xl);
}

/* === LAYOUT === */
.page-container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--page-padding);
  padding-top: var(--nav-height);
}

/* === CARD COMPONENT === */
.card {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  transition: border-color var(--transition-fast);
}

@media (min-width: 768px) {
  .card {
    padding: var(--space-6);
  }
}

.card:hover {
  border-color: var(--surface-border-hover);
}

/* === BUTTON COMPONENTS === */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  border: 1px solid var(--surface-border);
  background: var(--surface);
  color: var(--text-secondary);
}

.btn:hover {
  background: var(--surface-hover);
  border-color: var(--surface-border-hover);
  color: var(--text-primary);
}

.btn.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
}

.btn-accent {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-on-accent);
}

/* === BADGE COMPONENTS === */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  vertical-align: middle;
  margin-left: var(--space-1);
}

.badge-champion {
  background: var(--gold);
  color: #000;
}

.badge-alive {
  background: var(--success-dim);
  color: var(--success);
  border: 1px solid var(--success);
}

.badge-chopped {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid var(--accent);
}

.badge-second {
  background: var(--silver);
  color: #000;
}

.badge-third {
  background: var(--bronze);
  color: #000;
}

/* === PILL / TAG === */
.pill {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  color: var(--text-secondary);
}

.pill.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
}

/* === SECTION DIVIDER (blood drip) === */
.divider-drip {
  width: 100%;
  height: 16px;
  margin: var(--space-8) 0;
}

/* === ACCESSIBILITY === */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* === REDUCED MOTION === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify the file renders correctly**

Open `frontend/css/design-system.css` in a browser by temporarily linking it in `index.html`. Confirm:
- Fonts load (Oswald for headings, Inter for body)
- Dark background renders
- No CSS syntax errors in browser console

- [ ] **Step 3: Commit**

```bash
git add frontend/css/design-system.css
git commit -m "feat: add design system CSS foundation (tokens, typography, components)"
```

---

## Task 2: SVG Icons Module

**Files:**
- Create: `frontend/js/svg-icons.js`

- [ ] **Step 1: Create the SVG icons module**

```javascript
/* frontend/js/svg-icons.js */

/**
 * Inline SVG icon functions for thematic elements.
 * Returns SVG strings — use innerHTML or insertAdjacentHTML to inject.
 */

export function skullIcon(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" class="icon icon-skull" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 3.667 1.973 6.87 4.912 8.613V22a1 1 0 001 1h2.176a1 1 0 001-1v-.5h1.824V22a1 1 0 001 1h2.176a1 1 0 001-1v-1.387C18.027 18.87 20 15.667 20 12c0-5.523-4.477-10-10-10zm-3 13a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-1-4h-4a1 1 0 110-2h4a1 1 0 110 2z"/>
  </svg>`;
}

export function trophyIcon(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" class="icon icon-trophy" aria-hidden="true">
    <path d="M12 15.9A6.9 6.9 0 005.1 9V3h13.8v6A6.9 6.9 0 0012 15.9zM5.1 3H2v4a3 3 0 003 3h.1V3zm13.8 0V10H21a3 3 0 003-3V3h-4.1zM9 21h6v-2H9v2zm1-4h4v-1.1a8.9 8.9 0 01-4 0V17z"/>
  </svg>`;
}

export function bladeIcon(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" class="icon icon-blade" aria-hidden="true">
    <path d="M14.5 2L6 14h4l-2 8 10-14h-4.5L14.5 2z"/>
  </svg>`;
}

export function closeCallIcon(size = 12) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon icon-close-call" aria-hidden="true">
    <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`;
}

export function bloodDripDivider() {
  return `<svg class="divider-drip" viewBox="0 0 1200 16" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="drip-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="transparent"/>
        <stop offset="20%" stop-color="var(--accent, #dc2626)"/>
        <stop offset="80%" stop-color="var(--accent, #dc2626)"/>
        <stop offset="100%" stop-color="transparent"/>
      </linearGradient>
    </defs>
    <line x1="0" y1="1" x2="1200" y2="1" stroke="url(#drip-grad)" stroke-width="2"/>
    <path d="M300 1 Q300 8, 297 12 Q296 14, 300 14 Q304 14, 303 12 Q300 8, 300 1Z" fill="var(--accent, #dc2626)" opacity="0.7"/>
    <path d="M600 1 Q600 10, 597 15 Q596 16, 600 16 Q604 16, 603 15 Q600 10, 600 1Z" fill="var(--accent, #dc2626)" opacity="0.5"/>
    <path d="M900 1 Q900 7, 897 10 Q896 12, 900 12 Q904 12, 903 10 Q900 7, 900 1Z" fill="var(--accent, #dc2626)" opacity="0.6"/>
  </svg>`;
}

export function exportIcon(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`;
}

export function hamburgerIcon(size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`;
}

export function closeIcon(size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/js/svg-icons.js
git commit -m "feat: add SVG icon module (skull, trophy, blade, blood drip, nav icons)"
```

---

## Task 3: Shared Navigation — CSS & JS

**Files:**
- Create: `frontend/css/nav.css`
- Create: `frontend/js/nav.js`

- [ ] **Step 1: Create nav CSS (mobile-first)**

```css
/* frontend/css/nav.css */

/* === STICKY TOP BAR === */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--nav-height);
  background: var(--bg);
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--page-padding);
}

.nav-logo {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: var(--text-lg);
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--accent);
}

.nav-logo a {
  color: inherit;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.nav-season-select {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  color: var(--accent);
}

.nav-hamburger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.nav-hamburger:hover {
  color: var(--text-primary);
}

/* === MOBILE MENU OVERLAY === */
.nav-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--transition-base), visibility var(--transition-base);
}

.nav-menu-overlay.open {
  opacity: 1;
  visibility: visible;
}

.nav-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-8);
}

.nav-menu-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.nav-menu-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.nav-menu-link {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-secondary);
  padding: var(--space-3) var(--space-2);
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background var(--transition-fast);
}

.nav-menu-link:hover,
.nav-menu-link.active {
  color: var(--text-primary);
  background: var(--surface);
}

.nav-menu-link.active {
  color: var(--accent);
  border-left: 3px solid var(--accent);
}

/* === DESKTOP NAV === */
@media (min-width: 768px) {
  .nav-hamburger {
    display: none;
  }

  .nav-desktop-links {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .nav-desktop-link {
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }

  .nav-desktop-link:hover {
    color: var(--text-primary);
  }

  .nav-desktop-link.active {
    color: var(--accent);
  }
}

@media (max-width: 767px) {
  .nav-desktop-links {
    display: none;
  }
}

/* === FOOTER === */
.site-footer {
  margin-top: var(--space-12);
  padding: var(--space-8) var(--page-padding);
  border-top: 1px solid var(--surface-border);
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
  max-width: var(--max-width);
  margin: 0 auto;
}

@media (min-width: 768px) {
  .footer-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.footer-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  transition: color var(--transition-fast);
}

.footer-link:hover {
  color: var(--text-primary);
}

.footer-credit {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-6);
}

.footer-credit a {
  color: var(--accent);
}
```

- [ ] **Step 2: Create nav JS module**

```javascript
/* frontend/js/nav.js */

/**
 * Shared navigation for all pages.
 * Handles hamburger menu, page highlighting, season selector injection.
 */

import { hamburgerIcon, closeIcon } from './svg-icons.js';

const NAV_LINKS = [
  { href: '/', label: 'Standings' },
  { href: '/rules', label: 'Rules' },
  { href: '/average-finishes', label: 'Stats' },
  { href: '/draft-order', label: 'Draft' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/death-bell', label: 'Death Bell' },
  { href: '/season-recap', label: 'Recap' },
];

/**
 * Initialize the shared navigation.
 * Call this on every page's DOMContentLoaded.
 * @param {Object} options
 * @param {boolean} options.showSeasonSelector - Whether to show season selector in nav
 * @param {Function} options.onSeasonChange - Callback when season changes
 */
export function initNav(options = {}) {
  const nav = document.getElementById('top-nav');
  if (!nav) return;

  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

  // Build desktop links
  const desktopLinks = nav.querySelector('.nav-desktop-links');
  if (desktopLinks) {
    desktopLinks.innerHTML = NAV_LINKS.map(link => {
      const isActive = link.href === currentPath || 
        (link.href !== '/' && currentPath.startsWith(link.href));
      return `<a href="${link.href}" class="nav-desktop-link${isActive ? ' active' : ''}">${link.label}</a>`;
    }).join('');
  }

  // Hamburger toggle
  const hamburgerBtn = nav.querySelector('.nav-hamburger');
  const menuOverlay = document.getElementById('nav-menu-overlay');
  
  if (hamburgerBtn && menuOverlay) {
    // Build mobile menu links
    const menuLinks = menuOverlay.querySelector('.nav-menu-links');
    if (menuLinks) {
      menuLinks.innerHTML = NAV_LINKS.map(link => {
        const isActive = link.href === currentPath || 
          (link.href !== '/' && currentPath.startsWith(link.href));
        return `<a href="${link.href}" class="nav-menu-link${isActive ? ' active' : ''}">${link.label}</a>`;
      }).join('');
    }

    hamburgerBtn.innerHTML = hamburgerIcon();
    hamburgerBtn.addEventListener('click', () => {
      menuOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    const closeBtn = menuOverlay.querySelector('.nav-menu-close');
    if (closeBtn) {
      closeBtn.innerHTML = closeIcon();
      closeBtn.addEventListener('click', () => {
        menuOverlay.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    // Close on overlay click (not on menu content)
    menuOverlay.addEventListener('click', (e) => {
      if (e.target === menuOverlay) {
        menuOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOverlay.classList.contains('open')) {
        menuOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/css/nav.css frontend/js/nav.js
git commit -m "feat: add shared navigation (mobile hamburger overlay, desktop links, footer)"
```

---

## Task 4: Rebuild the Standings Table — CSS

**Files:**
- Create: `frontend/css/table-new.css`

- [ ] **Step 1: Create the new table CSS, mobile-first**

This is a large file. Key design decisions:
- Mobile default: sticky manager column, horizontally scrollable weeks
- Three view modes via body classes: default (full), `mobile-minimal`, `mobile-compact` (heatmap)
- Score cells get heatmap colors via inline styles (set by JS)
- Chop cells have red left border + dimmed background
- Summary rows at bottom with distinct backgrounds

```css
/* frontend/css/table-new.css */

/* === TABLE WRAPPER === */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 calc(-1 * var(--page-padding));
  padding: 0 var(--page-padding);
}

/* === MAIN TABLE === */
.guillotine-table {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  border-collapse: separate;
  border-spacing: 0;
  width: max-content;
  min-width: 100%;
}

.guillotine-table th,
.guillotine-table td {
  padding: 4px 6px;
  white-space: nowrap;
  border-bottom: 1px solid var(--surface-border);
}

/* === HEADER === */
.guillotine-table thead th {
  position: sticky;
  top: var(--nav-height);
  z-index: 10;
  background: var(--bg);
  color: var(--text-tertiary);
  font-weight: 500;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  border-bottom: 2px solid var(--surface-border);
}

/* === COLUMN WIDTHS === */
.col-rank { width: 28px; text-align: center; }
.col-manager { 
  min-width: 100px; 
  text-align: left;
  position: sticky;
  left: 0;
  z-index: 5;
  background: var(--bg);
}

thead .col-manager {
  z-index: 15;
}

.col-draft { width: 45px; text-align: center; }
.col-avg { width: 50px; text-align: center; }
.col-faab { width: 55px; text-align: right; }
.col-faab-wasted { width: 55px; text-align: right; }
.col-close-calls { width: 40px; text-align: center; }
.col-chop { width: 40px; text-align: center; }
.col-week { width: 58px; text-align: center; }

/* === MANAGER CELL === */
.manager-cell {
  font-weight: 600;
  font-size: var(--text-xs);
}

.manager-link {
  color: var(--text-primary);
  transition: color var(--transition-fast);
}

.manager-link:hover {
  color: var(--accent);
}

/* === SCORE CELLS === */
.score-cell {
  position: relative;
  text-align: center;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.score-value {
  position: relative;
  z-index: 1;
}

.score-rank {
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 8px;
  font-weight: 400;
  opacity: 0.5;
  z-index: 1;
}

/* === NA CELLS (future/eliminated weeks) === */
.na-cell {
  background: transparent !important;
  color: transparent;
}

/* === CHOP CELL === */
.chop-cell {
  background: rgba(220, 38, 38, 0.25) !important;
  color: var(--text-primary) !important;
  border-left: 2px solid var(--accent);
}

/* === ELIMINATED ROW === */
tr.eliminated {
  opacity: 0.45;
}

tr.eliminated .manager-cell {
  text-decoration: line-through;
  text-decoration-color: var(--accent);
}

tr.eliminated .col-manager {
  border-left: 2px solid var(--accent);
}

tr.recently-chopped {
  opacity: 0.7;
}

/* === WEEK DIVIDERS (after weeks 4 and 8) === */
.week-divider {
  border-right: 2px solid var(--surface-border-hover);
}

/* === SUMMARY ROWS === */
.summary-row {
  font-weight: 600;
  font-size: 10px;
}

.summary-row-first td {
  border-top: 2px solid var(--surface-border-hover);
}

.summary-row .manager-cell {
  text-decoration: none;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-high { color: var(--success); }
.summary-75th { color: var(--text-secondary); }
.summary-median { color: var(--text-primary); }
.summary-25th { color: var(--text-secondary); }
.summary-chop { color: var(--accent); }
.summary-diff { color: var(--text-tertiary); }

/* === CLOSE CALL INDICATOR === */
.close-call-indicator {
  color: var(--warning);
  position: absolute;
  bottom: 1px;
  left: 2px;
}

/* === MOBILE VIEW MODES === */

/* Minimal: hide stat columns, show only manager + recent weeks */
@media (max-width: 767px) {
  body.mobile-minimal .col-draft,
  body.mobile-minimal .col-avg,
  body.mobile-minimal .col-faab,
  body.mobile-minimal .col-faab-wasted,
  body.mobile-minimal .col-close-calls,
  body.mobile-minimal .col-chop {
    display: none;
  }
}

/* Compact/Heatmap: color blocks only, no numbers */
@media (max-width: 767px) {
  body.mobile-compact .col-draft,
  body.mobile-compact .col-avg,
  body.mobile-compact .col-faab,
  body.mobile-compact .col-faab-wasted,
  body.mobile-compact .col-close-calls,
  body.mobile-compact .col-chop {
    display: none;
  }

  body.mobile-compact .col-week {
    width: 20px;
    min-width: 20px;
    padding: 2px;
  }

  body.mobile-compact .score-value,
  body.mobile-compact .score-rank {
    display: none;
  }

  body.mobile-compact .score-cell {
    min-height: 20px;
  }

  body.mobile-compact .summary-row {
    display: none;
  }
}

/* Full view on mobile: show everything, scroll horizontally */
@media (max-width: 767px) {
  body:not(.mobile-minimal):not(.mobile-compact) .guillotine-table {
    font-size: 10px;
  }
}

/* === DESKTOP ENHANCEMENTS === */
@media (min-width: 768px) {
  .guillotine-table {
    font-size: var(--text-sm);
  }

  .guillotine-table th,
  .guillotine-table td {
    padding: 6px 8px;
  }

  .col-manager {
    position: static;
    min-width: 130px;
  }

  thead .col-manager {
    z-index: 10;
  }

  .score-rank {
    font-size: 9px;
  }

  tr:hover:not(.summary-row):not(.eliminated) {
    filter: brightness(1.15);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/css/table-new.css
git commit -m "feat: add mobile-first standings table CSS with view mode variants"
```

---

## Task 5: Rebuild the Standings Table — JS

**Files:**
- Create: `frontend/js/table-renderer-new.js`

- [ ] **Step 1: Create the new table renderer**

This replaces `table-renderer.js` with a clean implementation. Same data contract (receives the season data object from `api.js`), same output (DOM table in a container), but fresh DOM generation without the gray square bug.

```javascript
/* frontend/js/table-renderer-new.js */

/**
 * Rebuilt table renderer for Guillotine League.
 * Clean DOM generation, mobile-first, thematic icons.
 */

import { getScoreColor, getContrastTextColor, calculateWeekStats } from './color-utils.js';
import { skullIcon, trophyIcon, closeCallIcon } from './svg-icons.js';

/**
 * Render the complete Guillotine standings table.
 * @param {Object} data - Season data from API
 * @param {HTMLElement} container - Container element to render into
 */
export function renderTable(data, container) {
  const { season, managers, weekly_stats, current_week, champion, status } = data;

  // Handle pre-season state
  if (current_week === 0 || status === 'pre_draft' || status === 'drafting') {
    renderPreSeason(container, season, status, managers);
    return;
  }

  const displayWeek = current_week || 17;
  const isCompleted = managers.some(m => m.finish_position != null);

  // Pre-calculate stats and rankings per week
  const weekStats = {};
  const weekRanks = {};
  for (let w = 1; w <= displayWeek; w++) {
    weekStats[w] = calculateWeekStats(managers, w);
    weekRanks[w] = buildWeekRankings(managers, w);
  }

  // Detect available columns
  const hasFaabWasted = managers.some(m => m.faab_wasted !== undefined);
  const hasCloseCalls = managers.some(m => m.close_calls !== undefined);

  // Find most recently chopped manager
  const recentlyChopped = managers
    .filter(m => m.chop_week && m.chop_week <= displayWeek)
    .sort((a, b) => b.chop_week - a.chop_week)[0];

  // Build table
  const table = document.createElement('table');
  table.className = 'guillotine-table';
  table.appendChild(buildHeader(displayWeek, hasFaabWasted, hasCloseCalls));
  table.appendChild(buildBody(
    managers, displayWeek, isCompleted, champion, weekStats,
    weekRanks, hasFaabWasted, hasCloseCalls, recentlyChopped, weekly_stats
  ));

  // Clear and populate container
  container.innerHTML = '';
  container.appendChild(table);
}

function renderPreSeason(container, season, status, managers) {
  container.innerHTML = `
    <div class="pre-season-card card">
      <h3>${status === 'drafting' ? 'Draft in Progress' : 'Pre-Draft'}</h3>
      <p class="label" style="margin-top:var(--space-2);">Season ${season} — ${managers.length} managers registered</p>
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-1);margin-top:var(--space-3);">
        ${managers.map(m => `<span class="pill">${m.user_name}</span>`).join('')}
      </div>
    </div>
  `;
}

function buildHeader(displayWeek, hasFaabWasted, hasCloseCalls) {
  const thead = document.createElement('thead');
  const row = document.createElement('tr');

  const cols = [
    { label: 'Draft', cls: 'col-draft' },
    { label: 'Avg>&nbsp;Chop', cls: 'col-avg', title: 'Average weekly rank positions above elimination' },
    { label: '$ Left', cls: 'col-faab' },
  ];

  if (hasFaabWasted) cols.push({ label: '$ Waste', cls: 'col-faab-wasted' });
  if (hasCloseCalls) cols.push({ label: 'Close', cls: 'col-close-calls', title: 'Weeks within 5 pts of elimination' });

  cols.push(
    { label: 'Chop', cls: 'col-chop' },
    { label: 'Manager', cls: 'col-manager' }
  );

  cols.forEach(c => {
    const th = document.createElement('th');
    th.className = c.cls;
    th.innerHTML = c.label;
    if (c.title) th.title = c.title;
    row.appendChild(th);
  });

  for (let w = 1; w <= 17; w++) {
    const th = document.createElement('th');
    th.className = 'col-week';
    th.textContent = `W${w}`;
    if (w === 4 || w === 8) th.classList.add('week-divider');
    row.appendChild(th);
  }

  thead.appendChild(row);
  return thead;
}

function buildBody(managers, displayWeek, isCompleted, champion, weekStats, weekRanks, hasFaabWasted, hasCloseCalls, recentlyChopped, weeklyStatsData) {
  const tbody = document.createElement('tbody');

  // Manager rows
  managers.forEach(manager => {
    const row = document.createElement('tr');
    const isEliminated = !!manager.chop_week;
    const isRecent = recentlyChopped &&
      manager.chop_week === recentlyChopped.chop_week &&
      manager.user_name === recentlyChopped.user_name;

    if (isEliminated) row.classList.add('eliminated');
    if (isRecent && displayWeek < 17) row.classList.add('recently-chopped');

    // Draft position
    addCell(row, manager.draft_position || '-', 'col-draft');

    // Avg pos above chop
    const avgVal = manager.avg_pos_above_chop ?? manager.avg_above_chop;
    addCell(row, typeof avgVal === 'number' ? avgVal.toFixed(1) : '-', 'col-avg');

    // FAAB remaining
    addCell(row, `$${manager.faab_remaining}`, 'col-faab');

    // FAAB wasted
    if (hasFaabWasted) {
      addCell(row, `$${manager.faab_wasted || 0}`, 'col-faab-wasted');
    }

    // Close calls
    if (hasCloseCalls) {
      const cc = manager.close_calls || 0;
      const cell = addCell(row, String(cc), 'col-close-calls');
      if (cc >= 3) cell.style.color = 'var(--accent)';
      else if (cc >= 2) cell.style.color = 'var(--warning)';
    }

    // Chop week
    addCell(row, manager.chop_week || '-', 'col-chop');

    // Manager name with badges and icons
    const nameCell = document.createElement('td');
    nameCell.className = 'col-manager manager-cell';

    // Skull icon for eliminated managers
    if (isEliminated) {
      nameCell.insertAdjacentHTML('beforeend', skullIcon(11) + ' ');
    }

    const nameLink = document.createElement('a');
    nameLink.href = `/manager/${encodeURIComponent(manager.user_name)}`;
    nameLink.className = 'manager-link';
    nameLink.textContent = manager.user_name;
    nameCell.appendChild(nameLink);

    // Badges
    if (isCompleted && manager.finish_position) {
      if (manager.finish_position === 1) {
        nameCell.insertAdjacentHTML('beforeend', `<span class="badge badge-champion">${trophyIcon(9)} CHAMP</span>`);
      } else if (manager.finish_position === 2) {
        nameCell.insertAdjacentHTML('beforeend', '<span class="badge badge-second">2ND</span>');
      } else if (manager.finish_position === 3) {
        nameCell.insertAdjacentHTML('beforeend', '<span class="badge badge-third">3RD</span>');
      }
    } else if (!isEliminated && champion === manager.user_name) {
      nameCell.insertAdjacentHTML('beforeend', `<span class="badge badge-champion">${trophyIcon(9)} CHAMP</span>`);
    } else if (!isEliminated && !isCompleted) {
      nameCell.insertAdjacentHTML('beforeend', '<span class="badge badge-alive">ALIVE</span>');
    }

    if (isRecent && displayWeek < 17) {
      nameCell.insertAdjacentHTML('beforeend', '<span class="badge badge-chopped">CHOP</span>');
    }

    row.appendChild(nameCell);

    // Week score cells
    for (let w = 1; w <= 17; w++) {
      const cell = document.createElement('td');
      cell.className = 'col-week score-cell';

      const score = manager.weekly_scores[String(w)];
      const isChopWeek = manager.chop_week === w;
      const isFuture = w > displayWeek;
      const wasOut = manager.chop_week && w > manager.chop_week;

      if (isFuture || score == null || wasOut) {
        cell.classList.add('na-cell');
      } else if (isChopWeek) {
        cell.classList.add('chop-cell');
        const rank = weekRanks[w]?.[manager.user_name];
        cell.innerHTML = `<span class="score-value">${score.toFixed(2)}</span>${rank ? `<span class="score-rank">${rank}</span>` : ''}`;
      } else {
        const stats = weekStats[w];
        if (stats) {
          const bgColor = getScoreColor(score, stats.min, stats.max, stats.median);
          const textColor = getContrastTextColor(bgColor);
          cell.style.backgroundColor = bgColor;
          cell.style.color = textColor;
        }
        const rank = weekRanks[w]?.[manager.user_name];
        cell.innerHTML = `<span class="score-value">${score.toFixed(2)}</span>${rank ? `<span class="score-rank">${rank}</span>` : ''}`;

        // Close call indicator: within 5 pts of chop for that week
        if (weekStats[w]) {
          const chopScore = weeklyStatsData?.[String(w)]?.chop_score;
          if (chopScore != null && (score - chopScore) <= 5 && (score - chopScore) > 0) {
            cell.insertAdjacentHTML('beforeend', `<span class="close-call-indicator">${closeCallIcon(8)}</span>`);
          }
        }
      }

      if (w === 4 || w === 8) cell.classList.add('week-divider');
      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  // Summary rows
  const summaryDefs = [
    { key: 'high_score', label: 'HIGH SCORE', cls: 'summary-high', first: true },
    { key: 'percentile_75', label: '75TH %ILE', cls: 'summary-75th' },
    { key: 'median', label: 'MEDIAN', cls: 'summary-median' },
    { key: 'percentile_25', label: '25TH %ILE', cls: 'summary-25th' },
    { key: 'chop_score', label: 'CHOP SCORE', cls: 'summary-chop' },
    { key: 'chop_differential', label: 'CHOP DIFF', cls: 'summary-diff' },
  ];

  summaryDefs.forEach(sd => {
    const row = document.createElement('tr');
    row.classList.add('summary-row', sd.cls);
    if (sd.first) row.classList.add('summary-row-first');

    // Empty cells for stat columns
    const emptyCols = 3 + (hasFaabWasted ? 1 : 0) + (hasCloseCalls ? 1 : 0) + 1; // draft, avg, faab, [wasted], [close], chop
    for (let i = 0; i < emptyCols; i++) {
      addCell(row, '', 'na-cell');
    }

    // Label
    const labelCell = addCell(row, sd.label, 'col-manager manager-cell');

    // Week values
    for (let w = 1; w <= 17; w++) {
      const cell = document.createElement('td');
      if (w > displayWeek || !weeklyStatsData?.[String(w)]) {
        cell.classList.add('na-cell');
      } else {
        const val = weeklyStatsData[String(w)][sd.key];
        cell.textContent = val != null ? val.toFixed(2) : '-';
      }
      if (w === 4 || w === 8) cell.classList.add('week-divider');
      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  return tbody;
}

function buildWeekRankings(managers, week) {
  const weekStr = String(week);
  const scores = managers
    .filter(m => {
      const alive = !m.chop_week || m.chop_week >= week;
      const score = m.weekly_scores[weekStr];
      return alive && score != null;
    })
    .map(m => ({ name: m.user_name, score: m.weekly_scores[weekStr] }))
    .sort((a, b) => b.score - a.score);

  const ranks = {};
  scores.forEach((item, i) => { ranks[item.name] = i + 1; });
  return ranks;
}

function addCell(row, content, className) {
  const td = document.createElement('td');
  td.className = className || '';
  if (typeof content === 'string' || typeof content === 'number') {
    td.textContent = content;
  }
  row.appendChild(td);
  return td;
}

/**
 * Export table to PNG using html2canvas.
 * @param {HTMLElement} container - Table container element
 * @param {number} season - Season year
 * @param {number} week - Current week
 */
export async function exportToPNG(container, season, week) {
  container.classList.add('export-mode');
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#08080c',
      logging: false,
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = `guillotine_${season}_week${week}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    container.classList.remove('export-mode');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/js/table-renderer-new.js
git commit -m "feat: rebuild standings table renderer (clean DOM, close call indicators, SVG icons)"
```

---

## Task 6: Update index.html — New Layout & Nav Shell

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Rewrite index.html with new structure**

Replace the entire file. Key changes:
- New shared nav (top bar + hamburger overlay)
- Elimination summary card replaces old hero
- Week controls + view toggles in a compact bar
- Table section
- Info cards below table
- New footer
- Link new CSS files, remove old font link

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="The Guillotine Fantasy Football League - Track standings, scores, and eliminations. 18 teams enter, only one survives.">
  <meta name="theme-color" content="#dc2626">
  <meta property="og:title" content="The Guillotine - Fantasy Football League">
  <meta property="og:description" content="18 teams enter, only one survives. Track standings, scores, and eliminations.">
  <meta property="og:type" content="website">
  <title>The Guillotine - Fantasy Football League</title>

  <link rel="stylesheet" href="/css/design-system.css">
  <link rel="stylesheet" href="/css/nav.css">
  <link rel="stylesheet" href="/css/table-new.css">
  <link rel="stylesheet" href="/css/main.css">

  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#x1FA93;</text></svg>">
</head>
<body>
  <!-- Sticky Nav -->
  <nav class="top-nav" id="top-nav">
    <div class="nav-logo"><a href="/">The Guillotine</a></div>
    <div class="nav-desktop-links"></div>
    <div class="nav-right">
      <select class="nav-season-select" id="season-select" aria-label="Season"></select>
      <button class="nav-hamburger" aria-label="Open menu"></button>
    </div>
  </nav>

  <!-- Mobile Menu Overlay -->
  <div class="nav-menu-overlay" id="nav-menu-overlay">
    <div class="nav-menu-header">
      <span class="nav-logo">The Guillotine</span>
      <button class="nav-menu-close" aria-label="Close menu"></button>
    </div>
    <div class="nav-menu-links"></div>
  </div>

  <!-- Main Content -->
  <div class="page-container">
    <!-- Elimination Summary Card -->
    <div class="elimination-card card" id="elimination-card" style="display:none;">
      <div class="elim-label label" id="elim-label"></div>
      <div class="elim-headline" id="elim-headline"></div>
      <div class="elim-context" id="elim-context"></div>
      <div class="elim-stats" id="elim-stats"></div>
    </div>

    <!-- Week Controls -->
    <div class="controls-bar" id="controls-bar">
      <div class="week-nav">
        <button class="btn week-prev" id="week-prev" aria-label="Previous week">&larr;</button>
        <span class="week-label" id="week-label">Week 1 of 17</span>
        <button class="btn week-next" id="week-next" aria-label="Next week">&rarr;</button>
      </div>
      <div class="controls-right">
        <div class="view-toggles" id="view-toggles">
          <button class="btn active" data-view="default">Full</button>
          <button class="btn" data-view="minimal">Minimal</button>
          <button class="btn" data-view="compact">Heatmap</button>
        </div>
        <button class="btn btn-export" id="export-btn" title="Export as PNG">Export</button>
      </div>
    </div>

    <!-- Loading State -->
    <div class="loading-overlay" id="loading" style="display:none;">
      <div class="loader">
        <p>Loading...</p>
      </div>
    </div>

    <!-- Standings Table -->
    <div class="table-section" id="table-section">
      <div class="table-wrapper">
        <div class="table-container" id="table-container"></div>
      </div>
    </div>

    <!-- Info Cards -->
    <section class="info-cards">
      <div class="card info-card">
        <h4>Prize Pool</h4>
        <div class="prize-list">
          <div class="prize-item"><span class="label">1st</span> <span class="stat-value" style="color:var(--gold);font-size:var(--text-lg);">$700</span></div>
          <div class="prize-item"><span class="label">2nd</span> <span class="stat-value" style="color:var(--silver);font-size:var(--text-lg);">$150</span></div>
          <div class="prize-item"><span class="label">3rd</span> <span class="stat-value" style="color:var(--bronze);font-size:var(--text-lg);">$50</span></div>
        </div>
      </div>
      <div class="card info-card">
        <h4>League Rules</h4>
        <ul class="info-list">
          <li><strong>Waivers:</strong> Wednesday, 8PM EST</li>
          <li><strong>Bench Expansion:</strong> After weeks 4 &amp; 8</li>
          <li><strong>Final Chop:</strong> Week 13 elimination</li>
        </ul>
        <a href="/rules" class="info-link">View Full Rules &rarr;</a>
      </div>
      <div class="card info-card">
        <h4>Chop Rules</h4>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);">Players on teams eliminated from weeks 14+ are <strong>not available</strong> in free agency. Waivers continue through week 17.</p>
      </div>
    </section>
  </div>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="footer-grid">
      <a href="/rules" class="footer-link">Rules</a>
      <a href="/average-finishes" class="footer-link">Historical Stats</a>
      <a href="/draft-order" class="footer-link">Draft Order</a>
      <a href="/transactions" class="footer-link">Transactions</a>
      <a href="/death-bell" class="footer-link">Death Bell</a>
      <a href="/season-recap" class="footer-link">Season Recap</a>
    </div>
    <p class="footer-credit">Data powered by <a href="https://sleeper.app" target="_blank" rel="noopener">Sleeper</a></p>
  </footer>

  <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
  <script type="module" src="/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/index.html
git commit -m "feat: restructure index.html with new nav shell, elimination card, mobile-first layout"
```

---

## Task 7: Update main.css — Page-Specific Styles

**Files:**
- Modify: `frontend/css/main.css`

- [ ] **Step 1: Rewrite main.css**

Strip out old hero, old nav, old card styles, old button styles, old reset — all of which now live in `design-system.css` and `nav.css`. Keep only page-specific styles that aren't covered by the design system. Add new styles for:
- Elimination summary card
- Controls bar (week nav + view toggles)
- Info cards section
- Loading overlay
- Page-specific layouts for secondary pages

This is a large rewrite. The file should go from ~1800 lines down to ~400 lines of page-specific styles. The key new sections:

```css
/* frontend/css/main.css */

/* === ELIMINATION SUMMARY CARD === */
.elimination-card {
  border-left: 3px solid var(--accent);
  margin-bottom: var(--space-4);
  position: relative;
  overflow: hidden;
}

.elimination-card.champion-card {
  border-left-color: var(--gold);
}

.elim-label {
  color: var(--accent);
  margin-bottom: var(--space-1);
}

.champion-card .elim-label {
  color: var(--gold);
}

.elim-headline {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: var(--text-xl);
  color: var(--text-primary);
  line-height: 1.2;
}

@media (min-width: 768px) {
  .elim-headline {
    font-size: var(--text-2xl);
  }
}

.elim-context {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

.elim-stats {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-3);
}

.elim-stat {
  text-align: center;
}

.elim-stat .label {
  display: block;
  margin-bottom: 2px;
}

.elim-stat .stat-value {
  font-size: var(--text-lg);
}

/* === CONTROLS BAR === */
.controls-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.week-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.week-label {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  min-width: 100px;
  text-align: center;
}

.controls-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.view-toggles {
  display: none;
}

@media (max-width: 767px) {
  .view-toggles {
    display: flex;
    gap: 2px;
  }
}

/* === INFO CARDS === */
.info-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  margin-top: var(--space-8);
}

@media (min-width: 768px) {
  .info-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

.info-card h4 {
  margin-bottom: var(--space-3);
  color: var(--accent);
  font-size: var(--text-lg);
}

.prize-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.prize-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.info-link {
  display: inline-block;
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--accent);
  font-weight: 500;
}

.info-link:hover {
  text-decoration: underline;
}

/* === LOADING OVERLAY === */
.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) 0;
  color: var(--text-secondary);
}

/* === BLOOD DRIP DIVIDER === */
.section-divider {
  margin: var(--space-8) 0;
}

/* === SECONDARY PAGE STYLES === */

/* Rules page */
.rules-section {
  margin-bottom: var(--space-8);
}

.rules-section h3 {
  color: var(--accent);
  margin-bottom: var(--space-3);
}

.rules-section p,
.rules-section li {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.7;
}

/* Season selector buttons (for secondary pages) */
.season-buttons {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

/* Stat grid (for transactions, death-bell, etc.) */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

@media (min-width: 768px) {
  .stat-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  text-align: center;
  padding: var(--space-3);
}

.stat-card .label {
  display: block;
  margin-bottom: var(--space-1);
}

.stat-card .stat-value {
  font-size: var(--text-xl);
}

/* Collapsible sections */
.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  cursor: pointer;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--surface-border);
  margin-bottom: var(--space-1);
  transition: background var(--transition-fast);
}

.collapsible-header:hover {
  background: var(--surface-hover);
}

.collapsible-content {
  display: none;
  padding: var(--space-2) 0;
}

.collapsible-content.open {
  display: block;
}

/* Manager profile */
.manager-header {
  margin-bottom: var(--space-6);
}

.manager-name {
  font-size: var(--text-3xl);
  color: var(--text-primary);
}

.manager-badges {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  flex-wrap: wrap;
}

/* Sparkline */
.sparkline {
  display: inline-block;
  vertical-align: middle;
}

.sparkline path {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.5;
}

/* Export mode — make table look good in PNG */
.export-mode {
  padding: var(--space-4);
  background: var(--bg);
}

.export-mode .col-manager {
  position: static;
}
```

- [ ] **Step 2: Delete the old table.css**

```bash
rm frontend/css/table.css
```

- [ ] **Step 3: Commit**

```bash
git add frontend/css/main.css
git rm frontend/css/table.css
git commit -m "feat: rewrite main.css for new design system, remove old table.css"
```

---

## Task 8: Update app.js — Wire Up New Components

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Rewrite app.js to use new modules**

Key changes:
- Import from `table-renderer-new.js` instead of `table-renderer.js`
- Import and call `initNav()` from `nav.js`
- Build the elimination summary card from season data
- Wire up new week nav (prev/next buttons instead of dropdown)
- Wire up view toggles (body class toggling)
- Wire up season selector in nav bar
- Remove old hero/champion banner logic

This is a full rewrite of `app.js`. The data flow stays the same (fetch seasons → load season data → render table), but the DOM targets and UI logic change.

```javascript
/* frontend/js/app.js */

import { fetchAvailableSeasons, fetchSeasonData, fetchCurrentWeek } from './api.js';
import { renderTable, exportToPNG } from './table-renderer-new.js';
import { initNav } from './nav.js';
import { skullIcon, trophyIcon, bloodDripDivider } from './svg-icons.js';
import { getSelectedSeason, setSelectedSeason } from './season-state.js';

const state = {
  seasons: [],
  season: null,
  week: null,
  maxWeek: 17,
  data: null,
  loading: false,
};

// DOM refs
const els = {};

function cacheDom() {
  els.seasonSelect = document.getElementById('season-select');
  els.weekLabel = document.getElementById('week-label');
  els.weekPrev = document.getElementById('week-prev');
  els.weekNext = document.getElementById('week-next');
  els.exportBtn = document.getElementById('export-btn');
  els.tableContainer = document.getElementById('table-container');
  els.loading = document.getElementById('loading');
  els.tableSection = document.getElementById('table-section');
  els.elimCard = document.getElementById('elimination-card');
  els.elimLabel = document.getElementById('elim-label');
  els.elimHeadline = document.getElementById('elim-headline');
  els.elimContext = document.getElementById('elim-context');
  els.elimStats = document.getElementById('elim-stats');
  els.viewToggles = document.getElementById('view-toggles');
}

async function init() {
  cacheDom();
  initNav();

  try {
    const seasonsData = await fetchAvailableSeasons();
    state.seasons = seasonsData.seasons || [];

    // Populate season selector
    els.seasonSelect.innerHTML = state.seasons
      .map(s => `<option value="${s}">${s}</option>`)
      .join('');

    // Determine initial season
    const saved = getSelectedSeason();
    state.season = saved && state.seasons.includes(Number(saved))
      ? Number(saved)
      : Math.max(...state.seasons);

    els.seasonSelect.value = state.season;

    // Setup listeners
    setupListeners();

    // Load initial data
    await loadSeason();
  } catch (err) {
    console.error('Init failed:', err);
    els.tableContainer.innerHTML = '<p style="color:var(--accent);padding:var(--space-4);">Failed to load league data. Please try again.</p>';
  }
}

function setupListeners() {
  // Season change
  els.seasonSelect.addEventListener('change', async (e) => {
    state.season = Number(e.target.value);
    setSelectedSeason(state.season);
    state.week = null;
    await loadSeason();
  });

  // Week navigation
  els.weekPrev.addEventListener('click', async () => {
    if (state.week > 1) {
      state.week--;
      await loadWeek();
    }
  });

  els.weekNext.addEventListener('click', async () => {
    if (state.week < state.maxWeek) {
      state.week++;
      await loadWeek();
    }
  });

  // View toggles
  if (els.viewToggles) {
    els.viewToggles.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (!btn) return;

      // Update active button
      els.viewToggles.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Apply body class
      document.body.classList.remove('mobile-minimal', 'mobile-compact');
      const view = btn.dataset.view;
      if (view === 'minimal') document.body.classList.add('mobile-minimal');
      if (view === 'compact') document.body.classList.add('mobile-compact');
    });
  }

  // Export
  els.exportBtn.addEventListener('click', () => {
    if (state.data) {
      exportToPNG(els.tableContainer, state.season, state.week);
    }
  });

  // Cross-tab season sync
  window.addEventListener('seasonChanged', (e) => {
    const newSeason = e.detail?.season;
    if (newSeason && newSeason !== state.season) {
      state.season = newSeason;
      els.seasonSelect.value = state.season;
      state.week = null;
      loadSeason();
    }
  });
}

async function loadSeason() {
  setLoading(true);

  try {
    // Get current week for live seasons
    let weekData;
    try {
      weekData = await fetchCurrentWeek(state.season);
    } catch {
      // Historical seasons may not have this endpoint
    }

    state.maxWeek = 17;
    if (!state.week) {
      state.week = weekData?.week || 17;
    }

    await loadWeek();
  } catch (err) {
    console.error('Load season failed:', err);
  } finally {
    setLoading(false);
  }
}

async function loadWeek() {
  setLoading(true);

  try {
    state.data = await fetchSeasonData(state.season, state.week);
    updateWeekLabel();
    updateEliminationCard();
    renderTable(state.data, els.tableContainer);
  } catch (err) {
    console.error('Load week failed:', err);
    els.tableContainer.innerHTML = '<p style="color:var(--accent);padding:var(--space-4);">Failed to load data.</p>';
  } finally {
    setLoading(false);
  }
}

function updateWeekLabel() {
  els.weekLabel.textContent = `Week ${state.week} of 17`;
  els.weekPrev.disabled = state.week <= 1;
  els.weekNext.disabled = state.week >= state.maxWeek;
}

function updateEliminationCard() {
  const data = state.data;
  if (!data || !data.managers) {
    els.elimCard.style.display = 'none';
    return;
  }

  const { managers, champion, status, current_week, weekly_stats } = data;

  // Pre-season
  if (current_week === 0 || status === 'pre_draft' || status === 'drafting') {
    els.elimCard.style.display = '';
    els.elimCard.classList.remove('champion-card');
    els.elimLabel.textContent = `Season ${data.season}`;
    els.elimHeadline.textContent = status === 'drafting' ? 'Draft in Progress' : 'Pre-Draft';
    els.elimContext.textContent = `${managers.length} managers registered`;
    els.elimStats.innerHTML = '';
    return;
  }

  // Completed season — champion spotlight
  const isComplete = state.week >= 17 || managers.filter(m => !m.chop_week).length === 1;
  if (isComplete && champion) {
    els.elimCard.style.display = '';
    els.elimCard.classList.add('champion-card');
    els.elimLabel.innerHTML = `${trophyIcon(12)} Season ${data.season} Champion`;
    els.elimHeadline.textContent = champion;
    els.elimContext.textContent = 'Last one standing';
    els.elimStats.innerHTML = '';
    return;
  }

  // Find who was chopped in the viewed week
  const choppedThisWeek = managers.find(m => m.chop_week === state.week);
  if (choppedThisWeek) {
    const score = choppedThisWeek.weekly_scores[String(state.week)];
    const weekStat = weekly_stats?.[String(state.week)];
    const remaining = managers.filter(m => !m.chop_week || m.chop_week > state.week).length;

    els.elimCard.style.display = '';
    els.elimCard.classList.remove('champion-card');
    els.elimLabel.innerHTML = `${skullIcon(12)} Week ${state.week} — The Blade Falls`;
    els.elimHeadline.textContent = `${choppedThisWeek.user_name} eliminated at ${score?.toFixed(1) || '??'}`;

    // Context line
    const closeCalls = choppedThisWeek.close_calls || 0;
    if (closeCalls > 0) {
      els.elimContext.textContent = `Survived ${closeCalls} close call${closeCalls > 1 ? 's' : ''} before the drop`;
    } else {
      const chopDiff = weekStat?.chop_differential;
      if (chopDiff != null) {
        els.elimContext.textContent = `${chopDiff.toFixed(1)} pts below safety`;
      } else {
        els.elimContext.textContent = '';
      }
    }

    // Stats pills
    els.elimStats.innerHTML = `
      <div class="elim-stat"><span class="label">Chop</span><span class="stat-value" style="color:var(--accent);font-size:var(--text-lg);">${weekStat?.chop_score?.toFixed(1) || '-'}</span></div>
      <div class="elim-stat"><span class="label">Median</span><span class="stat-value" style="font-size:var(--text-lg);">${weekStat?.median?.toFixed(1) || '-'}</span></div>
      <div class="elim-stat"><span class="label">High</span><span class="stat-value" style="color:var(--success);font-size:var(--text-lg);">${weekStat?.high_score?.toFixed(1) || '-'}</span></div>
      <div class="elim-stat"><span class="label">Alive</span><span class="stat-value" style="color:var(--success);font-size:var(--text-lg);">${remaining}</span></div>
    `;
    return;
  }

  // No chop this week (e.g., week 1 before eliminations start, or viewing a non-elimination week)
  els.elimCard.style.display = 'none';
}

function setLoading(loading) {
  state.loading = loading;
  if (els.loading) {
    els.loading.style.display = loading ? '' : 'none';
  }
  if (els.tableSection) {
    els.tableSection.style.opacity = loading ? '0.5' : '1';
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat: rewrite app.js for new nav, elimination card, week controls, new table renderer"
```

---

## Task 9: Update Secondary Pages — Nav Shell & Design System

**Files:**
- Modify: `frontend/rules.html`
- Modify: `frontend/average-finishes.html`
- Modify: `frontend/draft-order.html`
- Modify: `frontend/transactions.html`
- Modify: `frontend/death-bell.html`
- Modify: `frontend/season-recap.html`
- Modify: `frontend/manager.html`
- Modify: `frontend/404.html`

- [ ] **Step 1: Update each secondary page**

For each page, apply these changes:
1. Replace the `<head>` CSS links with the new design system files:
   ```html
   <link rel="stylesheet" href="/css/design-system.css">
   <link rel="stylesheet" href="/css/nav.css">
   <link rel="stylesheet" href="/css/main.css">
   ```
2. Remove old Google Fonts link (now in design-system.css)
3. Replace the old `<header>` and nav dropdown with the new shared nav HTML:
   ```html
   <nav class="top-nav" id="top-nav">
     <div class="nav-logo"><a href="/">The Guillotine</a></div>
     <div class="nav-desktop-links"></div>
     <div class="nav-right">
       <button class="nav-hamburger" aria-label="Open menu"></button>
     </div>
   </nav>
   <div class="nav-menu-overlay" id="nav-menu-overlay">
     <div class="nav-menu-header">
       <span class="nav-logo">The Guillotine</span>
       <button class="nav-menu-close" aria-label="Close menu"></button>
     </div>
     <div class="nav-menu-links"></div>
   </div>
   ```
4. Wrap page content in `<div class="page-container">`
5. Replace the old footer with the new shared footer HTML
6. Add nav initialization script at bottom:
   ```html
   <script type="module">
     import { initNav } from '/js/nav.js';
     document.addEventListener('DOMContentLoaded', () => initNav());
   </script>
   ```
7. On `manager.html`: ensure manager name links work from the table, add sparkline placeholder div
8. On `average-finishes.html`: add manager name links to profile pages in the inline script

Do this page by page. Each page keeps its existing inline `<script>` logic for data loading — only the chrome (nav, footer, CSS links) changes.

- [ ] **Step 2: Commit after each page or in batches**

```bash
git add frontend/rules.html frontend/average-finishes.html frontend/draft-order.html frontend/transactions.html frontend/death-bell.html frontend/season-recap.html frontend/manager.html frontend/404.html
git commit -m "feat: apply new nav shell and design system to all secondary pages"
```

---

## Task 10: Manager Profile — Sparklines & Linking

**Files:**
- Modify: `frontend/manager.html` (inline script section)

- [ ] **Step 1: Add sparkline generation to manager profile**

In the manager page's inline script, after loading the manager data and building season cards, add a sparkline SVG for each season:

```javascript
function generateSparkline(weeklyScores, width = 120, height = 30) {
  const scores = Object.entries(weeklyScores)
    .filter(([, v]) => v != null)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => v);

  if (scores.length < 2) return '';

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const points = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * width;
    const y = height - ((s - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <polyline points="${points.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
```

Insert the sparkline into each season card after the stats.

- [ ] **Step 2: Verify manager links from the standings table**

Navigate to the home page, click a manager name in the table, and confirm it navigates to `/manager/<name>` and loads their profile correctly.

- [ ] **Step 3: Commit**

```bash
git add frontend/manager.html
git commit -m "feat: add score sparklines to manager profiles, verify linking from table"
```

---

## Task 11: Thematic Elements — Blood Drip Dividers

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/rules.html`

- [ ] **Step 1: Add blood drip dividers to index.html**

In `app.js`, after the table renders, inject a blood drip divider between the table section and the info cards:

```javascript
import { bloodDripDivider } from './svg-icons.js';
// After renderTable call:
const divider = document.querySelector('.section-divider');
if (!divider) {
  const d = document.createElement('div');
  d.className = 'section-divider';
  d.innerHTML = bloodDripDivider();
  els.tableSection.after(d);
}
```

- [ ] **Step 2: Add dividers to rules.html between major sections**

Insert `<div class="section-divider">[bloodDripDivider SVG]</div>` between the major rules sections (How It Works, Payouts, Roster, etc.). Since the rules page doesn't use JS modules, paste the SVG directly into the HTML between sections (2-3 max).

- [ ] **Step 3: Commit**

```bash
git add frontend/js/app.js frontend/index.html frontend/rules.html
git commit -m "feat: add blood drip dividers between page sections"
```

---

## Task 12: Delete Old Table Renderer & Clean Up

**Files:**
- Delete: `frontend/js/table-renderer.js`

- [ ] **Step 1: Verify the new renderer works**

Load the site locally. Test:
- Desktop: all columns visible, heatmap colors correct, summary rows present, badges correct
- Mobile (use Chrome DevTools device toolbar, iPhone 12/13): sticky manager column, minimal view hides stat columns, heatmap view shows color blocks only
- Export to PNG: generates correct image
- Season switching: loads different seasons, week navigation works
- Pre-season state: shows registered managers card
- Completed season: shows champion spotlight card

- [ ] **Step 2: Delete the old table renderer**

```bash
git rm frontend/js/table-renderer.js
git commit -m "chore: remove old table-renderer.js (replaced by table-renderer-new.js)"
```

---

## Task 13: Local Testing & Polish

- [ ] **Step 1: Start local dev server**

```bash
cd "C:/Users/bille/OneDrive/Guillotine website"
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

- [ ] **Step 2: Test all pages in browser**

Navigate to each page and verify:
- `http://localhost:8000/` — standings load, elimination card shows, table renders, info cards visible below, footer links work
- `http://localhost:8000/rules` — new nav, rules content styled correctly
- `http://localhost:8000/average-finishes` — table loads, manager names link to profiles
- `http://localhost:8000/draft-order` — renders correctly
- `http://localhost:8000/transactions` — loads transaction data
- `http://localhost:8000/death-bell` — themed styling, skull icons
- `http://localhost:8000/season-recap` — superlatives and recap cards
- `http://localhost:8000/manager/TheShlug` — profile loads with sparklines

- [ ] **Step 3: Test mobile responsiveness**

Use Chrome DevTools (Ctrl+Shift+M) with iPhone 12/13 viewport:
- Nav: hamburger appears, menu opens/closes, season selector visible
- Table: sticky manager column works, view toggles switch correctly
- All pages: no horizontal overflow, readable text, touch-friendly targets

- [ ] **Step 4: Fix any issues found during testing**

Address CSS spacing, overflow, font sizing, or rendering issues discovered during testing.

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: polish and fixes from local testing"
```

---

## Task 14: Deploy & Verify on Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

Vercel will auto-deploy from the GitHub push.

- [ ] **Step 2: Verify production deployment**

Check `https://theguillotine.vercel.app/` and verify:
- All pages load correctly
- Mobile view works on actual iPhone (ask user to test)
- Season data loads (2023, 2024, 2025)
- PNG export works
- No console errors

- [ ] **Step 3: Fix any deployment-specific issues**

Address any Vercel routing, font loading, or API issues that appear in production but not locally.

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "fix: deployment fixes for Vercel"
git push origin main
```
