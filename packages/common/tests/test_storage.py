"""Storage tests.

The integration test round-trips an object against a live S3-compatible
endpoint (MinIO). It is skipped automatically when no endpoint is reachable so
the suite stays green in CI without infra.
"""

import pytest


def _storage_ready() -> bool:
    """True only if a real S3-compatible endpoint answers an API call.

    A bare TCP connect is not enough (proxies may accept the socket), so we
    attempt an actual bucket operation and skip on any failure.
    """
    try:
        from common import storage

        storage.ensure_bucket()
        return True
    except Exception:  # noqa: BLE001
        return False


requires_storage = pytest.mark.skipif(
    not _storage_ready(), reason="object storage endpoint not reachable"
)


@requires_storage
def test_storage_roundtrip():
    from common import storage

    key = "test/roundtrip.txt"
    storage.put_object(key, b"hello", content_type="text/plain")
    assert storage.exists(key) is True
    assert storage.get_object(key) == b"hello"
    latest = storage.latest_by_prefix("test/")
    assert latest is not None and latest.key == key


@requires_storage
def test_missing_key_reports_absent():
    from common import storage

    assert storage.exists("definitely/not/here.bin") is False
