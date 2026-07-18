# twin-cv — Phase 4 Satellite Change-Detection

A semantic-segmentation model distinguishing {vegetation, bare_land,
built_structure}, run on T0 vs T-6mo Sentinel-2 tile pairs to flag **new built-up
area**. Output is a *pattern-based* signal (`source_tier="pattern_cv"`) — clearly
lower trust than official records — that feeds the knowledge graph and NEVER alone
flips a fact to verified or drives a builder verdict (blueprint §3.5, §0).

## Layout

```
cv/
├── tiles.py         # multi-band tile + affine geocoding + deterministic synthetic tiles
├── segmentation.py  # SegmentationModel interface + SklearnPixelSegmenter, IoU metrics
├── change.py        # segment pair -> diff -> confidence-scored ChangePolygons
├── labeling.py      # labeling workflow + synthetic dataset builder
├── training.py      # train + register segmenter, report IoU + change precision
├── signals.py       # ChangePolygon -> construction_detected (pattern_cv, always reviewed)
└── pipeline.py      # end-to-end batch: pairs -> change -> pattern signals
```

## Model choice

The default `SklearnPixelSegmenter` (per-pixel Random Forest over [R,G,B,NIR,NDVI])
is dependency-light so the whole pipeline trains/tests offline with real IoU +
change-detection precision. `SegmentationModel` is a Protocol — a **PyTorch
U-Net/DeepLab** implementing `fit/predict/predict_proba/save` is a drop-in for the
GPU-spot production path. Training is seeded/reproducible and checkpointed via the
shared model registry (resumable for spot batches).

The satellite fetcher (Sentinel-2 + Bhuvan fallback) lives in
`ingestion/crawlers/satellite_fetcher.py` (P4.3) and auto-schedules via Dagster on
the ~5-10 day revisit cadence.

## Usage

```bash
python -m cv.training     # train + register the segmenter; prints IoU + change precision
```

## Guarantees (tested)

- Model trains reproducibly and reports IoU + change-detection precision.
- Inference on a tile pair yields confidence-scored, geocoded change polygons.
- CV signals are ALWAYS unverified, tagged `pattern_cv`, and routed to human review.
