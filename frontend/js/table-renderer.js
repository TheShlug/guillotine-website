/**
 * Table renderer for Guillotine League.
 * Generates the DOM table with proper styling and color gradients.
 * Clean rebuild — all DOM via createElement, no innerHTML for table structure.
 */

import { getScoreColor, getContrastTextColor, calculateWeekStats } from './color-utils.js';

/**
 * Render the complete Guillotine table
 * @param {Object} data - Season data from API
 * @param {HTMLElement} container - Container element to render into
 */
export function renderTable(data, container) {
  const { season, managers, weekly_stats, current_week, champion, status } = data;

  // Clear container completely before any rendering
  container.innerHTML = '';

  // Handle pre-season state
  if (current_week === 0 || status === 'pre_draft' || status === 'drafting') {
    const preSeason = document.createElement('div');
    preSeason.className = 'pre-season-message';

    const seasonInfo = buildSeasonInfoBanner(season, status === 'drafting' ? 'Draft in Progress' : 'Pre-Draft');
    preSeason.appendChild(seasonInfo);

    const content = document.createElement('div');
    content.className = 'pre-season-content';

    const icon = document.createElement('div');
    icon.className = 'pre-season-icon';
    icon.textContent = '\u{1FA93}';
    content.appendChild(icon);

    const heading = document.createElement('h2');
    heading.textContent = `Season ${season} Has Not Started Yet`;
    content.appendChild(heading);

    const desc = document.createElement('p');
    desc.textContent = status === 'drafting' ? 'The draft is currently in progress.' : 'The draft has not occurred yet.';
    content.appendChild(desc);

    const count = document.createElement('p');
    count.className = 'manager-count';
    count.textContent = `${managers.length} managers registered`;
    content.appendChild(count);

    const list = document.createElement('div');
    list.className = 'manager-list';
    managers.forEach(m => {
      const chip = document.createElement('span');
      chip.className = 'manager-chip';
      chip.textContent = m.user_name;
      list.appendChild(chip);
    });
    content.appendChild(list);

    preSeason.appendChild(content);
    container.appendChild(preSeason);
    return;
  }

  // Determine display week
  const displayWeek = current_week || 17;

  // Check if this is a completed season
  const isCompletedSeason = managers.some(m => m.finish_position !== undefined && m.finish_position !== null);

  // Pre-calculate week stats for color gradients
  const weekStatsCache = {};
  for (let w = 1; w <= displayWeek; w++) {
    weekStatsCache[w] = calculateWeekStats(managers, w);
  }

  // Pre-calculate rankings for each week
  const weekRankings = {};
  for (let w = 1; w <= displayWeek; w++) {
    const weekStr = String(w);
    const weekScores = managers
      .filter(m => {
        const isAlive = !m.chop_week || m.chop_week >= w;
        const score = m.weekly_scores[weekStr];
        return isAlive && score !== null && score !== undefined;
      })
      .map(m => ({ userName: m.user_name, score: m.weekly_scores[weekStr] }))
      .sort((a, b) => b.score - a.score);

    weekRankings[w] = {};
    weekScores.forEach((item, index) => {
      weekRankings[w][item.userName] = index + 1;
    });
  }

  // Detect optional columns
  const hasFaabWasted = managers.some(m => m.faab_wasted !== undefined);
  const hasCloseCalls = managers.some(m => m.close_calls !== undefined);

  // Build table
  const table = document.createElement('table');
  table.className = 'guillotine-table';

  // --- THEAD ---
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

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
    if (w === 4 || w === 8) {
      th.classList.add('week-divider');
    }
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // --- TBODY ---
  const tbody = document.createElement('tbody');

  // Find most recently chopped team
  const recentlyChopped = managers
    .filter(m => m.chop_week && m.chop_week <= displayWeek)
    .sort((a, b) => b.chop_week - a.chop_week)[0];

  // Render manager rows
  managers.forEach(manager => {
    const row = document.createElement('tr');
    if (manager.chop_week) {
      row.classList.add('eliminated');
    }

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

    // FAAB wasted
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

    // Close calls
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

    // Manager name with link and badges
    const nameCell = document.createElement('td');
    nameCell.className = 'col-manager manager-cell';

    const nameLink = document.createElement('a');
    nameLink.href = `/manager/${encodeURIComponent(manager.user_name)}`;
    nameLink.className = 'manager-link';
    nameLink.textContent = manager.user_name;
    nameCell.appendChild(nameLink);

    // Badges
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
      const badge = document.createElement('span');
      badge.className = 'badge champion-badge';
      badge.textContent = 'CHAMP';
      nameCell.appendChild(badge);
    } else if (!manager.chop_week && !isCompletedSeason) {
      const badge = document.createElement('span');
      badge.className = 'badge survivor-badge';
      badge.textContent = 'ALIVE';
      nameCell.appendChild(badge);
    }

    // CHOPPED badge for recently eliminated
    if (isRecentlyChopped && displayWeek < 17) {
      const choppedBadge = document.createElement('span');
      choppedBadge.className = 'badge chopped-badge';
      choppedBadge.textContent = '\u{1FA93} CHOP';
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
      } else if (isChopWeek) {
        // Chop week cell
        cell.classList.add('chop-cell');
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'score-value';
        scoreSpan.textContent = score.toFixed(2);
        cell.appendChild(scoreSpan);

        const rank = weekRankings[w]?.[manager.user_name];
        if (rank) {
          const rankSpan = document.createElement('span');
          rankSpan.className = 'score-rank';
          rankSpan.textContent = rank;
          cell.appendChild(rankSpan);
        }
      } else {
        // Normal score cell with gradient
        const stats = weekStatsCache[w];
        const bgColor = getScoreColor(score, stats.min, stats.max, stats.median);
        const textColor = getContrastTextColor(bgColor);

        cell.style.backgroundColor = bgColor;
        cell.style.color = textColor;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'score-value';
        scoreSpan.textContent = score.toFixed(2);
        cell.appendChild(scoreSpan);

        const rank = weekRankings[w]?.[manager.user_name];
        if (rank) {
          const rankSpan = document.createElement('span');
          rankSpan.className = 'score-rank';
          rankSpan.textContent = rank;
          cell.appendChild(rankSpan);
        }

        // Close call indicator: within 5 points above chop score (and not the chopped manager)
        const chopScore = weekly_stats?.[String(w)]?.chop_score;
        if (chopScore != null && score > chopScore && (score - chopScore) <= 5) {
          const indicator = document.createElement('span');
          indicator.className = 'close-call-mark';
          indicator.title = `Close call: ${(score - chopScore).toFixed(1)} pts above chop`;
          indicator.textContent = '\u26A0';
          cell.appendChild(indicator);
        }
      }

      // Week dividers
      if (w === 4 || w === 8) {
        cell.classList.add('week-divider');
      }

      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  // --- Summary rows ---
  const summaryDefs = [
    { key: 'high_score', label: 'High Score', className: 'summary-high', first: true },
    { key: 'percentile_75', label: '75th %ile', className: 'summary-75th' },
    { key: 'median', label: 'Median', className: 'summary-median' },
    { key: 'percentile_25', label: '25th %ile', className: 'summary-25th' },
    { key: 'chop_score', label: 'CHOP Score', className: 'summary-chop' },
    { key: 'chop_differential', label: 'CHOP Diff', className: 'summary-diff' }
  ];

  summaryDefs.forEach(sr => {
    const row = document.createElement('tr');
    row.classList.add('summary-row', sr.className);
    if (sr.first) {
      row.classList.add('summary-row-first');
    }

    // Empty fixed columns — NO na-cell class so they inherit the summary row background color
    const draftEmpty = document.createElement('td');
    draftEmpty.className = 'col-draft';
    row.appendChild(draftEmpty);

    const avgEmpty = document.createElement('td');
    avgEmpty.className = 'col-avg';
    row.appendChild(avgEmpty);

    const faabEmpty = document.createElement('td');
    faabEmpty.className = 'col-faab';
    row.appendChild(faabEmpty);

    if (hasFaabWasted) {
      const cell = document.createElement('td');
      cell.className = 'col-faab-wasted';
      row.appendChild(cell);
    }

    if (hasCloseCalls) {
      const cell = document.createElement('td');
      cell.className = 'col-close-calls';
      row.appendChild(cell);
    }

    const chopEmpty = document.createElement('td');
    chopEmpty.className = 'col-chop';
    row.appendChild(chopEmpty);

    // Summary label
    const labelCell = document.createElement('td');
    labelCell.className = 'col-manager manager-cell';
    labelCell.textContent = sr.label;
    row.appendChild(labelCell);

    // Week values
    for (let w = 1; w <= 17; w++) {
      const cell = document.createElement('td');
      cell.className = 'col-week';
      const isFutureWeek = w > displayWeek;

      if (isFutureWeek || !weekly_stats[String(w)]) {
        cell.classList.add('na-cell');
      } else {
        const value = weekly_stats[String(w)][sr.key];
        cell.textContent = value !== null && value !== undefined
          ? value.toFixed(2)
          : '-';
      }

      if (w === 4 || w === 8) {
        cell.classList.add('week-divider');
      }

      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  // --- Survivor budget stats ---
  const remainingManagers = managers.filter(m => !m.chop_week || m.chop_week > displayWeek);

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
    return { avg, med, min: sorted[0], max: sorted[sorted.length - 1] };
  };

  const avgAboveChopStats = calcStats(remainingAvgAboveChop);
  const faabStats = calcStats(remainingFaab);

  if (remainingManagers.length > 0 && faabStats.avg !== null) {
    const budgetStats = document.createElement('div');
    budgetStats.className = 'budget-stats';

    const label = document.createElement('span');
    label.className = 'budget-stats-label';
    label.textContent = `Survivor Stats (${remainingManagers.length} remaining):`;
    budgetStats.appendChild(label);

    // FAAB stat
    const faabStat = document.createElement('span');
    faabStat.className = 'budget-stat';

    const faabLabel = document.createElement('span');
    faabLabel.className = 'stat-label';
    faabLabel.textContent = 'FAAB';
    faabStat.appendChild(faabLabel);

    const faabValues = document.createElement('span');
    faabValues.className = 'stat-values';
    faabValues.innerHTML = `avg $${Math.round(faabStats.avg)} &bull; med $${Math.round(faabStats.med)} &bull; min $${Math.round(faabStats.min)} &bull; max $${Math.round(faabStats.max)}`;
    faabStat.appendChild(faabValues);
    budgetStats.appendChild(faabStat);

    // Avg Pos > Chop stat
    const avgStat = document.createElement('span');
    avgStat.className = 'budget-stat';

    const avgLabel = document.createElement('span');
    avgLabel.className = 'stat-label';
    avgLabel.textContent = 'Avg Pos > Chop';
    avgStat.appendChild(avgLabel);

    const avgValues = document.createElement('span');
    avgValues.className = 'stat-values';
    avgValues.innerHTML = `avg ${avgAboveChopStats.avg?.toFixed(1) || '-'} &bull; med ${avgAboveChopStats.med?.toFixed(1) || '-'} &bull; min ${avgAboveChopStats.min?.toFixed(1) || '-'} &bull; max ${avgAboveChopStats.max?.toFixed(1) || '-'}`;
    avgStat.appendChild(avgValues);
    budgetStats.appendChild(avgStat);

    container.appendChild(budgetStats);
  }

  container.appendChild(table);
}

/**
 * Build the season info banner element
 */
function buildSeasonInfoBanner(season, rightText) {
  const banner = document.createElement('div');
  banner.className = 'season-info';

  const left = document.createElement('span');
  left.className = 'season-info-left';
  left.textContent = `Season ${season}`;
  banner.appendChild(left);

  const right = document.createElement('span');
  right.className = 'season-info-right';
  right.textContent = rightText;
  banner.appendChild(right);

  return banner;
}

/**
 * Export table to PNG using html2canvas
 * @param {HTMLElement} container - Table container element
 * @param {number} season - Season year
 * @param {number} week - Current week
 */
export async function exportToPNG(container, season, week) {
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
