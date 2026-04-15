# The Guillotine — Visual Redesign Spec

## Overview

Incremental reskin of the Guillotine fantasy football league website. The site currently works but has a "generic AI frontend" aesthetic. This redesign gives it a premium, data-forward identity with mobile-first design, thematic personality, and a rebuilt standings table.

**Approach:** Incremental reskin (Approach A) — rework CSS, rebuild the table component, keep the current HTML page structure, API layer, and working JS modules (api.js, season-state.js, color-utils.js) intact.

**Tech stack:** Remains vanilla HTML/CSS/JS. No framework. No build step. Deployed on Vercel as static files + Python FastAPI serverless backend.

---

## Design System

### Typography
- **Headings:** Oswald 600/700, uppercase, letter-spacing 1-2px. Page titles, section headers, elimination callouts.
- **Body/UI:** Inter 400/500/600. Table data, labels, descriptions, nav items.
- **Stat numbers:** Inter 700 at larger sizes for stat cards and key metrics.
- **Loaded via Google Fonts.** Two font families total.

### Color Palette (refined from current)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#08080c` | Page background |
| `--surface` | `rgba(255,255,255,0.03)` | Card backgrounds |
| `--surface-border` | `rgba(255,255,255,0.06)` | Card borders |
| `--accent` | `#dc2626` | Guillotine red — chop indicators, brand, eliminations |
| `--success` | `#22c55e` | High scores, safe indicators |
| `--gold` | `#fbbf24` | Champions |
| `--silver` | `#a8a8a8` | 2nd place |
| `--bronze` | `#cd7f32` | 3rd place |
| `--text-primary` | `#f5f5f5` | Primary text |
| `--text-secondary` | `#888` | Secondary text |
| `--text-tertiary` | `#666` | Labels, muted text |

### Score Heatmap
Red-to-white-to-green gradient, median-centered. Keep current `color-utils.js` logic.

### Spacing Scale
8px base: 8, 12, 16, 24, 32, 48. Mobile horizontal padding: 16px. Card internal padding: 12-16px mobile, 20-24px desktop.

### Thematic Elements
- **Skull icon:** Small inline SVG next to eliminated manager names. Consistent styled icon, not emoji.
- **Guillotine blade graphic:** Subtle angular SVG in the elimination summary card, descending from top-right corner.
- **Blood-drip dividers:** Thin SVG section separators — red gradient line with 2-3 small drip shapes. Max 2-3 per page.
- **Trophy icon:** Gold inline SVG for champions — in banners, average finishes, manager profiles.
- **Chopped row styling:** Dimmed row, subtle red left border, struck-through name, skull icon. Elimination cell gets a more prominent red background.

### Animations (Sparse)
- No entrance animations on table rows.
- No counting/ticking number animations.
- No parallax or confetti.
- Hover transitions on buttons/cards: subtle brightness/border changes (existing behavior, kept).
- Only purposeful motion: e.g., a brief blade-drop on the elimination card when data loads.

---

## Home Page (Standings)

### Mobile Layout (top to bottom, primary design target)

1. **Sticky nav bar (~44px)**
   - "THE GUILLOTINE" in Oswald, red, left-aligned
   - Hamburger icon right side
   - Season selector pill inline (compact dropdown)

2. **Elimination summary card**
   - Red accent left border (3px solid `--accent`)
   - "WEEK 8 — THE BLADE FALLS" in Oswald small caps
   - "DanTheMan eliminated at 87.3" as headline
   - One-line context: "3.1 pts below safety" or "Survived 6 close calls before the drop"
   - **Variant states:**
     - Season complete → Champion spotlight card (gold accent, trophy, champion name)
     - Pre-season → Status card ("Draft begins Aug 28" or "18 managers registered")
   - Guillotine blade SVG graphic in top-right corner
   - Survivor stats (teams remaining, avg FAAB, etc.) folded into this card as small secondary stat pills

3. **Week navigation + controls**
   - Horizontal week nav: left/right arrows with "Week 8 of 17" label, or scrollable week pills
   - View toggle buttons: Full / Minimal / Heatmap
   - Export button (PNG)
   - Compact single row, touch-friendly

4. **Standings table** (see Table section below)

5. **Info cards**
   - Prize Pool (1st $700, 2nd $150, 3rd $50)
   - League Rules (waiver day, bench expansion, final chop, link to full rules)
   - Chop Rules (player availability after elimination)
   - Restyled with new design system. Same content as current.
   - Positioned **below the table** so mobile users see data first.

6. **Footer**
   - Links to all pages
   - "Data powered by Sleeper" credit

### Desktop Adaptation
- Same vertical flow, wider table with more week columns visible
- Nav becomes horizontal bar with page links visible (no hamburger)
- Info cards in a 3-column row below the table
- Elimination card may sit alongside week stats in a 2-column layout above the table

---

## Standings Table Rebuild

### What Gets Rebuilt
- **`table-renderer.js`** — fresh DOM generation from scratch. Fixes the persistent gray square rendering bug. Cleaner event handling.
- **`table.css`** — rewritten mobile-first using the new design system.

### What Gets Kept
- **`color-utils.js`** — heatmap gradient logic works correctly.
- **`season-state.js`** — cross-tab sync via localStorage + CustomEvent works correctly.
- **`api.js`** — data fetching layer works correctly.

### Mobile Views

**Minimal (default on mobile):**
- Sticky left column: rank number + manager name (skull icon if eliminated)
- 3-4 most recent week score columns visible
- Horizontally scrollable for older weeks
- Score cells use heatmap coloring
- Eliminated managers: row dimmed, name struck through, skull inline
- Bottom summary row: chop line (red), median, high score

**Heatmap:**
- Manager name + colored blocks only (no numbers)
- Bird's-eye pattern view of whole season in compact space
- Tapping a cell shows score in a small tooltip/popover

**Full:**
- All columns visible, horizontal scroll for everything
- Matches desktop column set

### Desktop Table
Full width with all columns:
- Rank, Manager, Draft Position, all Week columns, Avg Pos Above Chop, Close Calls, FAAB Remaining, $ Wasted, Chop Week
- Same heatmap coloring
- Eliminated managers dimmed with skull icons

### Summary Rows
Bottom of table: High Score, 75th %ile, Median, 25th %ile, Chop Score, Chop Diff. Same data as current, restyled.

### Data Viz in the Table
- **Close call indicator:** Small blade/warning icon overlaid on score cells where manager was within 5 pts of chop line. Visible on hover (desktop) or tap (mobile).
- **Chop differential visualization:** In summary rows, show gap between chop score and next-lowest with color intensity (tight = bright red, blowout = dimmer).

### PNG Export
- Keep html2canvas approach
- Export uses new styling
- On mobile, export captures full table (not just visible viewport)

---

## Navigation & Page Shell

### Mobile Nav
- Sticky top bar (~44px): logo left, hamburger right
- Hamburger opens full-screen dark overlay with page links — large touch targets, Oswald uppercase
- Season selector inline in top bar (not inside hamburger)
- Current page highlighted in menu

### Desktop Nav
- Horizontal bar: logo left, page links center/right
- Season tabs/pills below nav bar
- No hamburger

### Shared Page Shell
- Consistent nav + footer on every page
- Same dark background, card styling, typography across all pages
- Blood-drip SVG divider used sparingly between major sections

---

## Manager Profiles

Manager profiles need development and proper linking:

- **Linking:** Clicking a manager name in the standings table navigates to `/manager/<name>`
- **Content:** Career stats as dashboard stat cards, per-season finish positions, score sparklines (SVG line charts showing weekly score trajectory per season)
- **Styling:** Same design system — dark cards, Oswald headings, stat metrics in Inter 700
- **Sparklines:** Simple inline SVG, no charting library needed. One sparkline per season showing the score curve.

---

## Other Pages (Design System Pass)

Each page gets the new typography, colors, spacing, and nav. No structural overhaul.

| Page | Specific Changes |
|------|-----------------|
| **Rules** | Restyle with new typography/cards. Blood-drip dividers between sections. |
| **Average Finishes** | Restyle table to match new table design. Trophy/skull icons for best/worst finishes. Manager names link to profiles. |
| **Draft Order** | Restyle with new design system. No structural changes. |
| **Transactions** | Restyle table and cards. No structural changes. |
| **Death Bell** | Restyle with thematic elements (skull icons, blade graphics fit naturally). No structural changes. |
| **Season Recap** | Restyle superlative cards. No structural changes. |
| **404** | Restyle to match. Low priority. |

---

## Season Lifecycle (Existing, Unchanged)

The current architecture supports perpetual season-by-season operation. This redesign does not change this flow:

1. **New season setup:** Add the new Sleeper league ID to `LEAGUE_IDS` in `config.py` (one line: `2027: "league_id"`). The site automatically pulls live data from Sleeper during the season.
2. **During the season:** Data fetched from Sleeper API with 5-minute caching. The site updates each week with new scores, eliminations, and transactions.
3. **End of season:** Export final data to `frontend/data/YYYY.json` and add the year to `HISTORICAL_SEASONS`. The site then loads from the static file (faster, immutable, no Sleeper dependency).
4. **Repeat.** All historical seasons remain accessible via the season selector.

---

## Out of Scope

- Backend/API changes — the FastAPI layer and Sleeper integration are untouched
- New pages or features — page set stays the same, refinements happen after a season of usage
- Framework migration — staying vanilla HTML/CSS/JS
- Data model changes — same JSON structure, same endpoints
- Sleeper API integration changes — 2023/2024 remain hardcoded JSON, 2025+ from Sleeper
