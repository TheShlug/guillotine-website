"""
FastAPI application for Guillotine League Website.
Serves both the API and static frontend files.
"""

import json
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .sleeper_client import sleeper_client
from .data_processor import process_season_data
from .config import LEAGUE_NAME, LEAGUE_IDS, HISTORICAL_SEASONS, LEAGUE_INFO, STARTING_FAAB

# Paths
BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
DATA_DIR = FRONTEND_DIR / "data"

app = FastAPI(
    title=f"{LEAGUE_NAME} API",
    description="API for The Guillotine Fantasy Football League",
    version="1.0.0"
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def load_historical_data(season: int) -> dict:
    """Load historical data from JSON files."""
    file_path = DATA_DIR / f"{season}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Data for season {season} not found")

    with open(file_path, "r") as f:
        return json.load(f)


def load_average_finishes() -> dict:
    """Load average finishes data."""
    file_path = DATA_DIR / "average_finishes.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Average finishes data not found")

    with open(file_path, "r") as f:
        return json.load(f)


def get_all_seasons() -> List[int]:
    """Get all available seasons (historical + API)."""
    api_seasons = list(LEAGUE_IDS.keys())
    return sorted(set(HISTORICAL_SEASONS + api_seasons))


# API Routes

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "league": LEAGUE_NAME}


@app.get("/api/seasons")
async def list_seasons():
    """List all available seasons."""
    seasons = get_all_seasons()
    live_seasons = list(LEAGUE_IDS.keys())
    return {
        "seasons": seasons,
        "current_season": max(seasons),
        "historical_seasons": HISTORICAL_SEASONS,
        "live_seasons": live_seasons,
        "api_seasons": live_seasons
    }


@app.get("/api/seasons/{season}")
async def get_season_data(season: int, week: Optional[int] = None):
    """
    Get season data.
    - Historical seasons: Returns static data from JSON files
    - API seasons: Fetches live data from Sleeper API

    The week parameter controls the "current_week" value returned,
    which determines how many weeks of data to display.
    """
    if season in HISTORICAL_SEASONS:
        data = load_historical_data(season)
        # If week is specified, set current_week to that value
        # This allows viewing historical data as it appeared at a specific week
        if week is not None:
            week = max(1, min(17, week))
            data = dict(data)  # Create a copy to avoid modifying cached data
            data["current_week"] = week
        return data
    elif season in LEAGUE_IDS:
        # Check if league is in pre-draft/pre-season state
        league_info = await sleeper_client.get_league_info(season)
        league_status = league_info.get("status", "") if league_info else ""

        if league_status in ("pre_draft", "drafting"):
            # Season hasn't started yet - return placeholder with manager list
            users = await sleeper_client.get_users(season)
            return {
                "season": season,
                "champion": None,
                "current_week": 0,
                "status": league_status,
                "managers": [
                    {
                        "user_name": u.get("display_name", u.get("username", f"User_{u['user_id']}")),
                        "draft_position": None,
                        "chop_week": None,
                        "faab_remaining": STARTING_FAAB,
                        "weekly_scores": {str(w): None for w in range(1, 18)},
                        "avg_pos_above_chop": None,
                        "finish_position": None
                    }
                    for u in users
                ],
                "weekly_stats": {}
            }

        # Get current week from Sleeper if not specified
        if week is None:
            week = await sleeper_client.get_current_week(season)

        # Ensure week is within bounds
        week = max(1, min(17, week))

        return await process_season_data(sleeper_client, season, week)
    else:
        raise HTTPException(status_code=404, detail=f"Season {season} not available")


@app.get("/api/seasons/{season}/current-week")
async def get_current_week(season: int):
    """Get the current NFL week from Sleeper for a specific season."""
    if season not in LEAGUE_IDS:
        raise HTTPException(status_code=404, detail=f"Season {season} not available via API")

    week = await sleeper_client.get_current_week(season)
    return {"season": season, "week": week}


@app.get("/api/average-finishes")
async def get_average_finishes():
    """Get historical average finish data across all seasons."""
    return load_average_finishes()


@app.get("/api/league-info")
async def get_league_info():
    """Get league rules, prize pool, and other info."""
    return {
        "name": LEAGUE_NAME,
        "info": LEAGUE_INFO,
        "seasons": get_all_seasons()
    }


@app.get("/api/seasons/{season}/transactions")
async def get_season_transactions(season: int, week: Optional[int] = None):
    """
    Get all transactions for a season with player names and bid details.
    Used for transaction visualization and chopped player tracking.
    """
    # Check if historical season has transactions data in JSON
    if season in HISTORICAL_SEASONS and season not in LEAGUE_IDS:
        try:
            data = load_historical_data(season)
            if "transactions" in data:
                return data["transactions"]
            else:
                # Historical season without transactions data
                return {
                    "season": season,
                    "current_week": 17,
                    "transactions": [],
                    "weekly_summaries": {},
                    "message": "Transaction data not available for historical seasons"
                }
        except HTTPException:
            pass

    if season not in LEAGUE_IDS:
        raise HTTPException(status_code=404, detail=f"Season {season} not available via API")

    # Get current week if not specified
    if week is None:
        week = await sleeper_client.get_current_week(season)

    # Get users for roster_id -> name mapping
    users = await sleeper_client.get_users(season)
    rosters = await sleeper_client.get_rosters(season)

    user_map = {u["user_id"]: u.get("display_name", u.get("username", f"User_{u['user_id']}"))
                for u in users}
    roster_to_user = {}
    for roster in rosters:
        owner_id = roster.get("owner_id")
        roster_id = roster["roster_id"]
        roster_to_user[roster_id] = user_map.get(owner_id, f"Team {roster_id}")

    # Get players for name lookup
    players_cache = await sleeper_client.get_players()

    # Collect all transactions
    all_transactions = []
    weekly_summaries = {}

    for w in range(1, week + 1):
        try:
            transactions = await sleeper_client.get_transactions(season, w)
            week_total_spent = 0
            week_transactions = []

            # Group bids by player to find competing bids
            player_bids = {}

            for txn in transactions:
                if txn.get("type") == "waiver":
                    adds = txn.get("adds", {}) or {}
                    drops = txn.get("drops", {}) or {}
                    settings = txn.get("settings", {})
                    bid = settings.get("waiver_bid", 0)
                    roster_ids = txn.get("roster_ids", [])
                    status = txn.get("status")

                    for player_id in adds.keys():
                        if player_id not in player_bids:
                            player_bids[player_id] = []
                        player_bids[player_id].append({
                            "roster_id": roster_ids[0] if roster_ids else None,
                            "bid": bid,
                            "status": status,
                            "drops": list(drops.keys())
                        })

            # Process completed transactions
            for player_id, bids in player_bids.items():
                completed = [b for b in bids if b["status"] == "complete"]
                if completed:
                    winning = completed[0]
                    roster_id = winning["roster_id"]

                    # Get all bids for this player (including failed)
                    all_bids_for_player = sorted([b["bid"] for b in bids], reverse=True)
                    second_highest = all_bids_for_player[1] if len(all_bids_for_player) > 1 else 0

                    player_name = await sleeper_client.get_player_name(player_id, players_cache)
                    manager_name = roster_to_user.get(roster_id, f"Team {roster_id}")

                    txn_data = {
                        "week": w,
                        "player_id": player_id,
                        "player_name": player_name,
                        "manager": manager_name,
                        "roster_id": roster_id,
                        "winning_bid": winning["bid"],
                        "second_highest_bid": second_highest,
                        "num_bidders": len(bids),
                        "wasted": max(0, winning["bid"] - second_highest - 1)
                    }

                    all_transactions.append(txn_data)
                    week_transactions.append(txn_data)
                    week_total_spent += winning["bid"]

            weekly_summaries[str(w)] = {
                "total_spent": week_total_spent,
                "num_transactions": len(week_transactions),
                "transactions": week_transactions
            }

        except Exception as e:
            weekly_summaries[str(w)] = {"error": str(e), "total_spent": 0, "num_transactions": 0}

    return {
        "season": season,
        "current_week": week,
        "transactions": all_transactions,
        "weekly_summaries": weekly_summaries
    }


@app.get("/api/seasons/{season}/chopped-players")
async def get_chopped_players(season: int):
    """
    Track players who were on teams that got chopped.
    The 'death bell' players who brought bad luck to their owners.
    """
    # Check if historical season has chopped_players data in JSON
    if season in HISTORICAL_SEASONS and season not in LEAGUE_IDS:
        try:
            data = load_historical_data(season)
            if "chopped_players" in data:
                return {
                    "season": season,
                    "current_week": data.get("current_week", 17),
                    "chopped_players": data["chopped_players"],
                    "total_unique_players_chopped": len(data["chopped_players"])
                }
            else:
                # Historical season without chopped_players data
                return {
                    "season": season,
                    "current_week": 17,
                    "chopped_players": [],
                    "total_unique_players_chopped": 0,
                    "message": "Roster data not available for historical seasons"
                }
        except Exception as e:
            # Log but continue to check API
            print(f"Error loading historical data for season {season}: {e}")

    if season not in LEAGUE_IDS:
        raise HTTPException(status_code=404, detail=f"Season {season} not available via API")

    # Get season data
    current_week = await sleeper_client.get_current_week(season)
    season_data = await process_season_data(sleeper_client, season, current_week)

    # Get roster snapshots for each week to track who had which players
    users = await sleeper_client.get_users(season)
    rosters = await sleeper_client.get_rosters(season)

    user_map = {u["user_id"]: u.get("display_name", u.get("username", f"User_{u['user_id']}"))
                for u in users}
    roster_to_user = {}
    for roster in rosters:
        owner_id = roster.get("owner_id")
        roster_id = roster["roster_id"]
        roster_to_user[roster_id] = user_map.get(owner_id, f"Team {roster_id}")

    # Get players cache
    players_cache = await sleeper_client.get_players()

    # Track players on chopped teams
    chopped_player_history = {}  # player_id -> list of chop events

    # Get eliminations from season data
    eliminations = {m["user_name"]: m["chop_week"] for m in season_data["managers"] if m["chop_week"]}

    for w in range(1, current_week + 1):
        try:
            matchups = await sleeper_client.get_matchups(season, w)

            # Find which roster got chopped this week
            chopped_roster_id = None
            for manager in season_data["managers"]:
                if manager["chop_week"] == w:
                    chopped_roster_id = manager["roster_id"]
                    break

            if chopped_roster_id:
                # Find the matchup for the chopped roster to get their players
                for matchup in matchups:
                    if matchup.get("roster_id") == chopped_roster_id:
                        starters = matchup.get("starters", []) or []
                        players_on_roster = matchup.get("players", []) or []

                        for player_id in players_on_roster:
                            if player_id not in chopped_player_history:
                                chopped_player_history[player_id] = []

                            player_name = await sleeper_client.get_player_name(player_id, players_cache)
                            manager_name = roster_to_user.get(chopped_roster_id, f"Team {chopped_roster_id}")

                            chopped_player_history[player_id].append({
                                "week": w,
                                "manager": manager_name,
                                "was_starter": player_id in starters
                            })
                        break

        except Exception:
            continue

    # Build summary of players with multiple chops
    death_bell_players = []
    for player_id, chop_events in chopped_player_history.items():
        if len(chop_events) >= 1:  # Include all chopped players
            player_name = await sleeper_client.get_player_name(player_id, players_cache)
            death_bell_players.append({
                "player_id": player_id,
                "player_name": player_name,
                "times_chopped": len(chop_events),
                "chop_events": chop_events
            })

    # Sort by times chopped descending
    death_bell_players.sort(key=lambda x: x["times_chopped"], reverse=True)

    return {
        "season": season,
        "current_week": current_week,
        "chopped_players": death_bell_players,
        "total_unique_players_chopped": len(death_bell_players)
    }


# Mount static files for frontend
if FRONTEND_DIR.exists():
    app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
    app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
    app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")


@app.get("/")
async def serve_index():
    """Serve the main index.html page."""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Frontend not found")


@app.get("/average-finishes")
async def serve_average_finishes_page():
    """Serve the average finishes page."""
    page_path = FRONTEND_DIR / "average-finishes.html"
    if page_path.exists():
        return FileResponse(page_path)
    raise HTTPException(status_code=404, detail="Page not found")


@app.get("/rules")
async def serve_rules_page():
    """Serve the league rules page."""
    page_path = FRONTEND_DIR / "rules.html"
    if page_path.exists():
        return FileResponse(page_path)
    raise HTTPException(status_code=404, detail="Page not found")


@app.get("/draft-order")
async def serve_draft_order_page():
    """Serve the draft order page for next season."""
    page_path = FRONTEND_DIR / "draft-order.html"
    if page_path.exists():
        return FileResponse(page_path)
    raise HTTPException(status_code=404, detail="Page not found")


@app.get("/transactions")
async def serve_transactions_page():
    """Serve the transactions visualization page."""
    page_path = FRONTEND_DIR / "transactions.html"
    if page_path.exists():
        return FileResponse(page_path)
    raise HTTPException(status_code=404, detail="Page not found")


@app.get("/death-bell")
async def serve_death_bell_page():
    """Serve the chopped players (death bell) tracking page."""
    page_path = FRONTEND_DIR / "death-bell.html"
    if page_path.exists():
        return FileResponse(page_path)
    raise HTTPException(status_code=404, detail="Page not found")


@app.get("/manager/{manager_name}")
async def serve_manager_profile_page(manager_name: str):
    """Serve the manager profile page."""
    page_path = FRONTEND_DIR / "manager.html"
    if page_path.exists():
        return FileResponse(page_path)
    raise HTTPException(status_code=404, detail="Page not found")


@app.get("/api/manager/{manager_name}")
async def get_manager_profile(manager_name: str):
    """
    Get comprehensive profile data for a specific manager across all seasons.
    """
    import urllib.parse
    manager_name = urllib.parse.unquote(manager_name)

    profile = {
        "user_name": manager_name,
        "seasons": {},
        "career_stats": {
            "seasons_played": 0,
            "championships": 0,
            "top_3_finishes": 0,
            "total_weeks_played": 0,
            "total_points": 0,
            "best_week": {"score": 0, "season": None, "week": None},
            "worst_week": {"score": float('inf'), "season": None, "week": None},
            "close_calls": 0,
            "total_faab_spent": 0,
            "total_faab_wasted": 0
        },
        "finishes": []
    }

    all_seasons = get_all_seasons()

    for season in all_seasons:
        try:
            if season in HISTORICAL_SEASONS:
                data = load_historical_data(season)
            elif season in LEAGUE_IDS:
                current_week = await sleeper_client.get_current_week(season)
                data = await process_season_data(sleeper_client, season, current_week)
            else:
                continue

            # Find this manager in the season data
            manager_data = None
            for m in data.get("managers", []):
                if m["user_name"].lower() == manager_name.lower():
                    manager_data = m
                    break

            if not manager_data:
                continue

            profile["career_stats"]["seasons_played"] += 1

            # Determine finish position
            finish_pos = manager_data.get("finish_position")
            if not finish_pos and manager_data.get("chop_week"):
                # Calculate from chop week for older data
                num_managers = len(data["managers"])
                finish_pos = num_managers - manager_data["chop_week"] + 1
            elif not finish_pos and not manager_data.get("chop_week"):
                finish_pos = 1  # Champion

            if finish_pos == 1:
                profile["career_stats"]["championships"] += 1
            if finish_pos and finish_pos <= 3:
                profile["career_stats"]["top_3_finishes"] += 1

            profile["finishes"].append({
                "season": season,
                "finish": finish_pos,
                "chop_week": manager_data.get("chop_week"),
                "draft_position": manager_data.get("draft_position")
            })

            # Process weekly scores
            weekly_scores = manager_data.get("weekly_scores", {})
            season_total = 0
            weeks_played = 0

            for week_str, score in weekly_scores.items():
                if score is not None:
                    weeks_played += 1
                    season_total += score
                    profile["career_stats"]["total_points"] += score
                    week_num = int(week_str)

                    if score > profile["career_stats"]["best_week"]["score"]:
                        profile["career_stats"]["best_week"] = {
                            "score": score,
                            "season": season,
                            "week": week_num
                        }

                    if score < profile["career_stats"]["worst_week"]["score"]:
                        profile["career_stats"]["worst_week"] = {
                            "score": score,
                            "season": season,
                            "week": week_num
                        }

            profile["career_stats"]["total_weeks_played"] += weeks_played

            # Close calls from all seasons
            profile["career_stats"]["close_calls"] += manager_data.get("close_calls", 0)

            # FAAB stats (only for 2025 onward - earlier data had eliminated teams zeroed)
            if season >= 2025:
                profile["career_stats"]["total_faab_spent"] += manager_data.get("faab_spent", 0)
                profile["career_stats"]["total_faab_wasted"] += manager_data.get("faab_wasted", 0)

            # Store season data
            profile["seasons"][str(season)] = {
                "finish_position": finish_pos,
                "chop_week": manager_data.get("chop_week"),
                "draft_position": manager_data.get("draft_position"),
                "faab_remaining": manager_data.get("faab_remaining"),
                "faab_spent": manager_data.get("faab_spent", 0),
                "faab_wasted": manager_data.get("faab_wasted", 0),
                "avg_pos_above_chop": manager_data.get("avg_pos_above_chop"),
                "close_calls": manager_data.get("close_calls", 0),
                "weekly_scores": weekly_scores,
                "season_total": round(season_total, 2),
                "weeks_played": weeks_played,
                "avg_score": round(season_total / weeks_played, 2) if weeks_played > 0 else 0
            }

        except Exception as e:
            continue

    # Handle worst_week infinity case
    if profile["career_stats"]["worst_week"]["score"] == float('inf'):
        profile["career_stats"]["worst_week"]["score"] = 0

    # Calculate average finish
    if profile["finishes"]:
        valid_finishes = [f["finish"] for f in profile["finishes"] if f["finish"]]
        if valid_finishes:
            profile["career_stats"]["average_finish"] = round(
                sum(valid_finishes) / len(valid_finishes), 2
            )

    # Calculate average weekly score
    if profile["career_stats"]["total_weeks_played"] > 0:
        profile["career_stats"]["career_avg_score"] = round(
            profile["career_stats"]["total_points"] / profile["career_stats"]["total_weeks_played"], 2
        )

    profile["career_stats"]["total_points"] = round(profile["career_stats"]["total_points"], 2)

    return profile


@app.get("/season-recap")
async def serve_season_recap_page():
    """Serve the season recap page."""
    page_path = FRONTEND_DIR / "season-recap.html"
    if page_path.exists():
        return FileResponse(page_path)
    raise HTTPException(status_code=404, detail="Page not found")


@app.get("/api/seasons/{season}/recap")
async def get_season_recap(season: int):
    """
    Generate a comprehensive season recap with superlatives and key moments.
    """
    if season in HISTORICAL_SEASONS:
        data = load_historical_data(season)
        current_week = 17
    elif season in LEAGUE_IDS:
        # Check if league is in pre-draft state
        league_info = await sleeper_client.get_league_info(season)
        league_status = league_info.get("status", "") if league_info else ""

        if league_status in ("pre_draft", "drafting"):
            # Return a minimal recap for pre-season
            return {
                "season": season,
                "current_week": 0,
                "is_complete": False,
                "status": league_status,
                "champion": None,
                "superlatives": {},
                "weekly_highlights": [],
                "elimination_order": [],
                "close_calls": [],
                "biggest_blowouts": []
            }

        current_week = await sleeper_client.get_current_week(season)
        data = await process_season_data(sleeper_client, season, current_week)
    else:
        raise HTTPException(status_code=404, detail=f"Season {season} not available")

    managers = data.get("managers", [])
    weekly_stats = data.get("weekly_stats", {})

    recap = {
        "season": season,
        "current_week": current_week,
        "is_complete": current_week == 17,
        "champion": data.get("champion"),
        "superlatives": {},
        "weekly_highlights": [],
        "elimination_order": [],
        "close_calls": [],
        "biggest_blowouts": []
    }

    # Build elimination order
    eliminated = [m for m in managers if m.get("chop_week")]
    eliminated.sort(key=lambda x: x["chop_week"])
    recap["elimination_order"] = [
        {
            "week": m["chop_week"],
            "manager": m["user_name"],
            "score": m["weekly_scores"].get(str(m["chop_week"]))
        }
        for m in eliminated
    ]

    # Track superlatives
    highest_score = {"score": 0, "manager": None, "week": None}
    lowest_score = {"score": float('inf'), "manager": None, "week": None}
    most_close_calls = {"manager": None, "count": 0}
    best_avg_position = {"manager": None, "avg_pos": 0}

    for manager in managers:
        scores = []
        for week_str, score in manager.get("weekly_scores", {}).items():
            if score is not None:
                week = int(week_str)
                scores.append(score)

                if score > highest_score["score"]:
                    highest_score = {"score": score, "manager": manager["user_name"], "week": week}

                if score < lowest_score["score"] and not (manager.get("chop_week") == week):
                    lowest_score = {"score": score, "manager": manager["user_name"], "week": week}

        # Track most close calls
        close_calls = manager.get("close_calls", 0)
        if close_calls > most_close_calls["count"]:
            most_close_calls = {"manager": manager["user_name"], "count": close_calls}

        # Track best average position above chop (higher is better)
        avg_pos = manager.get("avg_pos_above_chop", manager.get("avg_above_chop", 0))
        if avg_pos > best_avg_position["avg_pos"]:
            best_avg_position = {"manager": manager["user_name"], "avg_pos": round(avg_pos, 1)}

    recap["superlatives"]["highest_score"] = highest_score
    recap["superlatives"]["lowest_survivor_score"] = lowest_score if lowest_score["score"] != float('inf') else None
    recap["superlatives"]["most_close_calls"] = most_close_calls if most_close_calls["manager"] else None
    recap["superlatives"]["best_avg_position"] = best_avg_position if best_avg_position["manager"] else None

    # Find close calls (narrowly escaped elimination)
    for week_str, stats in weekly_stats.items():
        week = int(week_str)
        chop_score = stats.get("chop_score")
        if chop_score:
            # Find who had the second lowest score
            week_scores = []
            for m in managers:
                score = m["weekly_scores"].get(week_str)
                chop_week = m.get("chop_week")
                if score is not None and (not chop_week or chop_week >= week):
                    week_scores.append({"manager": m["user_name"], "score": score, "was_chopped": chop_week == week})

            week_scores.sort(key=lambda x: x["score"])
            if len(week_scores) >= 2:
                chopped = week_scores[0]
                survivor = week_scores[1]
                diff = round(survivor["score"] - chopped["score"], 2)

                if diff < 5:  # Close call threshold
                    recap["close_calls"].append({
                        "week": week,
                        "survivor": survivor["manager"],
                        "survivor_score": survivor["score"],
                        "chopped": chopped["manager"],
                        "chopped_score": chopped["score"],
                        "margin": diff
                    })

                # Check for blowouts at the bottom
                if diff > 20:
                    recap["biggest_blowouts"].append({
                        "week": week,
                        "chopped": chopped["manager"],
                        "score": chopped["score"],
                        "margin_to_safety": diff
                    })

    # Sort close calls by margin (closest first)
    recap["close_calls"].sort(key=lambda x: x["margin"])
    recap["close_calls"] = recap["close_calls"][:5]  # Top 5 closest

    # Sort blowouts by margin (biggest first)
    recap["biggest_blowouts"].sort(key=lambda x: x["margin_to_safety"], reverse=True)
    recap["biggest_blowouts"] = recap["biggest_blowouts"][:5]  # Top 5

    # Weekly highlights
    for week in range(1, current_week + 1):
        week_str = str(week)
        stats = weekly_stats.get(week_str, {})
        if stats:
            # Find high scorer for the week
            high_scorer = None
            high_score = 0
            for m in managers:
                score = m["weekly_scores"].get(week_str)
                if score and score > high_score:
                    high_score = score
                    high_scorer = m["user_name"]

            # Find who was eliminated
            eliminated_mgr = None
            for e in recap["elimination_order"]:
                if e["week"] == week:
                    eliminated_mgr = e["manager"]
                    break

            recap["weekly_highlights"].append({
                "week": week,
                "high_scorer": high_scorer,
                "high_score": high_score,
                "median": stats.get("median"),
                "eliminated": eliminated_mgr,
                "chop_score": stats.get("chop_score")
            })

    return recap


# For running directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
