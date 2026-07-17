import importlib

import common.config as config_module


def test_defaults_load(monkeypatch):
    monkeypatch.setattr(config_module, "get_settings", config_module.Settings)
    settings = config_module.Settings(_env_file=None)
    assert settings.environment == "local"
    assert settings.database_url.startswith("postgresql")
    assert settings.llm_embedding_dim == 1536


def test_env_override(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("LLM_EMBEDDING_DIM", "768")
    # Fresh instance (bypass the lru_cache) to observe the env.
    importlib.reload(config_module)
    settings = config_module.Settings(_env_file=None)
    assert settings.log_level == "DEBUG"
    assert settings.llm_embedding_dim == 768
