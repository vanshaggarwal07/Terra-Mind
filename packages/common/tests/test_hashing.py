from common.hashing import content_hash, short_hash


def test_content_hash_is_stable_and_hex():
    h1 = content_hash(b"hello world")
    h2 = content_hash("hello world")
    assert h1 == h2
    assert len(h1) == 64
    assert int(h1, 16) >= 0  # valid hex


def test_content_hash_differs_on_change():
    assert content_hash(b"a") != content_hash(b"b")


def test_short_hash_length():
    assert len(short_hash(b"x", length=12)) == 12
