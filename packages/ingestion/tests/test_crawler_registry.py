import pytest

import ingestion.crawlers  # noqa: F401  (registers crawlers)
from ingestion.crawlers.base import BaseCrawler, crawler_keys, get_crawler, is_registered


def test_core_crawlers_registered():
    keys = set(crawler_keys())
    expected = {"yeida", "dmrc", "rera", "nhai", "ncrtc", "tender", "datagov", "cpcb", "news"}
    assert expected <= keys


def test_get_crawler_returns_instance():
    crawler = get_crawler("yeida")
    assert isinstance(crawler, BaseCrawler)
    assert crawler.crawler_key == "yeida"


def test_unknown_key_raises():
    assert not is_registered("does_not_exist")
    with pytest.raises(KeyError):
        get_crawler("does_not_exist")
