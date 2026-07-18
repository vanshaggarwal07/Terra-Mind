"""Prediction serving API (blueprint §5, P3.8).

Serves each model's standard banded envelope. Band + disclaimer are enforced at
this boundary — a bare number can never reach the client. Missing models return an
explicit low-confidence *unavailable* envelope, not an error (§13).
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from api.predictions import predict_for_locality
from warehouse.schemas import PredictionEnvelope

router = APIRouter(prefix="/predictions", tags=["predictions"])


def _endpoint(domain: str):  # noqa: ANN202
    def handler(
        locality_id: str | None = Query(default=None),
        horizon_years: int | None = Query(default=None, ge=1, le=30),
        version: str | None = Query(default=None),
    ) -> PredictionEnvelope:
        return predict_for_locality(
            domain,
            locality_id=locality_id,
            horizon_years=horizon_years,
            version=version,
        )

    handler.__name__ = f"predict_{domain}"
    return handler


router.add_api_route(
    "/price", _endpoint("price"), methods=["GET"], response_model=PredictionEnvelope
)
router.add_api_route(
    "/traffic", _endpoint("traffic"), methods=["GET"], response_model=PredictionEnvelope
)
router.add_api_route(
    "/flood", _endpoint("flood"), methods=["GET"], response_model=PredictionEnvelope
)
router.add_api_route(
    "/water", _endpoint("water"), methods=["GET"], response_model=PredictionEnvelope
)
router.add_api_route("/aqi", _endpoint("aqi"), methods=["GET"], response_model=PredictionEnvelope)
