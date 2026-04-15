/**
 * svg-icons.js
 * Inline SVG icon functions for the Guillotine League dashboard.
 * Each function returns an SVG string suitable for innerHTML injection.
 */

/**
 * Skull icon for eliminated managers.
 * @param {number} size - Width/height in pixels (default 14)
 * @returns {string} SVG string
 */
export function skullIcon(size = 14) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" class="icon icon-skull" aria-hidden="true">
    <path d="M12 2C7.03 2 3 6.03 3 11c0 3.1 1.53 5.83 3.88 7.5L7 21h2v1h2v-1h2v1h2v-1h2l.12-2.5C19.47 16.83 21 14.1 21 11c0-4.97-4.03-9-9-9zm-3.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3.5 3c-1.1 0-2-.45-2-1h4c0 .55-.9 1-2 1zm3.5-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
  </svg>`;
}

/**
 * Trophy icon for champions.
 * @param {number} size - Width/height in pixels (default 14)
 * @returns {string} SVG string
 */
export function trophyIcon(size = 14) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" class="icon icon-trophy" aria-hidden="true">
    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
  </svg>`;
}

/**
 * Blade/lightning bolt icon for chop events.
 * @param {number} size - Width/height in pixels (default 14)
 * @returns {string} SVG string
 */
export function bladeIcon(size = 14) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" class="icon icon-blade" aria-hidden="true">
    <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
  </svg>`;
}

/**
 * Warning circle icon for close calls.
 * @param {number} size - Width/height in pixels (default 12)
 * @returns {string} SVG string
 */
export function closeCallIcon(size = 12) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-close-call" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`;
}

/**
 * Blood drip section divider.
 * Wide SVG with a gradient horizontal line and 3 teardrop drips hanging from it.
 * @returns {string} SVG string
 */
export function bloodDripDivider() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 16" preserveAspectRatio="none" class="divider-drip" aria-hidden="true">
    <defs>
      <linearGradient id="drip-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:transparent;stop-opacity:1"/>
        <stop offset="20%" style="stop-color:var(--accent, #dc2626);stop-opacity:1"/>
        <stop offset="80%" style="stop-color:var(--accent, #dc2626);stop-opacity:1"/>
        <stop offset="100%" style="stop-color:transparent;stop-opacity:1"/>
      </linearGradient>
    </defs>
    <line x1="0" y1="1" x2="1200" y2="1" stroke="url(#drip-grad)" stroke-width="1.5"/>
    <!-- Drip 1 at x=300, opacity 0.6, medium size -->
    <path d="M300 1 C300 1 296 6 296 9 C296 11.2 297.8 13 300 13 C302.2 13 304 11.2 304 9 C304 6 300 1 300 1Z" fill="var(--accent, #dc2626)" opacity="0.6"/>
    <!-- Drip 2 at x=600, opacity 0.7, slightly larger -->
    <path d="M600 1 C600 1 595 7 595 11 C595 13.8 597.2 16 600 16 C602.8 16 605 13.8 605 11 C605 7 600 1 600 1Z" fill="var(--accent, #dc2626)" opacity="0.7"/>
    <!-- Drip 3 at x=900, opacity 0.5, smaller -->
    <path d="M900 1 C900 1 897 5 897 8 C897 9.7 898.3 11 900 11 C901.7 11 903 9.7 903 8 C903 5 900 1 900 1Z" fill="var(--accent, #dc2626)" opacity="0.5"/>
  </svg>`;
}

/**
 * Export/download icon — arrow pointing down into a tray.
 * @param {number} size - Width/height in pixels (default 18)
 * @returns {string} SVG string
 */
export function exportIcon(size = 18) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-export" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`;
}

/**
 * Hamburger icon — three horizontal lines for mobile menu.
 * @param {number} size - Width/height in pixels (default 20)
 * @returns {string} SVG string
 */
export function hamburgerIcon(size = 20) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-hamburger" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`;
}

/**
 * Close icon — X for closing menu.
 * @param {number} size - Width/height in pixels (default 20)
 * @returns {string} SVG string
 */
export function closeIcon(size = 20) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-close" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
}
