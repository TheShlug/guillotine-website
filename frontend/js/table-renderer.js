/**
 * Table renderer for Guillotine League.
 * Generates the DOM table with proper styling and color gradients.
 */

import { getScoreColor, getContrastTextColor, calculateWeekStats } from './color-utils.js';

/**
 * Render the complete Guillotine table
 * @param {Object} data - Season data from API
 * @param {HTMLElement} container - Container element to render into
 */
export function renderTable(data, container) {
  const { season, managers, weekly_stats, current_week, champion, status } = data;

  // Handle pre-season state
  if (current_week === 0 || status === 'pre_draft' || status === 'drafting') {
    container.innerHTML = '';

    const preSeason = document.createElement('div');
    preSeason.className = 'pre-season-message';
    preSeason.innerHTML = `
      <div class="season-info">
        <span class="season-info-left">Season ${season}</span>
        <span class="season-info-right">${status === 'drafting' ? 'Draft in Progress' : 'Pre-Draft'}</span>
      </div>
      <div class="pre-season-content">
        <div class="pre-season-icon">&#x1FA93;</div>
        <h2>Season ${season} Has Not Started Yet</h2>
        <p>${status === 'drafting' ? 'The draft is currently in progress.' : 'The draft has not occurred yet.'}</p>
        <p class="manager-count">${managers.length} managers registered</p>
        <div class="manager-list">
          ${managers.map(m => `<span class="manager-chip">${m.user_name}</span>`).join('')}
        </div>
      </div>
    `;
    container.appendChild(preSeason);
    return;
  }

  // Determine display week (use current_week for live seasons, 17 for historical)
  const displayWeek = current_week || 17;

  // Check if this is a completed season (has finish positions)
  const isCompletedSeason = managers.some(m => m.finish_position !== undefined && m.finish_position !== null);

  // Pre-calculate week stats for color gradients
  const weekStatsCache = {};
  for (let w = 1; w <= displayWeek; w++) {
    weekStatsCache[w] = calculateWeekStats(managers, w);
  }

  // Pre-calculate rankings for each week (for rank display in cells)
  const weekRankings = {};
  for (let w = 1; w <= displayWeek; w++) {
    const weekStr = String(w);
    // Get all alive managers' scores for this week
    const weekScores = managers
      .filter(m => {
        const isAlive = !m.chop_week || m.chop_week >= w;
        const score = m.weekly_scores[weekStr];
        return isAlive && score !== null && score !== undefined;
      })
      .map(m => ({ userName: m.user_name, score: m.weekly_scores[weekStr] }))
      .sort((a, b) => b.score - a.score);  // Sort descending (rank 1 = highest)

    // Assign ranks
    weekRankings[w] = {};
    weekScores.forEach((item, index) => {
      weekRankings[w][item.userName] = index + 1;
    });
  }

  // Create table
  const table = document.createElement('table');
  table.className = 'guillotine-table';

  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // Fixed columns - include FAAB wasted and close calls if available
  const hasFaabWasted = managers.some(m => m.faab_wasted !== undefined);
  const hasCloseCalls = managers.some(m => m.close_calls !== undefined);

  const fixedHeaders = [
    { label: 'Draft<br>Pos', className: 'col-draft' },
    { label: 'Avg Pos<br>> Chop', className: 'col-avg', title: 'Average weekly rank positions above the chopped team' },
    { label: '$ Left', className: 'col-faab' }
  ];

  if (hasFaabWasted) {
    fixedHeaders.push({ label: '$ Wasted', className: 'col-faab-wasted' });
  }

  if (hasCloseCalls) {
    fixedHeaders.push({ label: 'Close<br>Calls', className: 'col-close-calls', title: 'Weeks finished 2nd to last OR within 5 points of elimination' });
  }

  fixedHeaders.push(
    { label: 'Chop<br>Week', className: 'col-chop' },
    { label: 'Manager', className: 'col-manager' }
  );

  fixedHeaders.forEach(h => {
    const th = document.createElement('th');
    th.className = h.className;
    th.innerHTML = h.label;
    if (h.title) {
      th.title = h.title;
    }
    headerRow.appendChild(th);
  });

  // Week columns
  for (let w = 1; w <= 17; w++) {
    const th = document.createElement('th');
    th.className = 'col-week';
    th.textContent = `W${w}`;

    // Add divider class after weeks 4 and 8
    if (w === 4 || w === 8) {
      th.classList.add('week-divider');
    }

    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');

  // Find the most recently chopped team (highest chop_week <= current)
  const recentlyChopped = managers
    .filter(m => m.chop_week && m.chop_week <= displayWeek)
    .sort((a, b) => b.chop_week - a.chop_week)[0];

  // Render manager rows
  managers.forEach(manager => {
    const row = document.createElement('tr');
    if (manager.chop_week) {
      row.classList.add('eliminated');
    }

    // Check if this is the most recently chopped team (for animation)
    const isRecentlyChopped = recentlyChopped &&
      manager.chop_week === recentlyChopped.chop_week &&
      manager.user_name === recentlyChopped.user_name;

    // Draft position
    const draftCell = document.createElement('td');
    draftCell.className = 'col-draft';
    draftCell.textContent = manager.draft_position || '-';
    row.appendChild(draftCell);

    // Avg position above chop
    const avgCell = document.createElement('td');
    avgCell.className = 'col-avg';
    avgCell.textContent = typeof manager.avg_pos_above_chop === 'number'
      ? manager.avg_pos_above_chop.toFixed(1)
      : (typeof manager.avg_above_chop === 'number' ? manager.avg_above_chop.toFixed(1) : '-');
    row.appendChild(avgCell);

    // FAAB remaining
    const faabCell = document.createElement('td');
    faabCell.className = 'col-faab faab-cell';
    faabCell.textContent = `$${manager.faab_remaining}`;
    if (manager.chop_week) {
      faabCell.classList.add('eliminated');
    }
    row.appendChild(faabCell);

    // FAAB wasted (if available)
    if (hasFaabWasted) {
      const faabWastedCell = document.createElement('td');
      faabWastedCell.className = 'col-faab-wasted faab-wasted-cell';
      const wastedAmount = manager.faab_wasted || 0;
      faabWastedCell.textContent = `$${wastedAmount}`;
      if (wastedAmount === 0) {
        faabWastedCell.classList.add('zero');
      }
      row.appendChild(faabWastedCell);
    }

    // Close calls (if available)
    if (hasCloseCalls) {
      const closeCallsCell = document.createElement('td');
      closeCallsCell.className = 'col-close-calls';
      const closeCalls = manager.close_calls || 0;
      closeCallsCell.textContent = closeCalls;
      if (closeCalls >= 3) {
        closeCallsCell.classList.add('danger');
      } else if (closeCalls >= 2) {
        closeCallsCell.classList.add('warning');
      }
      row.appendChild(closeCallsCell);
    }

    // Chop week
    const chopCell = document.createElement('td');
    chopCell.className = 'col-chop';
    chopCell.textContent = manager.chop_week || '-';
    row.appendChild(chopCell);

    // Manager name with link to profile
    const nameCell = document.createElement('td');
    nameCell.className = 'col-manager manager-cell';

    const nameLink = document.createElement('a');
    nameLink.href = `/manager/${encodeURIComponent(manager.user_name)}`;
    nameLink.className = 'manager-link';
    nameLink.textContent = manager.user_name;
    nameCell.appendChild(nameLink);

    // Add badges based on finish position or champion status
    if (isCompletedSeason && manager.finish_position) {
      const badge = document.createElement('span');

      if (manager.finish_position === 1) {
        badge.className = 'badge champion-badge';
        badge.textContent = 'CHAMP';
      } else if (manager.finish_position === 2) {
        badge.className = 'badge rank-badge second';
        badge.textContent = '2ND';
      } else if (manager.finish_position === 3) {
        badge.className = 'badge rank-badge third';
        badge.textContent = '3RD';
      }

      if (badge.className) {
        nameCell.appendChild(badge);
      }
    } else if (!manager.chop_week && champion === manager.user_name) {
      // Fallback for historical data without finish_position
      const badge = document.createElement('span');
      badge.className = 'badge champion-badge';
      badge.textContent = 'CHAMP';
      nameCell.appendChild(badge);
    } else if (!manager.chop_week && !isCompletedSeason) {
      // Survivor for current/live season
      const badge = document.createElement('span');
      badge.className = 'badge survivor-badge';
      badge.textContent = 'ALIVE';
      nameCell.appendChild(badge);
    }

    // Add "CHOPPED" badge for recently eliminated team
    if (isRecentlyChopped && displayWeek < 17) {
      const choppedBadge = document.createElement('span');
      choppedBadge.className = 'badge chopped-badge';
      choppedBadge.innerHTML = '&#x1FA93; CHOP';
      nameCell.appendChild(choppedBadge);
      row.classList.add('recently-chopped');
    }

    row.appendChild(nameCell);

    // Week score cells
    for (let w = 1; w <= 17; w++) {
      const cell = document.createElement('td');
      cell.className = 'col-week score-cell';

      const score = manager.weekly_scores[String(w)];
      const isChopWeek = manager.chop_week === w;
      const isFutureWeek = w > displayWeek;
      const wasEliminated = manager.chop_week && w > manager.chop_week;

      if (isFutureWeek || score === null || score === undefined || wasEliminated) {
        // NA cell
        cell.classList.add('na-cell');
        cell.textContent = '';
      } else if (isChopWeek) {
        // Chop week cell - dark red
        cell.classList.add('chop-cell');
        const rank = weekRankings[w]?.[manager.user_name];
        cell.innerHTML = `<span class="score-value">${score.toFixed(2)}</span>${rank ? `<span class="score-rank">${rank}</span>` : ''}`;
      } else {
        // Normal score cell with gradient
        const stats = weekStatsCache[w];
        const bgColor = getScoreColor(score, stats.min, stats.max, stats.median);
        const textColor = getContrastTextColor(bgColor);

        cell.style.backgroundColor = bgColor;
        cell.style.color = textColor;
        const rank = weekRankings[w]?.[manager.user_name];
        cell.innerHTML = `<span class="score-value">${score.toFixed(2)}</span>${rank ? `<span class="score-rank">${rank}</span>` : ''}`;
      }

      // Add divider class after weeks 4 and 8
      if (w === 4 || w === 8) {
        cell.classList.add('week-divider');
      }

      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  // Calculate stats for remaining teams (not chopped yet or chop_week > displayWeek)
  const remainingManagers = managers.filter(m => !m.chop_week || m.chop_week > displayWeek);

  // Calculate avg, med, min, max for Avg Pos > Chop and FAAB remaining
  const remainingAvgAboveChop = remainingManagers
    .map(m => m.avg_pos_above_chop ?? m.avg_above_chop)
    .filter(v => typeof v === 'number');

  const remainingFaab = remainingManagers
    .map(m => m.faab_remaining)
    .filter(v => typeof v === 'number');

  const calcStats = (arr) => {
    if (arr.length === 0) return { avg: null, med: null, min: null, max: null };
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    const mid = Math.floor(sorted.length / 2);
    const med = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
    return {
      avg: avg,
      med: med,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  };

  const avgAboveChopStats = calcStats(remainingAvgAboveChop);
  const faabStats = calcStats(remainingFaab);

  // Render summary rows (without budget stats - those go above the table now)
  const summaryRows = [
    { key: 'high_score', label: 'High Score', className: 'summary-high', first: true },
    { key: 'percentile_75', label: '75th %ile', className: 'summary-75th' },
    { key: 'median', label: 'Median', className: 'summary-median' },
    { key: 'percentile_25', label: '25th %ile', className: 'summary-25th' },
    { key: 'chop_score', label: 'CHOP Score', className: 'summary-chop' },
    { key: 'chop_differential', label: 'CHOP Diff', className: 'summary-diff' }
  ];

  summaryRows.forEach((sr) => {
    const row = document.createElement('tr');
    row.classList.add('summary-row', sr.className);
    if (sr.first) {
      row.classList.add('summary-row-first');
    }

    // Empty cells for fixed columns — use col classes for sizing but NOT na-cell,
    // so that summary row color rules (td:not(.na-cell)) apply correctly
    const draftCell = document.createElement('td');
    draftCell.classList.add('col-draft');
    row.appendChild(draftCell);

    const avgCell = document.createElement('td');
    avgCell.classList.add('col-avg');
    row.appendChild(avgCell);

    const faabCell = document.createElement('td');
    faabCell.classList.add('col-faab');
    row.appendChild(faabCell);

    if (hasFaabWasted) {
      const faabWastedCell = document.createElement('td');
      faabWastedCell.classList.add('col-faab-wasted');
      row.appendChild(faabWastedCell);
    }

    if (hasCloseCalls) {
      const closeCallsCell = document.createElement('td');
      closeCallsCell.classList.add('col-close-calls');
      row.appendChild(closeCallsCell);
    }

    const chopCell = document.createElement('td');
    chopCell.classList.add('col-chop');
    row.appendChild(chopCell);

    // Summary label
    const labelCell = document.createElement('td');
    labelCell.className = 'col-manager manager-cell';
    labelCell.textContent = sr.label;
    row.appendChild(labelCell);

    // Week values
    for (let w = 1; w <= 17; w++) {
      const cell = document.createElement('td');
      const isFutureWeek = w > displayWeek;

      if (isFutureWeek || !weekly_stats[String(w)]) {
        cell.classList.add('na-cell');
        cell.textContent = '';
      } else {
        const value = weekly_stats[String(w)][sr.key];
        cell.textContent = value !== null && value !== undefined
          ? value.toFixed(2)
          : '-';
      }

      // Add divider class after weeks 4 and 8
      if (w === 4 || w === 8) {
        cell.classList.add('week-divider');
      }

      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  // Clear container and add table
  container.innerHTML = '';

  // Note: Season info is now shown in the table-header-bar element (outside this container)
  // so we don't need to add a separate banner here

  // Add survivor budget stats above table (only for in-progress seasons with remaining managers)
  if (!isCompletedSeason && remainingManagers.length > 0 && faabStats.avg !== null) {
    const budgetStats = document.createElement('div');
    budgetStats.className = 'budget-stats';
    budgetStats.innerHTML = `
      <span class="budget-stats-label">Survivor Stats (${remainingManagers.length} remaining):</span>
      <span class="budget-stat">
        <span class="stat-label">FAAB</span>
        <span class="stat-values">
          avg $${Math.round(faabStats.avg)} &bull;
          med $${Math.round(faabStats.med)} &bull;
          min $${Math.round(faabStats.min)} &bull;
          max $${Math.round(faabStats.max)}
        </span>
      </span>
      <span class="budget-stat">
        <span class="stat-label">Avg Pos > Chop</span>
        <span class="stat-values">
          avg ${avgAboveChopStats.avg?.toFixed(1) || '-'} &bull;
          med ${avgAboveChopStats.med?.toFixed(1) || '-'} &bull;
          min ${avgAboveChopStats.min?.toFixed(1) || '-'} &bull;
          max ${avgAboveChopStats.max?.toFixed(1) || '-'}
        </span>
      </span>
    `;
    container.appendChild(budgetStats);
  }

  container.appendChild(table);
}

/**
 * Export table to PNG using html2canvas
 * @param {HTMLElement} container - Table container element
 * @param {number} season - Season year
 * @param {number} week - Current week
 */
export async function exportToPNG(container, season, week) {
  // Add export mode class for better styling
  container.classList.add('export-mode');

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#1a1a24',
      logging: false,
      useCORS: true
    });

    const link = document.createElement('a');
    link.download = `guillotine_${season}_week${week}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    container.classList.remove('export-mode');
  }
}
