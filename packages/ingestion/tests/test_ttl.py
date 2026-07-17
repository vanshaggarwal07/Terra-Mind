import datetime as dt

from ingestion.cache.ttl import parse_cadence, ttl_for_category
from warehouse.enums import SourceCategory


def test_category_defaults():
    assert ttl_for_category(SourceCategory.planning) == dt.timedelta(days=30)
    assert ttl_for_category(SourceCategory.news) == dt.timedelta(days=1)
    assert ttl_for_category(SourceCategory.tenders) == dt.timedelta(days=7)


def test_explicit_cadence_wins_over_category_default():
    # planning default is 30d, but an explicit daily cadence overrides it.
    assert ttl_for_category(SourceCategory.planning, "daily") == dt.timedelta(days=1)


def test_parse_cadence_unknown_returns_none():
    assert parse_cadence("whenever") is None
    assert parse_cadence(None) is None
