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

  if (!data || !data.managers || data.managers.length === 0) {
    card.style.display = 'none';
    return;
  }

  const { champion, managers, weekly_stats } = data;
  const season = data.season;

  // Pre-season
  if (data.current_week === 0 || data.status === 'pre_draft' || data.status === 'drafting') {
    card.style.display = '';
    card.classList.remove('champion-card');
    els.elimLabel.innerHTML = `Season ${season}`;
    els.elimHeadline.textContent = 'Season not yet started';
    els.elimContext.textContent = `${managers.length} managers registered`;
    els.elimStats.innerHTML = '';
    return;
  }

  // Try to find who was chopped in the currently viewed week
  const chopped = managers.find(m => m.chop_week === state.week);

  if (chopped) {
    // Show elimination card for this week
    card.style.display = '';
    card.classList.remove('champion-card');

    const score = chopped.weekly_scores?.[String(state.week)];
    const weekStat = weekly_stats?.[String(state.week)];
    const remaining = managers.filter(m => !m.chop_week || m.chop_week > state.week).length;

    els.elimLabel.innerHTML = `${skullIcon(14)} WEEK ${state.week} — THE BLADE FALLS`;
    els.elimHeadline.textContent = `${chopped.user_name} eliminated at ${score != null ? score.toFixed(1) : '??'}`;

    // Context line
    const closeCalls = chopped.close_calls || 0;
    const chopDiff = weekStat?.chop_differential;
    if (chopDiff != null) {
      els.elimContext.textContent = `${chopDiff.toFixed(1)} pts below safety`;
    } else if (closeCalls > 0) {
      els.elimContext.textContent = `Survived ${closeCalls} close call${closeCalls > 1 ? 's' : ''} before the drop`;
    } else {
      els.elimContext.textContent = '';
    }

    // Stat pills
    els.elimStats.innerHTML = `
      <div class="elim-stat"><span class="label">Chop</span><span class="stat-value" style="color:var(--accent);font-size:var(--text-lg);">${weekStat?.chop_score?.toFixed(1) || '-'}</span></div>
      <div class="elim-stat"><span class="label">Median</span><span class="stat-value" style="font-size:var(--text-lg);">${weekStat?.median?.toFixed(1) || '-'}</span></div>
      <div class="elim-stat"><span class="label">High</span><span class="stat-value" style="color:var(--success);font-size:var(--text-lg);">${weekStat?.high_score?.toFixed(1) || '-'}</span></div>
      <div class="elim-stat"><span class="label">Alive</span><span class="stat-value" style="color:var(--success);font-size:var(--text-lg);">${remaining}</span></div>
    `;
    return;
  }

  // No chop this week — show champion card if season is complete, otherwise hide
  if (champion && state.week >= 17) {
    card.style.display = '';
    card.classList.add('champion-card');
    els.elimLabel.innerHTML = `${trophyIcon(14)} CHAMPION`;
    els.elimHeadline.textContent = champion;
    els.elimContext.textContent = `Season ${season} Champion`;
    els.elimStats.innerHTML = '';
    return;
  }

  card.style.display = 'none';
  card.classList.remove('champion-card');
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
