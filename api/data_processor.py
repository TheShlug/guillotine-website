"""
Data processing logic for Guillotine League.
Ports the R script elimination and statistics logic to Python.
"""

import statistics
from typing import Dict, List, Optional, Tuple
from .sleeper_client import SleeperClient
from .config import STARTING_FAAB


async def process_season_data(client: SleeperClient, season: int, current_week: int) -> Dict:
    """
    Process all data for a season from Sleeper API.
    Mirrors the R script logic for elimination tracking.
    """
    # 1. Get users and rosters
    users = await client.get_users(season)
    rosters = await client.get_rosters(season)

    # Build roster_id -> user_name mapping
    user_map = {u["user_id"]: u.get("display_name", u.get("username", f"User_{u['user_id']}"))
                for u in users}

    roster_to_user = {}
    roster_to_owner = {}
    for roster in rosters:
        owner_id = roster.get("owner_id")
        roster_id = roster["roster_id"]
        roster_to_user[roster_id] = user_map.get(owner_id, f"Team {roster_id}")
        roster_to_owner[roster_id] = owner_id

    # 2. Get all weekly scores
    all_scores: Dict[int, Dict[int, float]] = {}  # {week: {roster_id: score}}

    for week in range(1, current_week + 1):
        try:
            matchups = await client.get_matchups(season, week)
            all_scores[week] = {}
            for m in matchups:
                if m.get("points") is not None:
                    all_scores[week][m["roster_id"]] = m["points"]
        except Exception:
            # Week data not available yet
            break

    # 3. Calculate eliminations (lowest score each week gets chopped)
    remaining_teams = set(roster_to_user.keys())
    eliminations: Dict[int, int] = {}  # {roster_id: chop_week}
    chop_scores: Dict[int, float] = {}  # {week: chop_score}

    for week in range(1, current_week + 1):
        if week not in all_scores:
            break

        week_scores = {
            rid: all_scores[week].get(rid, 0)
            for rid in remaining_teams
            if rid in all_scores[week]
        }

        if not week_scores:
            break

        min_score = min(week_scores.values())
        chop_scores[week] = min_score

        # Find chopped team (first one with min score, consistent with R script)
        chopped = min(week_scores.keys(), key=lambda r: (week_scores[r], r))
        eliminations[chopped] = week
        remaining_teams.remove(chopped)

    # 4. Get draft positions
    draft_picks = await client.get_draft_picks(season)
    draft_positions: Dict[int, int] = {}

    for pick in draft_picks:
        if pick.get("round") == 1:
            roster_id = pick.get("roster_id")
            pick_no = pick.get("pick_no")
            if roster_id and pick_no:
                draft_positions[roster_id] = pick_no

    # 5. Calculate FAAB remaining and FAAB wasted
    faab_spent: Dict[int, int] = {rid: 0 for rid in roster_to_user.keys()}
    faab_wasted: Dict[int, int] = {rid: 0 for rid in roster_to_user.keys()}

    for week in range(1, current_week + 1):
        try:
            transactions = await client.get_transactions(season, week)

            # Group transactions by player to find winning bid and calculate waste
            # A waiver transaction has the player_id and all bids
            for txn in transactions:
                # Only count completed waiver transactions
                if txn.get("type") == "waiver" and txn.get("status") == "complete":
                    roster_ids = txn.get("roster_ids", [])
                    settings = txn.get("settings", {})
                    bid = settings.get("waiver_bid", 0)

                    if roster_ids and bid:
                        roster_id = roster_ids[0]
                        faab_spent[roster_id] = faab_spent.get(roster_id, 0) + bid

                        # For FAAB wasted, we need to find the second-highest bid
                        # This requires looking at failed waiver claims for same player
                        # Sleeper doesn't directly provide this, so we'll estimate
                        # by looking at waiver_failed transactions in same week
        except Exception:
            continue

    # Calculate FAAB wasted from failed waivers (estimate based on winning bid vs $1)
    # More accurate calculation would require correlating players across transactions
    for week in range(1, current_week + 1):
        try:
            transactions = await client.get_transactions(season, week)

            # Find all waiver claims grouped by player
            player_bids: Dict[str, List[Tuple[int, int]]] = {}  # player_id -> [(roster_id, bid)]

            for txn in transactions:
                if txn.get("type") == "waiver":
                    adds = txn.get("adds", {}) or {}
                    settings = txn.get("settings", {})
                    bid = settings.get("waiver_bid", 0)
                    roster_ids = txn.get("roster_ids", [])

                    for player_id in adds.keys():
                        if roster_ids and bid is not None:
                            if player_id not in player_bids:
                                player_bids[player_id] = []
                            player_bids[player_id].append((roster_ids[0], bid, txn.get("status")))

            # Calculate wasted FAAB for each player
            for player_id, bids in player_bids.items():
                # Sort by bid descending
                sorted_bids = sorted(bids, key=lambda x: x[1], reverse=True)

                # Find the winning bid (completed status)
                winning_bid = None
                winning_roster = None
                for roster_id, bid, status in sorted_bids:
                    if status == "complete":
                        winning_bid = bid
                        winning_roster = roster_id
                        break

                if winning_bid is not None and len(sorted_bids) > 1:
                    # Find second highest bid
                    second_bid = 0
                    for roster_id, bid, status in sorted_bids:
                        if roster_id != winning_roster:
                            second_bid = bid
                            break

                    # FAAB wasted = winning bid - (second bid + 1)
                    wasted = max(0, winning_bid - second_bid - 1)
                    if winning_roster:
                        faab_wasted[winning_roster] = faab_wasted.get(winning_roster, 0) + wasted

        except Exception:
            continue

    faab_remaining: Dict[int, int] = {}
    for rid in roster_to_user.keys():
        spent = faab_spent.get(rid, 0)
        # Eliminated teams show $0 FAAB
        if rid in eliminations:
            faab_remaining[rid] = 0
        else:
            faab_remaining[rid] = STARTING_FAAB - spent

    # 6. Calculate average position above chop (ranking-based) and close call counter
    # Close calls: finished 2nd to last (1 position above chop) OR within 5 points of chop score
    CLOSE_CALL_POINTS_THRESHOLD = 5.0
    avg_position_above_chop: Dict[int, float] = {}
    close_call_count: Dict[int, int] = {rid: 0 for rid in roster_to_user.keys()}

    for roster_id in roster_to_user.keys():
        chop_week = eliminations.get(roster_id)
        end_week = chop_week if chop_week else current_week

        positions_above = []
        for week in range(1, end_week + 1):
            if week not in all_scores:
                continue

            # Get teams alive in this week
            alive_in_week = [
                rid for rid in roster_to_user.keys()
                if eliminations.get(rid) is None or eliminations[rid] >= week
            ]

            # Get scores for alive teams
            week_scores = [(rid, all_scores[week].get(rid, 0)) for rid in alive_in_week
                          if all_scores[week].get(rid) is not None]

            if not week_scores:
                continue

            # Sort by score descending (rank 1 = highest)
            week_scores.sort(key=lambda x: x[1], reverse=True)
            n = len(week_scores)

            # Find this team's rank
            rank = None
            for i, (rid, score) in enumerate(week_scores):
                if rid == roster_id:
                    rank = i + 1  # 1-indexed
                    break

            if rank is not None:
                # Positions above chop = teams_alive - rank
                # E.g., rank 1 of 18 = 17 positions above chop
                # rank 18 of 18 = 0 positions above chop (you got chopped)
                positions_above.append(n - rank)

                # Close call: finished 2nd to last (1 position above chop)
                # OR within X points of chop score (but not chopped)
                chop_score_this_week = chop_scores.get(week, 0)
                my_score = all_scores[week].get(roster_id, 0)
                points_above_chop = my_score - chop_score_this_week

                is_close_call = False
                if n - rank == 1:
                    # Finished 2nd to last
                    is_close_call = True
                elif n - rank > 0 and points_above_chop <= CLOSE_CALL_POINTS_THRESHOLD:
                    # Survived but within threshold points of chop
                    is_close_call = True

                if is_close_call:
                    close_call_count[roster_id] += 1

        avg_position_above_chop[roster_id] = round(statistics.mean(positions_above), 1) if positions_above else 0

    # 7. Calculate weekly stats (only for teams alive in each week)
    weekly_stats: Dict[str, Dict] = {}

    for week in range(1, current_week + 1):
        if week not in all_scores:
            continue

        # Get teams alive in this week
        alive_teams = [
            rid for rid in roster_to_user.keys()
            if eliminations.get(rid) is None or eliminations[rid] >= week
        ]

        scores = [all_scores[week].get(rid) for rid in alive_teams
                  if all_scores[week].get(rid) is not None]

        if scores:
            sorted_scores = sorted(scores)
            n = len(scores)

            weekly_stats[str(week)] = {
                "high_score": max(scores),
                "percentile_75": statistics.quantiles(scores, n=4)[2] if n >= 4 else max(scores),
                "median": statistics.median(scores),
                "percentile_25": statistics.quantiles(scores, n=4)[0] if n >= 4 else min(scores),
                "chop_score": min(scores),
                "chop_differential": round(sorted_scores[1] - sorted_scores[0], 2) if n >= 2 else 0
            }

    # Add empty stats for future weeks
    for week in range(current_week + 1, 18):
        weekly_stats[str(week)] = {
            "high_score": None,
            "percentile_75": None,
            "median": None,
            "percentile_25": None,
            "chop_score": None,
            "chop_differential": None
        }

    # 8. Determine champion (winner)
    winner_roster_id = await client.get_winner_roster_id(season)
    champion = None
    if winner_roster_id:
        champion = roster_to_user.get(winner_roster_id)

    # 8. Build managers list
    managers = []
    for roster_id, user_name in roster_to_user.items():
        # Build weekly scores dict
        weekly_scores_dict = {}
        chop_week = eliminations.get(roster_id)

        for week in range(1, 18):
            if week <= current_week:
                # Only show score if team was alive
                if chop_week is None or week <= chop_week:
                    weekly_scores_dict[str(week)] = all_scores.get(week, {}).get(roster_id)
                else:
                    weekly_scores_dict[str(week)] = None
            else:
                weekly_scores_dict[str(week)] = None

        managers.append({
            "user_name": user_name,
            "roster_id": roster_id,
            "draft_position": draft_positions.get(roster_id),
            "chop_week": chop_week,
            "faab_remaining": faab_remaining.get(roster_id, 0),
            "faab_spent": faab_spent.get(roster_id, 0),
            "faab_wasted": faab_wasted.get(roster_id, 0),
            "avg_pos_above_chop": avg_position_above_chop.get(roster_id, 0),
            "close_calls": close_call_count.get(roster_id, 0),
            "weekly_scores": weekly_scores_dict
        })

    # 9. Sort managers: eliminated first (by chop_week), then survivors (by avg_pos_above_chop ascending)
    # For display purposes
    managers.sort(key=lambda m: (
        0 if m["chop_week"] else 1,  # Eliminated first
        m["chop_week"] or 999,        # By chop week ascending
        m["avg_pos_above_chop"]       # Then by avg position above chop ascending
    ))

    # 10. Determine finish positions (INVERSE of elimination order)
    # In guillotine: first eliminated = last place, survivor = first place
    # Finish position = total_teams - (elimination_order - 1)
    # Eliminated week 1 -> position 18 (last)
    # Eliminated week 17 -> position 2
    # Survivor -> position 1
    total_teams = len(managers)

    for manager in managers:
        if manager["chop_week"] is None:
            # Survivor is the champion
            manager["finish_position"] = 1
        else:
            # Earlier elimination = worse finish
            # chop_week 1 -> finish 18, chop_week 2 -> finish 17, etc.
            manager["finish_position"] = total_teams - manager["chop_week"] + 1

    return {
        "season": season,
        "current_week": current_week,
        "starting_faab": STARTING_FAAB,
        "champion": champion,
        "managers": managers,
        "weekly_stats": weekly_stats
    }
