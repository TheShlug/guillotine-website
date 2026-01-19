/**
 * API client for Guillotine League website.
 */

const API_BASE = '/api';

/**
 * Fetch available seasons from API
 * @returns {Promise<Object>} Object with seasons array and live_seasons array
 */
export async function fetchAvailableSeasons() {
  const response = await fetch(`${API_BASE}/seasons`);
  if (!response.ok) {
    throw new Error('Failed to fetch available seasons');
  }
  return response.json();
}

/**
 * Fetch season data from API
 * @param {number} season - Season year (2023, 2024, 2025, etc.)
 * @param {number|null} week - Optional week number
 * @returns {Promise<Object>}
 */
export async function fetchSeasonData(season, week = null) {
  let url = `${API_BASE}/seasons/${season}`;
  if (week !== null) {
    url += `?week=${week}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch season ${season}: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch current NFL week for a season
 * @param {number} season - Season year
 * @returns {Promise<number>}
 */
export async function fetchCurrentWeek(season = 2025) {
  const response = await fetch(`${API_BASE}/seasons/${season}/current-week`);
  if (!response.ok) {
    return 1; // Default to week 1
  }

  const data = await response.json();
  return data.week;
}

/**
 * Fetch average finishes data
 * @returns {Promise<Object>}
 */
export async function fetchAverageFinishes() {
  const response = await fetch(`${API_BASE}/average-finishes`);
  if (!response.ok) {
    throw new Error('Failed to fetch average finishes');
  }

  return response.json();
}

/**
 * Fetch league info (prize pool, rules, etc.)
 * @returns {Promise<Object>}
 */
export async function fetchLeagueInfo() {
  const response = await fetch(`${API_BASE}/league-info`);
  if (!response.ok) {
    throw new Error('Failed to fetch league info');
  }

  return response.json();
}
