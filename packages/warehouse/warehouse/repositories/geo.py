"""PostGIS geometry helpers shared by the geospatial repositories.

We keep everything in PostGIS/PostGIS-Geography (no separate graph DB for v1,
per blueprint §4). Geography columns measure distance in METERS.
"""

from __future__ import annotations

from geoalchemy2 import Geography, Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import Float, cast, func

SRID = 4326


def point(lat: float, lng: float) -> WKTElement:
    """A WGS84 geography point. Note WKT order is POINT(lng lat)."""
    return WKTElement(f"POINT({lng} {lat})", srid=SRID)


def distance_m(col, pt: WKTElement):  # noqa: ANN001, ANN201
    """ST_Distance in meters between a geography column and a point."""
    return func.ST_Distance(col, cast(pt, Geography))


def distance_km_expr(col, pt: WKTElement):  # noqa: ANN001, ANN201
    return cast(distance_m(col, pt) / 1000.0, Float)


def dwithin(col, pt: WKTElement, meters: float):  # noqa: ANN001, ANN201
    """ST_DWithin predicate (meters) for a geography column."""
    return func.ST_DWithin(col, cast(pt, Geography), meters)


def lat_of(col):  # noqa: ANN001, ANN201
    return func.ST_Y(cast(col, Geometry))


def lng_of(col):  # noqa: ANN001, ANN201
    return func.ST_X(cast(col, Geometry))
