"""Sector -> lat/lng geocoding (blueprint §3.4 step: geocode location.sector).

A small static gazetteer for the corridor covers the common cases offline; a
pluggable ``Geocoder`` lets a real geocoding service be swapped in for prod.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class GeoPoint:
    lat: float
    lng: float


class Geocoder(Protocol):
    def geocode_sector(self, sector: str) -> GeoPoint | None: ...


# Minimal seed gazetteer (extend as coverage grows). Approx centroids.
_SECTOR_GAZETTEER: dict[str, GeoPoint] = {
    "sector 22d": GeoPoint(28.5410, 77.3300),
    "sector 18": GeoPoint(28.5700, 77.3210),
    "sector 137": GeoPoint(28.5000, 77.4000),
    "sector 150": GeoPoint(28.4600, 77.4300),
    "jewar": GeoPoint(28.1200, 77.6000),
}


class StaticGeocoder:
    def geocode_sector(self, sector: str) -> GeoPoint | None:
        if not sector:
            return None
        key = re.sub(r"\s+", " ", sector.strip().lower())
        return _SECTOR_GAZETTEER.get(key)
