from ingestion.registry.seed_data import SEED_SOURCES
from warehouse.enums import SourceCategory
from warehouse.schemas import SourceCreate


def test_seed_has_all_blueprint_sources():
    # Blueprint §3.1 lists 17 sources.
    assert len(SEED_SOURCES) == 17


def test_seed_rows_validate_as_source_create():
    for row in SEED_SOURCES:
        model = SourceCreate(**row)
        assert isinstance(model.category, SourceCategory)
        assert model.crawler_key, f"{model.source_name} missing crawler_key"
        assert isinstance(model.config, dict)


def test_seed_names_are_unique():
    names = [r["source_name"] for r in SEED_SOURCES]
    assert len(names) == len(set(names))


def test_every_category_is_represented():
    categories = {r["category"] for r in SEED_SOURCES}
    # All 16 categories from the enum should appear at least once.
    assert categories == set(SourceCategory)


def test_social_source_is_off_by_default():
    x = next(r for r in SEED_SOURCES if r["crawler_key"] == "x_social")
    assert x["config"].get("enabled") is False
