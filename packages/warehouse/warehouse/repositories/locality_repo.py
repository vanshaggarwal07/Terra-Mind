"""Repository for ``localities`` + geospatial queries (blueprint §4)."""

from __future__ import annotations

from geoalchemy2.elements import WKTElement
from sqlalchemy import select
from sqlalchemy.orm import Session

from warehouse.models import Locality
from warehouse.repositories import geo
from warehouse.schemas import LocalityRead


def to_read(row: Locality, *, lat: float | None = None, lng: float | None = None) -> LocalityRead:
    return LocalityRead(
        id=row.id,
        name=row.name,
        centroid_lat=lat,
        centroid_lng=lng,
        metadata=row.meta or {},
    )


class LocalityRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, locality_id: str) -> Locality | None:
        return self.session.get(Locality, locality_id)

    def get_read(self, locality_id: str) -> LocalityRead | None:
        row = self.get(locality_id)
        if row is None:
            return None
        lat, lng = self._centroid(locality_id)
        return to_read(row, lat=lat, lng=lng)

    def list_all(self, *, limit: int = 200, offset: int = 0) -> list[Locality]:
        stmt = select(Locality).order_by(Locality.name).limit(limit).offset(offset)
        return list(self.session.scalars(stmt).all())

    def search_by_name(self, query: str, *, limit: int = 5) -> list[Locality]:
        stmt = (
            select(Locality)
            .where(Locality.name.ilike(f"%{query}%"))
            .order_by(Locality.name)
            .limit(limit)
        )
        return list(self.session.scalars(stmt).all())

    def list_read(self, *, limit: int = 200, offset: int = 0) -> list[LocalityRead]:
        stmt = (
            select(
                Locality,
                geo.lat_of(Locality.centroid).label("lat"),
                geo.lng_of(Locality.centroid).label("lng"),
            )
            .order_by(Locality.name)
            .limit(limit)
            .offset(offset)
        )
        out: list[LocalityRead] = []
        for row, lat, lng in self.session.execute(stmt).all():
            out.append(to_read(row, lat=lat, lng=lng))
        return out

    def localities_containing(self, lat: float, lng: float) -> list[Locality]:
        pt = geo.point(lat, lng)
        stmt = select(Locality).where(func_covers(Locality.geom, pt))
        return list(self.session.scalars(stmt).all())

    def distance_km(self, locality_id: str, lat: float, lng: float) -> float | None:
        pt = geo.point(lat, lng)
        stmt = select(geo.distance_km_expr(Locality.centroid, pt)).where(Locality.id == locality_id)
        return self.session.scalar(stmt)

    def centroid_point(self, locality_id: str) -> WKTElement | None:
        lat, lng = self._centroid(locality_id)
        if lat is None or lng is None:
            return None
        return geo.point(lat, lng)

    def _centroid(self, locality_id: str) -> tuple[float | None, float | None]:
        stmt = select(
            geo.lat_of(Locality.centroid), geo.lng_of(Locality.centroid)
        ).where(Locality.id == locality_id)
        result = self.session.execute(stmt).first()
        if result is None:
            return None, None
        return result[0], result[1]


def func_covers(col, pt: WKTElement):  # noqa: ANN001, ANN201
    from geoalchemy2 import Geography
    from sqlalchemy import cast, func

    return func.ST_Covers(col, cast(pt, Geography))
