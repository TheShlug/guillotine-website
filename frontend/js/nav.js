/**
 * nav.js
 * Shared navigation module for the Guillotine Fantasy Football League.
 * Builds desktop links, mobile hamburger overlay, and wires up all interactions.
 */

import { hamburgerIcon, closeIcon } from './svg-icons.js';
import { getSelectedSeason, setSelectedSeason } from './season-state.js';

/** All site pages in display order */
export const NAV_LINKS = [
  { href: '/',               label: 'Standings'     },
  { href: '/rules',          label: 'Rules'         },
  { href: '/average-finishes', label: 'Stats'       },
  { href: '/draft-order',    label: 'Draft'         },
  { href: '/transactions',   label: 'Transactions'  },
  { href: '/death-bell',     label: 'Death Bell'    },
  { href: '/season-recap',   label: 'Recap'         },
];

/**
 * Determine whether a nav href matches the current pathname.
 * Exact match for '/', prefix match for all other routes.
 *
 * @param {string} href        - The nav link href (e.g. '/rules')
 * @param {string} pathname    - window.location.pathname
 * @returns {boolean}
 */
function isActive(href, pathname) {
  if (href === '/') {
    return pathname === '/' || pathname === '/index.html';
  }
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Initialize shared navigation.
 *
 * Expects the following elements already in the DOM (injected by each page's HTML):
 *   #top-nav                 — <nav> wrapper
 *   .nav-desktop-links       — <div> inside .nav-right for desktop links
 *   .nav-menu-links          — <div> inside .nav-menu-overlay for mobile links
 *   .nav-hamburger           — <button> that opens the overlay
 *   .nav-menu-overlay        — full-screen overlay element
 *   .nav-menu-close          — <button> inside overlay that closes it
 *
 * @param {object} [options]
 * @param {string} [options.activePath]  - Override pathname for active detection
 *                                         (defaults to window.location.pathname)
 */
export async function initNav(options = {}) {
  /* ---- Resolve root element ---- */
  const topNav = document.getElementById('top-nav');
  if (!topNav) {
    console.warn('[nav.js] #top-nav element not found — skipping initNav()');
    return;
  }

  const pathname = options.activePath ?? window.location.pathname;

  /* ---- Build desktop links ---- */
  const desktopContainer = topNav.querySelector('.nav-desktop-links');
  if (desktopContainer) {
    desktopContainer.innerHTML = '';
    NAV_LINKS.forEach(({ href, label }) => {
      const a = document.createElement('a');
      a.href = href;
      a.className = 'nav-desktop-link' + (isActive(href, pathname) ? ' active' : '');
      a.textContent = label;
      if (isActive(href, pathname)) {
        a.setAttribute('aria-current', 'page');
      }
      desktopContainer.appendChild(a);
    });
  }

  /* ---- Build mobile menu links ---- */
  const overlay = topNav.closest('body')
    ? document.querySelector('.nav-menu-overlay')
    : topNav.querySelector('.nav-menu-overlay');

  const mobileContainer = overlay
    ? overlay.querySelector('.nav-menu-links')
    : topNav.querySelector('.nav-menu-links');

  if (mobileContainer) {
    mobileContainer.innerHTML = '';
    NAV_LINKS.forEach(({ href, label }) => {
      const a = document.createElement('a');
      a.href = href;
      a.className = 'nav-menu-link' + (isActive(href, pathname) ? ' active' : '');
      a.textContent = label;
      if (isActive(href, pathname)) {
        a.setAttribute('aria-current', 'page');
      }
      mobileContainer.appendChild(a);
    });
  }

  /* ---- Overlay open / close helpers ---- */
  function openMenu() {
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus the close button for keyboard accessibility
    const closeBtn = overlay.querySelector('.nav-menu-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeMenu() {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Return focus to hamburger
    const hamburger = topNav.querySelector('.nav-hamburger');
    if (hamburger) hamburger.focus();
  }

  /* ---- Wire hamburger button ---- */
  const hamburger = topNav.querySelector('.nav-hamburger');
  if (hamburger) {
    // Inject icon if not already present
    if (!hamburger.innerHTML.trim()) {
      hamburger.innerHTML = hamburgerIcon(20);
    }
    hamburger.setAttribute('aria-label', 'Open navigation menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-controls', overlay ? overlay.id || 'nav-menu-overlay' : '');

    hamburger.addEventListener('click', () => {
      const isOpen = overlay && overlay.classList.contains('open');
      if (isOpen) {
        closeMenu();
        hamburger.setAttribute('aria-expanded', 'false');
      } else {
        openMenu();
        hamburger.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /* ---- Wire close button inside overlay ---- */
  if (overlay) {
    // Give overlay an id if it doesn't have one (for aria-controls)
    if (!overlay.id) overlay.id = 'nav-menu-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Navigation menu');

    const closeBtn = overlay.querySelector('.nav-menu-close');
    if (closeBtn) {
      // Inject icon if empty
      if (!closeBtn.innerHTML.trim()) {
        closeBtn.innerHTML = closeIcon(20);
      }
      closeBtn.setAttribute('aria-label', 'Close navigation menu');
      closeBtn.addEventListener('click', () => {
        closeMenu();
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      });
    }

    /* ---- Close on overlay background click (not on menu content) ---- */
    overlay.addEventListener('click', (e) => {
      // Only close if the click was directly on the overlay backdrop
      if (e.target === overlay) {
        closeMenu();
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Close on Escape key ---- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
      closeMenu();
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---- Season selector (shared across all pages) ---- */
  const seasonSelect = document.getElementById('season-select');
  if (seasonSelect) {
    try {
      const resp = await fetch('/api/seasons');
      const data = await resp.json();
      const seasons = data.seasons || [];
      seasonSelect.innerHTML = seasons.map(s => `<option value="${s}">${s} Season</option>`).join('');

      // Restore saved selection
      const saved = getSelectedSeason();
      if (saved && seasons.includes(Number(saved))) {
        seasonSelect.value = saved;
      } else {
        seasonSelect.value = Math.max(...seasons);
      }

      seasonSelect.addEventListener('change', () => {
        setSelectedSeason(Number(seasonSelect.value));
        // Dispatch event for page-specific scripts to handle
        window.dispatchEvent(new CustomEvent('navSeasonChanged', { detail: { season: Number(seasonSelect.value) } }));
      });
    } catch (e) {
      console.warn('Could not load seasons for nav:', e);
    }
  }
}
