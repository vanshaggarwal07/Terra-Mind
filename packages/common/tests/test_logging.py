from common.logging import bind_correlation_id, get_correlation_id, get_logger


def test_logger_emits(capsys):
    log = get_logger("test")
    log.info("hello", foo="bar")
    out = capsys.readouterr().out
    assert "hello" in out
    assert "foo" in out


def test_correlation_id_roundtrip():
    bind_correlation_id("abc-123")
    assert get_correlation_id() == "abc-123"
