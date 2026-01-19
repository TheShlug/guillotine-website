"""Sleeper API client with caching."""

import httpx
from datetime import datetime
from typing import Dict, List, Optional
from .config import SLEEPER_API_BASE, LEAGUE_IDS, CACHE_TTL


class SleeperClient:
    """Async client for Sleeper Fantasy Football API."""

    def __init__(self):
        self._cache: Dict[str, any] = {}
        self._cache_time: Dict[str, datetime] = {}

    def get_league_id(self, season: int) -> Optional[str]:
        """Get league ID for a specific season."""
        return LEAGUE_IDS.get(season)

    def get_available_seasons(self) -> List[int]:
        """Get list of seasons available via Sleeper API."""
        return sorted(LEAGUE_IDS.keys())

    async def _cached_get(self, url: str) -> any:
        """GET request with caching."""
        now = datetime.now()

        if url in self._cache:
            cache_age = (now - self._cache_time[url]).total_seconds()
            if cache_age < CACHE_TTL:
                return self._cache[url]

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

        self._cache[url] = data
        self._cache_time[url] = now
        return data

    async def get_league_info(self, season: int) -> Dict:
        """Get basic league information for a season."""
        league_id = self.get_league_id(season)
        if not league_id:
            return {}
        url = f"{SLEEPER_API_BASE}/league/{league_id}"
        return await self._cached_get(url)

    async def get_rosters(self, season: int) -> List[Dict]:
        """Get all rosters (includes roster_id to owner mapping)."""
        league_id = self.get_league_id(season)
        if not league_id:
            return []
        url = f"{SLEEPER_API_BASE}/league/{league_id}/rosters"
        return await self._cached_get(url)

    async def get_users(self, season: int) -> List[Dict]:
        """Get all users in the league."""
        league_id = self.get_league_id(season)
        if not league_id:
            return []
        url = f"{SLEEPER_API_BASE}/league/{league_id}/users"
        return await self._cached_get(url)

    async def get_matchups(self, season: int, week: int) -> List[Dict]:
        """Get matchup data for a specific week."""
        league_id = self.get_league_id(season)
        if not league_id:
            return []
        url = f"{SLEEPER_API_BASE}/league/{league_id}/matchups/{week}"
        return await self._cached_get(url)

    async def get_transactions(self, season: int, week: int) -> List[Dict]:
        """Get transactions for a specific week (for FAAB tracking)."""
        league_id = self.get_league_id(season)
        if not league_id:
            return []
        url = f"{SLEEPER_API_BASE}/league/{league_id}/transactions/{week}"
        return await self._cached_get(url)

    async def get_draft_picks(self, season: int) -> List[Dict]:
        """Get draft picks information."""
        league_id = self.get_league_id(season)
        if not league_id:
            return []

        # First get the draft ID
        drafts_url = f"{SLEEPER_API_BASE}/league/{league_id}/drafts"
        drafts = await self._cached_get(drafts_url)

        if drafts and len(drafts) > 0:
            draft_id = drafts[0]["draft_id"]
            picks_url = f"{SLEEPER_API_BASE}/draft/{draft_id}/picks"
            return await self._cached_get(picks_url)

        return []

    async def get_current_week(self, season: int) -> int:
        """
        Determine the current NFL week from league status.
        Returns the current week number (1-17).
        """
        league = await self.get_league_info(season)

        # Get league settings
        if league:
            # Check if season is over
            status = league.get("status", "")
            if status == "complete":
                return 17

            # Get current matchup week from league state
            # Sleeper uses 'leg' for current week in some contexts
            settings = league.get("settings", {})
            current_week = settings.get("leg", 1)

            # Also check the 'season' field to ensure we're in the right year
            if current_week and 1 <= current_week <= 17:
                return current_week

        # Default to week 1 if unable to determine
        return 1

    async def get_winner_roster_id(self, season: int) -> Optional[int]:
        """Get the roster ID of the season winner."""
        league = await self.get_league_info(season)
        if league:
            metadata = league.get("metadata", {})
            winner_id = metadata.get("latest_league_winner_roster_id")
            if winner_id:
                return int(winner_id)
        return None

    async def get_players(self) -> Dict[str, Dict]:
        """Get all NFL players (cached heavily since it's large and rarely changes)."""
        url = f"{SLEEPER_API_BASE}/players/nfl"
        return await self._cached_get(url)

    async def get_player_name(self, player_id: str, players_cache: Dict = None) -> str:
        """Get player name from player ID."""
        if players_cache is None:
            players_cache = await self.get_players()

        player = players_cache.get(player_id, {})
        first = player.get("first_name", "")
        last = player.get("last_name", "Unknown")
        position = player.get("position", "")

        if first:
            return f"{first} {last} ({position})" if position else f"{first} {last}"
        return f"Player {player_id}"


# Singleton instance
sleeper_client = SleeperClient()
