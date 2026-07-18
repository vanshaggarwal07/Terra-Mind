# twin-ml — Phase 3 Prediction / ML Engine

Trustworthy forecasts for the corridor (price, traffic, flood, water, AQI). Every
model emits the **same standard envelope** as the Phase-2 rule score, ships advisory
numbers as a **confidence band (never a bare number)**, and derives its
`contributing_factors` from **real feature importances** so the copilot's "why" can
never drift from the number (blueprint §5, §6, §13).

> Hard rule (§5): the LLM never produces the numbers. They come from the tabular /
> time-series / hydrological models here; the LLM only *explains* them.

## Layout

```
ml/
├── envelope.py          # banded / insufficient / unavailable envelope builders (P3.2)
├── registry.py          # versioned model registry: save/load by version (P3.2)
├── features/            # point-in-time feature store + dataset cards (P3.1)
│   ├── base.py          #   FeatureSet, DatasetCard, no-leakage assertion
│   ├── synthetic.py     #   deterministic corridor panel (clearly synthetic=True)
│   └── builders.py      #   per-domain feature builders
├── models/              # price (XGBoost), traffic, flood, water, aqi (P3.3-P3.7)
│   └── base.py          #   time-split, calibrated bands, importance-derived factors
├── training/train.py    # train + register every model (P3.1-P3.7)
├── serving.py           # load-by-version + predict (P3.8 support)
└── monitoring/          # guards (P3.8/P3.10), backtest, drift (PSI)
```

## Data honesty (§1, §5)

Blueprint §1/§5 warn against shipping ML on thin data. Until Phases 1–2 accumulate
enough live history, models train on a **deterministic, clearly-labelled synthetic**
corridor panel (`synthetic=True` on every dataset card + model metadata). The
traffic model's **data-sufficiency gate** refuses to forecast on < 18 months of
history, returning an explicit *insufficient-data* envelope rather than a misleading
number. When live data lands, the same builders/models retrain unchanged.

## Usage

```bash
python -m ml.training.train                 # train all, register latest versions
python -m ml.training.train --as-of 2026-06-01 --materialize
```

Serving is wired into the API at `/predictions/{price,traffic,flood,water,aqi}`,
with band + disclaimer enforced at the boundary (`ml.monitoring.guards`).

## Guarantees enforced in tests

- No advisory prediction is ever a bare number (band + disclaimer required).
- Flood confidence is capped at 0.6 (conservative — high liability).
- 10yr+ horizons are directional (a range, never a falsely-precise point).
- Point-in-time correctness: no training row uses future data.
- The copilot can quote a served band but never state a divergent number.
