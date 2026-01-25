/**
 * Universal season state management.
 * Persists selected season across pages using localStorage.
 */

const STORAGE_KEY = 'guillotine_selected_season';

// Get the saved season from localStorage
export function getSelectedSeason() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? parseInt(saved, 10) : null;
}

// Save the selected season to localStorage
export function setSelectedSeason(season) {
  localStorage.setItem(STORAGE_KEY, String(season));
  // Dispatch event for other components on the same page
  window.dispatchEvent(new CustomEvent('seasonChanged', { detail: { season } }));
}

// Listen for season changes from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    window.dispatchEvent(new CustomEvent('seasonChanged', {
      detail: { season: parseInt(e.newValue, 10) }
    }));
  }
});

/**
 * Get the reigning champion info.
 * The reigning champion is ALWAYS from the previous completed season.
 * They remain reigning champ until the next season finishes.
 */
export function getReigningChampion(seasonsData, allSeasons) {
  // Sort seasons descending (newest first)
  const sortedSeasons = [...allSeasons].sort((a, b) => b - a);

  // Find the most recent COMPLETED season
  // A completed season has a champion and is at week 17
  for (const season of sortedSeasons) {
    const seasonInfo = seasonsData[season];
    if (seasonInfo && seasonInfo.champion && seasonInfo.is_complete) {
      return {
        name: seasonInfo.champion,
        season: season
      };
    }
  }

  // No completed season found
  return null;
}

/**
 * Initialize season selector buttons with universal state.
 * @param {HTMLElement} container - The container for season buttons
 * @param {number[]} seasons - Array of available seasons
 * @param {Function} onSeasonChange - Callback when season changes
 * @param {Object} options - Optional configuration
 */
export function initSeasonSelector(container, seasons, onSeasonChange, options = {}) {
  const { defaultToMostRecent = true } = options;

  // Sort seasons descending (newest first) for display
  const sortedSeasons = [...seasons].sort((a, b) => b - a);

  // Determine initial season
  let initialSeason = getSelectedSeason();
  if (!initialSeason || !seasons.includes(initialSeason)) {
    initialSeason = defaultToMostRecent ? sortedSeasons[0] : sortedSeasons[sortedSeasons.length - 1];
  }

  // Create buttons
  container.innerHTML = '';
  sortedSeasons.forEach(season => {
    const btn = document.createElement('button');
    btn.className = 'season-btn';
    btn.textContent = season;
    btn.dataset.season = season;

    if (season === initialSeason) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
      if (parseInt(btn.dataset.season) !== getSelectedSeason()) {
        selectSeason(container, season, onSeasonChange);
      }
    });

    container.appendChild(btn);
  });

  // Listen for external season changes (from other tabs/pages)
  window.addEventListener('seasonChanged', (e) => {
    const newSeason = e.detail.season;
    updateActiveButton(container, newSeason);
    onSeasonChange(newSeason);
  });

  // Set initial season and trigger callback
  setSelectedSeason(initialSeason);
  return initialSeason;
}

function selectSeason(container, season, callback) {
  setSelectedSeason(season);
  updateActiveButton(container, season);
  callback(season);
}

function updateActiveButton(container, season) {
  container.querySelectorAll('.season-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.season) === season);
  });
}
