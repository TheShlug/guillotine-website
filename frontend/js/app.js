/**
 * app.js
 * Main application controller for the Guillotine League standings page.
 * Wires up the new nav, elimination card, week prev/next controls, and new table renderer.
 */

import { fetchAvailableSeasons, fetchSeasonData, fetchCurrentWeek } from './api.js';
import { renderTable, exportToPNG } from './table-renderer-new.js';
import { initNav } from './nav.js';
import { skullIcon, trophyIcon } from './svg-icons.js';
import { getSelectedSeason, setSelectedSeason } from './season-state.js';

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------

const state = {
  seasons: [],
  season: null,
  week: null,
  maxWeek: 17,
  data: null,
  loading: false,
};

// ---------------------------------------------------------------------------
// Cached DOM references
// ---------------------------------------------------------------------------

let els = {};

/**
 * Query all DOM elements once and store in the `els` object.
 */
function cacheDom() {
  els.seasonSelect    = document.getElementById('season-select');
  els.weekLabel       = document.getElementById('week-label');
  els.weekPrev        = document.getElementById('week-prev');
  els.weekNext        = document.getElementById('week-next');
  els.exportBtn       = document.getElementById('export-btn');
  els.tableContainer  = document.getElementById('table-container');
  els.loading         = document.getElementById('loading');
  els.tableSection    = document.getElementById('table-section');
  els.eliminationCard = document.getElementById('elimination-card');
  els.elimLabel       = document.getElementById('elim-label');
  els.elimHeadline    = document.getElementById('elim-headline');
  els.elimContext     = document.getElementById('elim-context');
  els.elimStats       = document.getElementById('elim-stats');
  els.viewToggles     = document.getElementById('view-toggles');
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Main entry point — called on DOMContentLoaded.
 */
async function init() {
  cacheDom();
  initNav();

  try {
    // Fetch available seasons
    const seasonsData = await fetchAvailableSeasons();
    state.seasons = seasonsData.seasons || [];

    // Populate the season-select dropdown
    els.seasonSelect.innerHTML = '';
    state.seasons.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = `${s} Season`;
      els.seasonSelect.appendChild(opt);
    });

    // Determine initial season: localStorage preference or latest
    const savedSeason = getSelectedSeason();
    if (savedSeason && state.seasons.includes(Number(savedSeason))) {
      state.season = Number(savedSeason);
    } else {
      state.season = state.seasons[state.seasons.length - 1];
    }
    els.seasonSelect.value = state.season;

    setupListeners();
    await loadSeason();
  } catch (err) {
    console.error('[app.js] init() failed:', err);
    if (els.tableContainer) {
      els.tableContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--color-text-muted);">
          <p>Failed to initialise the application.</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem;">${err.message}</p>
        </div>
      `;
    }
    setLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

function setupListeners() {
  // Season dropdown
  els.seasonSelect.addEventListener('change', async () => {
    const newSeason = Number(els.seasonSelect.value);
    if (newSeason !== state.season) {
      state.season = newSeason;
      setSelectedSeason(newSeason);
      state.week = null; // reset so loadSeason picks up current week
      await loadSeason();
    }
  });

  // Week prev / next buttons
  els.weekPrev.addEventListener('click', async () => {
    if (state.week > 1) {
      state.week -= 1;
      await loadWeek();
    }
  });

  els.weekNext.addEventListener('click', async () => {
    if (state.week < state.maxWeek) {
      state.week += 1;
      await loadWeek();
    }
  });

  // View toggles — event delegation
  if (els.viewToggles) {
    els.viewToggles.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-view]');
      if (!btn) return;

      // Update active state
      els.viewToggles.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Toggle body classes
      const view = btn.dataset.view;
      document.body.classList.remove('mobile-minimal', 'mobile-compact');
      if (view === 'minimal') {
        document.body.classList.add('mobile-minimal');
      } else if (view === 'compact') {
        document.body.classList.add('mobile-compact');
      }
      // 'full' — no extra class needed
    });
  }

  // Export button
  if (els.exportBtn) {
    els.exportBtn.addEventListener('click', () => {
      if (state.data && !state.loading) {
        exportToPNG(els.tableContainer, state.season, state.week);
      }
    });
  }

  // Cross-tab season sync
  window.addEventListener('seasonChanged', async (e) => {
    const newSeason = Number(e.detail.season);
    if (newSeason !== state.season && state.seasons.includes(newSeason)) {
      state.season = newSeason;
      els.seasonSelect.value = newSeason;
      state.week = null;
      await loadSeason();
    }
  });
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

/**
 * Load a season from scratch: detect current week, then render.
 */
async function loadSeason() {
  setLoading(true);

  // Try to fetch the current live week; fall back to 17 for historical seasons
  try {
    const weekNum = await fetchCurrentWeek(state.season);
    if (state.week === null) {
      state.week = (typeof weekNum === 'number' && weekNum > 0) ? weekNum : 17;
    }
  } catch (e) {
    if (state.week === null) {
      state.week = 17;
    }
  }

  state.maxWeek = 17;
  await loadWeek();
}

/**
 * Fetch and render data for the current state.season / state.week.
 */
async function loadWeek() {
  setLoading(true);

  try {
    const data = await fetchSeasonData(state.season, state.week);
    state.data = data;

    updateWeekLabel();
    updateEliminationCard();
    renderTable(state.data, els.tableContainer);
  } catch (err) {
    console.error('[app.js] loadWeek() failed:', err);
    els.tableContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--color-text-muted);">
        <p>Failed to load data for Season ${state.season}, Week ${state.week}.</p>
        <p style="font-size: 0.875rem; margin-top: 0.5rem;">${err.message}</p>
      </div>
    `;
  } finally {
    setLoading(false);
  }
}

// ---------------------------------------------------------------------------
// UI updates
// ---------------------------------------------------------------------------

/**
 * Update "Week X of 17" label and enable/disable prev/next buttons.
 */
function updateWeekLabel() {
  if (els.weekLabel) {
    els.weekLabel.textContent = `Week ${state.week} of ${state.maxWeek}`;
  }
  if (els.weekPrev) {
    els.weekPrev.disabled = state.week <= 1;
  }
  if (els.weekNext) {
    els.weekNext.disabled = state.week >= state.maxWeek;
  }
}

/**
 * Build and display the elimination card based on current state.data.
 */
function updateEliminationCard() {
  const card = els.eliminationCard;
  if (!card) return;

  const data = state.data;

  // No data or no managers — hide card
  if (!data || !data.managers || data.managers.length === 0) {
    card.style.display = 'none';
    return;
  }

  const { current_week, champion, managers, season } = data;

  // Pre-season states — show season info
  if (current_week === 0 || data.status === 'pre_draft' || data.status === 'drafting') {
    card.style.display = '';
    card.classList.remove('champion-card');
    els.elimLabel.innerHTML = `Season ${season}`;
    els.elimHeadline.textContent = 'Season not yet started';
    els.elimContext.textContent = `${managers.length} managers registered`;
    els.elimStats.innerHTML = '';
    return;
  }

  // Completed season with a champion — champion spotlight
  if (champion) {
    card.style.display = '';
    card.classList.add('champion-card');
    els.elimLabel.innerHTML = `${trophyIcon(14)} CHAMPION`;
    els.elimHeadline.textContent = champion;
    els.elimContext.textContent = `Season ${season} Champion`;
    els.elimStats.innerHTML = '';
    return;
  }

  card.classList.remove('champion-card');

  // Find the manager chopped this week (eliminated == state.week)
  const chopped = managers.find(m => m.eliminated_week === state.week);

  if (!chopped) {
    // No chop this week — hide card
    card.style.display = 'none';
    return;
  }

  // Compute context: how many managers were close calls (within some margin)?
  const CLOSE_MARGIN = 5;
  const alive = managers.filter(m => !m.eliminated_week || m.eliminated_week > state.week);
  const choppedScore = chopped.score ?? chopped.points ?? 0;

  // Managers who scored within CLOSE_MARGIN points above the chopped manager
  const closeCalls = alive.filter(m => {
    const s = m.score ?? m.points ?? 0;
    return s > choppedScore && s - choppedScore <= CLOSE_MARGIN;
  });

  // Second-lowest alive score for chop differential
  const aliveScores = alive
    .map(m => m.score ?? m.points ?? 0)
    .sort((a, b) => a - b);
  const secondLowest = aliveScores.length > 0 ? aliveScores[0] : null;
  const chopDiff = secondLowest !== null ? (secondLowest - choppedScore).toFixed(1) : null;

  // Median score of all managers this week
  const allScores = managers.map(m => m.score ?? m.points ?? 0).sort((a, b) => a - b);
  const mid = Math.floor(allScores.length / 2);
  const median = allScores.length % 2 === 0
    ? ((allScores[mid - 1] + allScores[mid]) / 2).toFixed(1)
    : allScores[mid].toFixed(1);
  const highScore = Math.max(...allScores).toFixed(1);

  // Build card
  card.style.display = '';
  els.elimLabel.innerHTML = `${skullIcon(14)} WEEK ${state.week} — THE BLADE FALLS`;
  els.elimHeadline.textContent = `${chopped.name} eliminated at ${choppedScore.toFixed ? choppedScore.toFixed(1) : choppedScore}`;

  if (closeCalls.length > 0) {
    els.elimContext.textContent = `${closeCalls.length} manager${closeCalls.length > 1 ? 's' : ''} within ${CLOSE_MARGIN} pts of the chop`;
  } else if (chopDiff !== null) {
    els.elimContext.textContent = `Survived by ${chopDiff} pts`;
  } else {
    els.elimContext.textContent = '';
  }

  // Stat pills
  const aliveCount = managers.filter(m => !m.eliminated_week || m.eliminated_week > state.week).length;
  els.elimStats.innerHTML = `
    <span class="stat-pill stat-pill--red">Chop ${choppedScore.toFixed ? choppedScore.toFixed(1) : choppedScore}</span>
    <span class="stat-pill">Median ${median}</span>
    <span class="stat-pill stat-pill--green">High ${highScore}</span>
    <span class="stat-pill stat-pill--green">${aliveCount} Alive</span>
  `;
}

/**
 * Toggle loading overlay and dim the table section.
 * @param {boolean} loading
 */
function setLoading(loading) {
  state.loading = loading;
  if (els.loading) {
    els.loading.style.display = loading ? '' : 'none';
  }
  if (els.tableSection) {
    els.tableSection.style.opacity = loading ? '0.4' : '';
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
