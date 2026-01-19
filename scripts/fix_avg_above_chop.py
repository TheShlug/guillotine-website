"""
Fix avg_above_chop calculation in JSON data files.
Changes from points-based to rank-based (positions above chopped team).
"""

import json
import statistics
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "frontend" / "data"


def calculate_rank_based_avg_above_chop(managers):
    """
    Calculate avg_above_chop as average rank positions above the chopped team.

    For each week a manager was alive:
    - Rank all alive teams by score (1 = highest)
    - positions_above_chop = num_teams_alive - rank
    - E.g., rank 1 of 18 = 17 positions above chop
    - E.g., rank 18 of 18 = 0 positions above chop (you got chopped)
    """
    for manager in managers:
        chop_week = manager.get("chop_week")
        end_week = chop_week if chop_week else 17

        positions_above = []
        for wk in range(1, end_week + 1):
            # Get all scores for teams alive in this week
            week_scores = []
            for m in managers:
                m_chop = m.get("chop_week")
                # Team is alive if they haven't been chopped yet or get chopped this week
                if m_chop is None or m_chop >= wk:
                    score = m["weekly_scores"].get(str(wk))
                    if score is not None:
                        week_scores.append((m["user_name"], score))

            if not week_scores:
                continue

            # Sort by score descending (rank 1 = highest)
            week_scores.sort(key=lambda x: x[1], reverse=True)
            n = len(week_scores)

            # Find this manager's rank
            rank = None
            for i, (name, score) in enumerate(week_scores):
                if name == manager["user_name"]:
                    rank = i + 1  # 1-indexed
                    break

            if rank is not None:
                # Positions above chop = teams_alive - rank
                positions_above.append(n - rank)

        manager["avg_above_chop"] = round(statistics.mean(positions_above), 1) if positions_above else 0

    return managers


def process_file(filepath):
    """Process a single JSON data file."""
    print(f"Processing {filepath.name}...")

    with open(filepath, 'r') as f:
        data = json.load(f)

    if "managers" not in data:
        print(f"  Skipping - no managers data")
        return

    # Show before values
    print(f"  Before (sample):")
    for m in data["managers"][:3]:
        print(f"    {m['user_name']}: {m.get('avg_above_chop', 'N/A')}")

    # Recalculate
    data["managers"] = calculate_rank_based_avg_above_chop(data["managers"])

    # Show after values
    print(f"  After (sample):")
    for m in data["managers"][:3]:
        print(f"    {m['user_name']}: {m.get('avg_above_chop', 'N/A')}")

    # Save
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"  Saved!")


def main():
    print("Fixing avg_above_chop calculation in JSON files...\n")

    for filepath in sorted(DATA_DIR.glob("*.json")):
        if filepath.name not in ["average_finishes.json"]:
            process_file(filepath)
            print()

    print("Done!")


if __name__ == "__main__":
    main()
