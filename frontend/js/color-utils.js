/**
 * Color utility functions for Guillotine table.
 * Implements independent per-week color gradients with median as white point.
 */

const COLOR_LOW = '#b11226';   // Red
const COLOR_MID = '#ffffff';   // White
const COLOR_HIGH = '#2e7d32';  // Green

/**
 * Parse hex color to RGB components
 * @param {string} hex - Hex color string
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Interpolate between two hex colors
 * @param {string} color1 - Start color (hex)
 * @param {string} color2 - End color (hex)
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {string} Interpolated hex color
 */
function interpolateColor(color1, color2, factor) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return COLOR_MID;

  const r = c1.r + (c2.r - c1.r) * factor;
  const g = c1.g + (c2.g - c1.g) * factor;
  const b = c1.b + (c2.b - c1.b) * factor;

  return rgbToHex(r, g, b);
}

/**
 * Calculate background color for a score cell.
 * Uses independent per-week scaling with median as white point.
 *
 * @param {number|null} score - The score value
 * @param {number} min - Minimum score for this week
 * @param {number} max - Maximum score for this week
 * @param {number} median - Median score for this week
 * @returns {string} Background color as hex
 */
export function getScoreColor(score, min, max, median) {
  if (score === null || score === undefined) {
    return '#1a1a1a';  // Dark gray for NA
  }

  if (min === max || min === null || max === null) {
    return COLOR_MID;  // Single value or no data, use white
  }

  // Calculate position relative to median
  if (score <= median) {
    // Below or at median: red to white gradient
    if (min >= median) {
      return COLOR_MID;
    }
    const factor = (score - min) / (median - min);
    return interpolateColor(COLOR_LOW, COLOR_MID, factor);
  } else {
    // Above median: white to green gradient
    if (max <= median) {
      return COLOR_MID;
    }
    const factor = (score - median) / (max - median);
    return interpolateColor(COLOR_MID, COLOR_HIGH, factor);
  }
}

/**
 * Determine text color based on background brightness
 * @param {string} bgColor - Background color as hex
 * @returns {string} 'black' or 'white'
 */
export function getContrastTextColor(bgColor) {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return 'black';

  // Luminance calculation (perceived brightness)
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Calculate weekly stats needed for color gradient
 * @param {Array} managers - Array of manager data
 * @param {number} week - Week number
 * @returns {{min: number, max: number, median: number}}
 */
export function calculateWeekStats(managers, week) {
  const weekStr = String(week);

  const scores = managers
    .filter(m => {
      const score = m.weekly_scores[weekStr];
      const isAlive = !m.chop_week || m.chop_week >= week;
      return isAlive && score !== null && score !== undefined;
    })
    .map(m => m.weekly_scores[weekStr])
    .sort((a, b) => a - b);

  if (scores.length === 0) {
    return { min: 0, max: 0, median: 0 };
  }

  const min = scores[0];
  const max = scores[scores.length - 1];
  const mid = Math.floor(scores.length / 2);
  const median = scores.length % 2 === 0
    ? (scores[mid - 1] + scores[mid]) / 2
    : scores[mid];

  return { min, max, median };
}
