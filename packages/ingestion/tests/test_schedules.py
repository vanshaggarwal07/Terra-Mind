from types import SimpleNamespace

from ingestion.orchestrator.schedules import build_ingestion_plan, cadence_to_cron


def test_cadence_to_cron():
    assert cadence_to_cron("daily") == "0 3 * * *"
    assert cadence_to_cron("weekly") == "0 3 * * 1"
    assert cadence_to_cron("monthly") == "0 3 1 * *"
    assert cadence_to_cron(None) == "0 3 * * 1"
    assert cadence_to_cron("nonsense") == "0 3 * * 1"


def _src(id, active=True, key="yeida", cadence="weekly"):
    return SimpleNamespace(
        id=id, source_name=id, is_active=active, crawler_key=key, refresh_cadence=cadence
    )


def test_plan_excludes_inactive_and_missing_and_unregistered():
    sources = [
        _src("a", active=True, key="yeida"),
        _src("b", active=False, key="dmrc"),  # inactive
        _src("c", active=True, key=None),  # no crawler
        _src("d", active=True, key="satellite"),  # not registered in this set
    ]
    plan = build_ingestion_plan(sources, registered_keys={"yeida", "dmrc"})
    ids = {e.source_id for e in plan}
    assert ids == {"a"}


def test_plan_without_filter_includes_all_active_with_keys():
    sources = [_src("a"), _src("b", key="dmrc")]
    plan = build_ingestion_plan(sources)
    assert {e.source_id for e in plan} == {"a", "b"}
    assert all(e.cron for e in plan)
