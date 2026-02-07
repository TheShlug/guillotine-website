/**
 * Main application entry point for Guillotine League website.
 */

import { fetchSeasonData, fetchCurrentWeek, fetchAvailableSeasons } from './api.js';
import { renderTable, exportToPNG } from './table-renderer.js';
import { getSelectedSeason, setSelectedSeason } from './season-state.js';

// Application state
const state = {
  seasons: [],
  season: null,
  week: 17,
  data: null,
  loading: false,
  reigningChampion: null  // Cached reigning champion info
};

// DOM elements
let seasonTabsContainer;
let weekSelector;
let exportButton;
let tableContainer;
let tableSection;
let loadingOverlay;
let tableHeaderBar;
let mobileViewToggle;
let pageNavSelect;
let championBanner;
let championName;

/**
 * Initialize the application
 */
async function init() {
  // Get DOM elements
  seasonTabsContainer = document.getElementById('season-tabs');
  weekSelector = document.getElementById('week-selector');
  exportButton = document.getElementById('export-btn');
  tableContainer = document.getElementById('table-container');
  tableSection = document.getElementById('table-section');
  loadingOverlay = document.getElementById('loading');
  tableHeaderBar = document.getElementById('table-header-bar');
  mobileViewToggle = document.getElementById('mobile-view-toggle');
  pageNavSelect = document.getElementById('page-nav');
  championBanner = document.getElementById('champion-banner');
  championName = document.getElementById('champion-name');

  // Show loading state
  setLoading(true);

  try {
    // Fetch available seasons dynamically
    const seasonsData = await fetchAvailableSeasons();
    state.seasons = seasonsData.seasons;

    // Use saved season from localStorage or default to most recent
    const savedSeason = getSelectedSeason();
    if (savedSeason && state.seasons.includes(savedSeason)) {
      state.season = savedSeason;
    } else {
      state.season = state.seasons[state.seasons.length - 1];
      setSelectedSeason(state.season);
    }

    // Populate season tabs
    populateSeasonTabs();

    // Populate week selector
    populateWeekSelector();

    // Set up event listeners
    setupEventListeners();

    // Determine and cache the reigning champion (from most recent completed season)
    await determineReigningChampion();

    // Auto-detect current week for live seasons
    if (seasonsData.live_seasons && seasonsData.live_seasons.includes(state.season)) {
      try {
        const currentWeek = await fetchCurrentWeek(state.season);
        state.week = currentWeek;
        weekSelector.value = currentWeek;
      } catch (e) {
        console.warn('Could not fetch current week, defaulting to 17');
        state.week = 17;
      }
    }

    // Load initial data
    await loadSeasonData();
  } catch (error) {
    console.error('Failed to initialize:', error);
    tableContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--color-text-muted);">
        <p>Failed to initialize the application.</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
      </div>
    `;
    setLoading(false);
  }
}

/**
 * Populate season tabs dynamically
 */
function populateSeasonTabs() {
  seasonTabsContainer.innerHTML = '';

  state.seasons.forEach(season => {
    const button = document.createElement('button');
    button.className = 'tab-btn';
    button.dataset.season = season;
    button.textContent = season;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', season === state.season ? 'true' : 'false');

    if (season === state.season) {
      button.classList.add('active');
    }

    seasonTabsContainer.appendChild(button);
  });
}

/**
 * Populate the week selector dropdown
 */
function populateWeekSelector() {
  weekSelector.innerHTML = '';
  for (let w = 1; w <= 17; w++) {
    const option = document.createElement('option');
    option.value = w;
    option.textContent = `Week ${w}`;
    weekSelector.appendChild(option);
  }
  weekSelector.value = state.week;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Season tabs - use event delegation
  seasonTabsContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('tab-btn')) {
      const season = parseInt(e.target.dataset.season);
      if (season !== state.season) {
        state.season = season;
        setSelectedSeason(season); // Save to localStorage for universal state
        updateActiveTab();

        // Reset week for new season
        state.week = 17;
        weekSelector.value = state.week;

        await loadSeasonData();
      }
    }
  });

  // Listen for season changes from other tabs/pages
  window.addEventListener('seasonChanged', async (e) => {
    const newSeason = e.detail.season;
    if (newSeason !== state.season && state.seasons.includes(newSeason)) {
      state.season = newSeason;
      state.week = 17;
      weekSelector.value = state.week;
      updateActiveTab();
      await loadSeasonData();
    }
  });

  // Week selector
  weekSelector.addEventListener('change', async (e) => {
    state.week = parseInt(e.target.value);
    await loadSeasonData();
  });

  // Mobile view toggle
  if (mobileViewToggle) {
    mobileViewToggle.addEventListener('click', (e) => {
      if (e.target.classList.contains('toggle-btn')) {
        const view = e.target.dataset.view;

        // Update active button state
        mobileViewToggle.querySelectorAll('.toggle-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Update body class for view mode
        document.body.classList.remove('mobile-cards', 'mobile-compact', 'mobile-minimal');
        if (view === 'compact') {
          document.body.classList.add('mobile-compact');
        } else if (view === 'cards') {
          document.body.classList.add('mobile-cards');
        } else if (view === 'minimal') {
          document.body.classList.add('mobile-minimal');
        }
        // 'default' view doesn't need a class - shows full table
      }
    });
  }

  // Page navigation dropdown
  if (pageNavSelect) {
    pageNavSelect.addEventListener('change', (e) => {
      const url = e.target.value;
      if (url) {
        window.location.href = url;
      }
    });
  }

  // Export button with visual feedback
  exportButton.addEventListener('click', async () => {
    if (state.data && !exportButton.disabled) {
      // Show exporting state
      const originalText = exportButton.innerHTML;
      exportButton.disabled = true;
      exportButton.innerHTML = `
        <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/>
        </svg>
        Exporting...
      `;

      try {
        await exportToPNG(tableContainer, state.season, state.week);

        // Show success state
        exportButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Saved!
        `;
        exportButton.style.background = 'var(--color-score-high)';
        exportButton.style.color = 'white';

        // Reset after 2 seconds
        setTimeout(() => {
          exportButton.innerHTML = originalText;
          exportButton.style.background = '';
          exportButton.style.color = '';
          exportButton.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('Export failed:', error);
        exportButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Failed
        `;
        exportButton.style.background = 'var(--color-accent)';

        setTimeout(() => {
          exportButton.innerHTML = originalText;
          exportButton.style.background = '';
          exportButton.style.color = '';
          exportButton.disabled = false;
        }, 2000);
      }
    }
  });
}

/**
 * Update active tab styling
 */
function updateActiveTab() {
  const tabs = seasonTabsContainer.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    const season = parseInt(btn.dataset.season);
    const isActive = season === state.season;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

/**
 * Show/hide loading overlay
 */
function setLoading(loading) {
  state.loading = loading;
  loadingOverlay.classList.toggle('visible', loading);
  tableSection.style.display = loading ? 'none' : '';
}

/**
 * Load and render season data
 */
async function loadSeasonData() {
  setLoading(true);

  try {
    const data = await fetchSeasonData(state.season, state.week);
    state.data = data;

    // Update table header bar
    updateTableHeader(data);

    // Render the table
    renderTable(data, tableContainer);
  } catch (error) {
    console.error('Failed to load season data:', error);
    tableContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--color-text-muted);">
        <p>Failed to load data for season ${state.season}.</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
      </div>
    `;
  } finally {
    setLoading(false);
  }
}

/**
 * Update table header bar with season info
 */
function updateTableHeader(data) {
  const { season, champion, current_week } = data;
  const displayWeek = current_week || 17;

  let headerContent = `<span>Season ${season}</span>`;

  if (champion) {
    headerContent += ` <span style="margin-left: 1rem; opacity: 0.9;">Champion: ${champion}</span>`;
  }

  headerContent += `<span style="float: right;">Showing Week ${displayWeek}</span>`;

  tableHeaderBar.innerHTML = headerContent;

  // Update champion banner
  updateChampionBanner(data);
}

/**
 * Determine the reigning champion from the most recent completed season.
 * Called once at init and cached in state.
 */
async function determineReigningChampion() {
  const allSeasons = [...state.seasons].sort((a, b) => a - b);

  // Check seasons from newest to oldest to find the most recent with a champion
  for (let i = allSeasons.length - 1; i >= 0; i--) {
    const seasonYear = allSeasons[i];
    try {
      const seasonData = await fetchSeasonData(seasonYear, 17);
      if (seasonData.champion) {
        state.reigningChampion = {
          name: seasonData.champion,
          season: seasonYear
        };
        break;
      }
    } catch (e) {
      // Season data not available, continue to next
      continue;
    }
  }
}

/**
 * Update the champion banner display.
 * Always shows the REIGNING champion (from the most recent completed season).
 * The reigning champ stays until the next season finishes.
 */
function updateChampionBanner(data) {
  // Always show the cached reigning champion, regardless of which season is being viewed
  if (state.reigningChampion) {
    championName.textContent = state.reigningChampion.name;
    championBanner.style.display = 'block';
  } else {
    championBanner.style.display = 'none';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
