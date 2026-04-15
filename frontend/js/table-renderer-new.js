/**
 * table-renderer-new.js
 * Clean reimplementation of the Guillotine standings table renderer.
 * Replaces table-renderer.js — fixes gray square rendering bug, adds
 * SVG icons and per-cell close call indicators.
 */

import { getScoreColor, getContrastTextColor, calculateWeekStats } from './color-utils.js';
import { skullIcon, trophyIcon, closeCallIcon } from './svg-icons.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Create a <td> that holds nothing visible (future / N/A slot). */
function naCell(extraClass) {
  const td = document.createElement('td');
  td.className = extraClass ? `na-cell ${extraClass}` : 'na-cell';
  return td;
}

/** Create a <th> with optional innerHTML label, className, and title. */
function th(label, className, title) {
  const el = document.createElement('th');
  el.className = className || '';
  el.innerHTML = label;
  if (title) el.title = title;
  return el;
}

// ─── pre-season card ──────────────────────────────────────────────────────────

function renderPreSeason(data, container) {
  const { season, managers, status } = data;
  const statusLabel = status === 'drafting' ? 'Draft in Progress' : 'Pre-Draft';

  const card = document.createElement('div');
  card.className = 'pre-season-message';
  card.innerHTML = `
    <div class="season-info">
      <span class="season-info-left">Season ${season}</span>
      <span class="season-info-right">${statusLabel}</span>
    </div>
    <div class="pre-season-content">
      <div class="pre-season-icon">&#x1FA93;</div>
      <h2>Season ${season} Has Not Started Yet</h2>
      <p>${status === 'drafting' ? 'The draft is currently in progress.' : 'The draft has not occurred yet.'}</p>
      <p class="manager-count">${managers.length} manager${managers.length !== 1 ? 's' : ''} registered</p>
      <div class="manager-list">
        ${managers.map(m => `<span class="manager-chip">${m.user_name}</span>`).join('')}
      </div>
    </div>
  `;

  container.innerHTML = '';
  container.appendChild(card);
}

// ─── pre-compute rankings ─────────────────────────────────────────────────────

/**
 * For each week 1–displayWeek, build a map { userName -> rank } where rank 1
 * is the highest score among managers still alive that week.
 */
function buildWeekRankings(managers, displayWeek) {
  const rankings = {};

  for (let w = 1; w <= displayWeek; w++) {
    const weekStr = String(w);
    const alive = managers
      .filter(m => {
        const score = m.weekly_scores[weekStr];
        const notEliminated = !m.chop_week || m.chop_week >= w;
        return notEliminated && score !== null && score !== undefined;
      })
      .map(m => ({ name: m.user_name, score: m.weekly_scores[weekStr] }))
      .sort((a, b) => b.score - a.score);

    rankings[w] = {};
    alive.forEach((item, i) => {
      rankings[w][item.name] = i + 1;
    });
  }

  return rankings;
}

// ─── manager row ──────────────────────────────────────────────────────────────

function buildManagerRow(manager, opts) {
  const {
    displayWeek,
    isCompletedSeason,
    champion,
    hasFaabWasted,
    hasCloseCalls,
    recentlyChopped,
    weekStatsCache,
    weekRankings,
    weekly_stats,
  } = opts;

  const row = document.createElement('tr');
  const isEliminated = !!manager.chop_week;
  const isRecentlyChopped =
    recentlyChopped &&
    manager.user_name === recentlyChopped.user_name &&
    manager.chop_week === recentlyChopped.chop_week;

  if (isEliminated) row.classList.add('eliminated');
  if (isRecentlyChopped) row.classList.add('recently-chopped');

  // — Draft position —
  const draftTd = document.createElement('td');
  draftTd.className = 'col-draft';
  draftTd.textContent = manager.draft_position != null ? manager.draft_position : '-';
  row.appendChild(draftTd);

  // — Avg pos above chop —
  const avgVal = typeof manager.avg_pos_above_chop === 'number'
    ? manager.avg_pos_above_chop
    : (typeof manager.avg_above_chop === 'number' ? manager.avg_above_chop : null);
  const avgTd = document.createElement('td');
  avgTd.className = 'col-avg';
  avgTd.textContent = avgVal !== null ? avgVal.toFixed(1) : '-';
  row.appendChild(avgTd);

  // — FAAB remaining —
  const faabTd = document.createElement('td');
  faabTd.className = 'col-faab faab-cell';
  if (isEliminated) faabTd.classList.add('eliminated');
  faabTd.textContent = `$${manager.faab_remaining}`;
  row.appendChild(faabTd);

  // — FAAB wasted (optional column) —
  if (hasFaabWasted) {
    const wasted = manager.faab_wasted || 0;
    const wastedTd = document.createElement('td');
    wastedTd.className = 'col-faab-wasted faab-wasted-cell';
    if (wasted === 0) wastedTd.classList.add('zero');
    wastedTd.textContent = `$${wasted}`;
    row.appendChild(wastedTd);
  }

  // — Close calls (optional column) —
  if (hasCloseCalls) {
    const cc = manager.close_calls || 0;
    const ccTd = document.createElement('td');
    ccTd.className = 'col-close-calls';
    if (cc >= 3) ccTd.classList.add('danger');
    else if (cc >= 2) ccTd.classList.add('warning');
    ccTd.textContent = cc;
    row.appendChild(ccTd);
  }

  // — Chop week —
  const chopTd = document.createElement('td');
  chopTd.className = 'col-chop';
  chopTd.textContent = manager.chop_week != null ? manager.chop_week : '-';
  row.appendChild(chopTd);

  // — Manager name cell —
  const nameTd = document.createElement('td');
  nameTd.className = 'col-manager manager-cell';

  // Skull icon for eliminated managers
  if (isEliminated) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'manager-skull';
    iconSpan.innerHTML = skullIcon(14);
    nameTd.appendChild(iconSpan);
  }

  const nameLink = document.createElement('a');
  nameLink.href = `/manager/${encodeURIComponent(manager.user_name)}`;
  nameLink.className = 'manager-link';
  nameLink.textContent = manager.user_name;
  nameTd.appendChild(nameLink);

  // Badge logic
  const badge = document.createElement('span');
  let badgeSet = false;

  if (isCompletedSeason && manager.finish_position) {
    if (manager.finish_position === 1) {
      badge.className = 'badge champion-badge';
      badge.innerHTML = trophyIcon(12) + ' CHAMP';
      badgeSet = true;
    } else if (manager.finish_position === 2) {
      badge.className = 'badge rank-badge second';
      badge.textContent = '2ND';
      badgeSet = true;
    } else if (manager.finish_position === 3) {
      badge.className = 'badge rank-badge third';
      badge.textContent = '3RD';
      badgeSet = true;
    }
  } else if (!isEliminated && champion === manager.user_name) {
    // Historical data fallback — champion field set but no finish_position
    badge.className = 'badge champion-badge';
    badge.innerHTML = trophyIcon(12) + ' CHAMP';
    badgeSet = true;
  } else if (!isEliminated && !isCompletedSeason) {
    badge.className = 'badge survivor-badge';
    badge.textContent = 'ALIVE';
    badgeSet = true;
  }

  if (badgeSet) nameTd.appendChild(badge);

  // "CHOP" badge for most recently eliminated team
  if (isRecentlyChopped && displayWeek < 17) {
    const chopBadge = document.createElement('span');
    chopBadge.className = 'badge chopped-badge';
    chopBadge.textContent = 'CHOP';
    nameTd.appendChild(chopBadge);
  }

  row.appendChild(nameTd);

  // — Week score cells W1–W17 —
  for (let w = 1; w <= 17; w++) {
    const weekStr = String(w);
    const score = manager.weekly_scores[weekStr];
    const isChopWeek = manager.chop_week === w;
    const isFuture = w > displayWeek;
    const isPostElim = isEliminated && w > manager.chop_week;

    const td = document.createElement('td');
    td.className = 'col-week score-cell';
    if (w === 4 || w === 8) td.classList.add('week-divider');

    if (isFuture || isPostElim || score === null || score === undefined) {
      td.classList.add('na-cell');
    } else if (isChopWeek) {
      td.classList.add('chop-cell');
      const rank = weekRankings[w]?.[manager.user_name];
      td.innerHTML =
        `<span class="score-value">${score.toFixed(2)}</span>` +
        (rank ? `<span class="score-rank">${rank}</span>` : '');
    } else {
      // Heatmap coloring
      const stats = weekStatsCache[w];
      const bg = getScoreColor(score, stats.min, stats.max, stats.median);
      const fg = getContrastTextColor(bg);
      td.style.backgroundColor = bg;
      td.style.color = fg;

      const rank = weekRankings[w]?.[manager.user_name];
      td.innerHTML =
        `<span class="score-value">${score.toFixed(2)}</span>` +
        (rank ? `<span class="score-rank">${rank}</span>` : '');

      // Close call indicator — score within 5 pts above chop_score for the week
      const weekStatRow = weekly_stats && weekly_stats[weekStr];
      if (weekStatRow && typeof weekStatRow.chop_score === 'number') {
        const diff = score - weekStatRow.chop_score;
        if (diff >= 0 && diff <= 5) {
          const ccSpan = document.createElement('span');
          ccSpan.className = 'close-call-indicator';
          ccSpan.innerHTML = closeCallIcon(10);
          ccSpan.title = `${diff.toFixed(2)} pts above chop`;
          td.appendChild(ccSpan);
        }
      }
    }

    row.appendChild(td);
  }

  return row;
}

// ─── summary rows ─────────────────────────────────────────────────────────────

const SUMMARY_DEFS = [
  { key: 'high_score',        label: 'HIGH SCORE',  className: 'summary-high'   },
  { key: 'percentile_75',     label: '75TH %ILE',   className: 'summary-75th'   },
  { key: 'median',            label: 'MEDIAN',       className: 'summary-median' },
  { key: 'percentile_25',     label: '25TH %ILE',   className: 'summary-25th'   },
  { key: 'chop_score',        label: 'CHOP SCORE',  className: 'summary-chop'   },
  { key: 'chop_differential', label: 'CHOP DIFF',   className: 'summary-diff'   },
];

function buildSummaryRows(weekly_stats, displayWeek, hasFaabWasted, hasCloseCalls) {
  const rows = [];

  SUMMARY_DEFS.forEach((def, idx) => {
    const row = document.createElement('tr');
    row.classList.add('summary-row', def.className);
    if (idx === 0) row.classList.add('summary-row-first');

    // Fixed placeholder cells (draft, avg, faab, [wasted], [close calls], chop)
    const fixedCount = 3 + (hasFaabWasted ? 1 : 0) + (hasCloseCalls ? 1 : 0) + 1;
    for (let i = 0; i < fixedCount; i++) {
      row.appendChild(naCell());
    }

    // Label cell
    const labelTd = document.createElement('td');
    labelTd.className = 'manager-cell summary-label';
    labelTd.textContent = def.label;
    row.appendChild(labelTd);

    // Week value cells
    for (let w = 1; w <= 17; w++) {
      const isFuture = w > displayWeek;
      const weekData = weekly_stats && weekly_stats[String(w)];
      const td = document.createElement('td');
      if (w === 4 || w === 8) td.classList.add('week-divider');

      if (isFuture || !weekData) {
        td.classList.add('na-cell');
      } else {
        const val = weekData[def.key];
        td.textContent = val !== null && val !== undefined ? val.toFixed(2) : '-';
      }

      row.appendChild(td);
    }

    rows.push(row);
  });

  return rows;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Render the complete standings table into `container`.
 *
 * @param {Object} data       - Season data object from API
 * @param {HTMLElement} container - Element to render into
 */
export function renderTable(data, container) {
  const { season, managers, weekly_stats, current_week, champion, status } = data;

  // Pre-season state → simple card
  if (current_week === 0 || status === 'pre_draft' || status === 'drafting') {
    renderPreSeason(data, container);
    return;
  }

  const displayWeek = current_week || 17;
  const isCompletedSeason = managers.some(
    m => m.finish_position !== undefined && m.finish_position !== null
  );

  const hasFaabWasted = managers.some(m => m.faab_wasted !== undefined);
  const hasCloseCalls = managers.some(m => m.close_calls !== undefined);

  // Pre-compute per-week color stats and rankings once
  const weekStatsCache = {};
  for (let w = 1; w <= displayWeek; w++) {
    weekStatsCache[w] = calculateWeekStats(managers, w);
  }
  const weekRankings = buildWeekRankings(managers, displayWeek);

  // Most recently chopped manager (for CHOP badge)
  const recentlyChopped = managers
    .filter(m => m.chop_week && m.chop_week <= displayWeek)
    .sort((a, b) => b.chop_week - a.chop_week)[0] || null;

  // ── Build table ──────────────────────────────────────────────────────────
  const table = document.createElement('table');
  table.className = 'guillotine-table';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  headerRow.appendChild(th('Draft<br>Pos', 'col-draft'));
  headerRow.appendChild(th('Avg&gt;Chop', 'col-avg', 'Average weekly rank positions above the chopped team'));
  headerRow.appendChild(th('$ Left', 'col-faab'));
  if (hasFaabWasted) headerRow.appendChild(th('$ Waste', 'col-faab-wasted'));
  if (hasCloseCalls) headerRow.appendChild(th('Close', 'col-close-calls', 'Weeks finished 2nd-to-last OR within 5 pts of elimination'));
  headerRow.appendChild(th('Chop<br>Week', 'col-chop'));
  headerRow.appendChild(th('Manager', 'col-manager'));

  for (let w = 1; w <= 17; w++) {
    const weekTh = th(`W${w}`, 'col-week');
    if (w === 4 || w === 8) weekTh.classList.add('week-divider');
    headerRow.appendChild(weekTh);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');

  const rowOpts = {
    displayWeek,
    isCompletedSeason,
    champion,
    hasFaabWasted,
    hasCloseCalls,
    recentlyChopped,
    weekStatsCache,
    weekRankings,
    weekly_stats,
  };

  managers.forEach(manager => {
    tbody.appendChild(buildManagerRow(manager, rowOpts));
  });

  // Summary rows
  buildSummaryRows(weekly_stats, displayWeek, hasFaabWasted, hasCloseCalls)
    .forEach(r => tbody.appendChild(r));

  table.appendChild(tbody);

  // ── Mount ──────────────────────────────────────────────────────────────
  container.innerHTML = '';
  container.appendChild(table);
}

/**
 * Export the table container as a PNG using html2canvas.
 * Requires html2canvas to be available on window.
 *
 * @param {HTMLElement} container - Table container element
 * @param {number|string} season  - Season identifier
 * @param {number|string} week    - Current week
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
