"""Configuration for Guillotine League API."""

LEAGUE_NAME = "The Guillotine"
STARTING_FAAB = 1000

# League IDs by season - add new seasons here when they start on Sleeper
# The most recent season should be listed last
LEAGUE_IDS = {
    2025: "1265021712194359296",  # Note: main standings use hardcoded JSON due to scoring changes
    2026: "1312570678427279360",
}

# Historical seasons stored in JSON files (no Sleeper API data available)
# 2025 uses static JSON because Sleeper API has incorrect data due to
# retroactive scoring changes after eliminations occurred
HISTORICAL_SEASONS = [2023, 2024, 2025]

# Sleeper API base URL
SLEEPER_API_BASE = "https://api.sleeper.app/v1"

# Cache TTL in seconds
CACHE_TTL = 300  # 5 minutes

# League rules and info
LEAGUE_INFO = {
    "prize_pool": {
        "first": 700,
        "second": 150,
        "third": 50,
    },
    "waiver_time": "Every Wednesday, 8PM EST",
    "chop_rules": (
        "Players on teams that are chopped from weeks 14 onward will not be available "
        "in free agency. The last actual 'chop' will be players from the team eliminated "
        "in week 13. Waivers with available players will continue to run through the end "
        "of the season (week 17)."
    ),
    "bench_expansion": "Add extra bench spot after weeks 4 & 8.",
}
