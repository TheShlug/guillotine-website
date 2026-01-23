"""
Script to add close_calls field to historical JSON data files.
Close calls: finished 2nd to last (1 position above chop) OR within 5 points of chop score
"""

import json
import os
from pathlib import Path

CLOSE_CALL_POINTS_THRESHOLD = 5.0

def calculate_close_calls(data):
    """Calculate close_calls for each manager in the season data."""
    managers = data.get("managers", [])
    weekly_stats = data.get("weekly_stats", {})

    # Build chop_scores dict from weekly_stats
    chop_scores = {}
    for week_str, stats in weekly_stats.items():
        if stats and stats.get("chop_score") is not None:
            chop_scores[int(week_str)] = stats["chop_score"]

    # Calculate close_calls for each manager
    for manager in managers:
        chop_week = manager.get("chop_week")
        end_week = chop_week if chop_week else 17

        close_call_count = 0

        for week in range(1, end_week + 1):
            # Get teams alive in this week
            week_str = str(week)

            # Collect scores for teams alive this week
            week_scores = []
            for m in managers:
                m_chop = m.get("chop_week")
                # Team is alive if not chopped yet or chopped this week
                if m_chop is None or m_chop >= week:
                    score = m.get("weekly_scores", {}).get(week_str)
                    if score is not None:
                        week_scores.append({
                            "user_name": m["user_name"],
                            "score": score
                        })

            if not week_scores:
                continue

            # Sort by score descending (rank 1 = highest)
            week_scores.sort(key=lambda x: x["score"], reverse=True)
            n = len(week_scores)

            # Find this manager's rank and score
            rank = None
            my_score = None
            for i, item in enumerate(week_scores):
                if item["user_name"] == manager["user_name"]:
                    rank = i + 1
                    my_score = item["score"]
                    break

            if rank is None:
                continue

            # Calculate positions above chop
            positions_above = n - rank

            # Get chop score for this week
            chop_score_this_week = chop_scores.get(week, 0)
            points_above_chop = my_score - chop_score_this_week

            # Check if it's a close call
            is_close_call = False
            if positions_above == 1:
                # Finished 2nd to last
                is_close_call = True
            elif positions_above > 0 and points_above_chop <= CLOSE_CALL_POINTS_THRESHOLD:
                # Survived but within threshold points of chop
                is_close_call = True

            if is_close_call:
                close_call_count += 1

        manager["close_calls"] = close_call_count

    return data

def main():
    data_dir = Path(__file__).parent.parent / "frontend" / "data"

    for year in [2023, 2024, 2025]:
        json_file = data_dir / f"{year}.json"

        if not json_file.exists():
            print(f"Skipping {year} - file not found")
            continue

        print(f"Processing {year}...")

        with open(json_file, "r") as f:
            data = json.load(f)

        # Calculate close_calls
        data = calculate_close_calls(data)

        # Write back
        with open(json_file, "w") as f:
            json.dump(data, f, indent=2)

        # Print summary
        close_calls_summary = [(m["user_name"], m.get("close_calls", 0)) for m in data["managers"]]
        close_calls_summary.sort(key=lambda x: x[1], reverse=True)
        print(f"  Top close calls: {close_calls_summary[:5]}")

if __name__ == "__main__":
    main()
