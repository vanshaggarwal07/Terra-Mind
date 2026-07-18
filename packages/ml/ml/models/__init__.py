"""Phase-3 models (blueprint §5). Each emits the standard banded envelope.

The LLM never produces these numbers — they come from tabular / time-series /
hydrological models here and are only *explained* by the copilot (§5, §6).
"""

from __future__ import annotations

from ml.models.aqi_model import AQIModel
from ml.models.base import BaseRegressionModel, TrainReport
from ml.models.flood_model import FloodModel
from ml.models.price_model import PriceModel
from ml.models.traffic_model import TrafficModel
from ml.models.water_model import WaterModel

# domain -> model class, the single source of truth for training + serving.
MODEL_CLASSES: dict[str, type] = {
    "price": PriceModel,
    "traffic": TrafficModel,
    "flood": FloodModel,
    "water": WaterModel,
    "aqi": AQIModel,
}

__all__ = [
    "BaseRegressionModel",
    "TrainReport",
    "PriceModel",
    "TrafficModel",
    "FloodModel",
    "WaterModel",
    "AQIModel",
    "MODEL_CLASSES",
]
