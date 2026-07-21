# Terra-Mind — Frontend Design System

## Color Tokens — "Cartographer's Studio"
| Name | Hex | Role |
|---|---|---|
| Ink Blueprint | `#0A1A22` | Base dark surface |
| Ink-2 | `#0F2530` | Elevated surface |
| Cyanotype | `#6FB8C9` | Contour lines, secondary accent |
| Survey Brass | `#C89A4C` | Primary accent — CTAs, score highlights |
| Brass Light | `#E4C481` | Lighter brass for readouts |
| Parchment | `#F2ECDE` | Light surface, foreground text on dark |
| Moss Signal | `#7A9B76` | Semantic positive only |
| Clay Flag | `#B5623F` | Semantic risk/caution only |

## Typography
- Display/UI: Space Grotesk — headlines, nav, buttons
- Editorial: Fraunces — narrative copy, copilot answers
- Data/Instrument: IBM Plex Mono — prices, scores, timestamps

## Motion
- Page load: contour lines draw via stroke animation
- Scroll reveals: IntersectionObserver staggered fade/slide-up
- Hover: card tilt ±6deg CSS 3D
- prefers-reduced-motion: all motion disabled, content still operable

## Component → API Mapping
| Component | Endpoint |
|---|---|
| TimefoldScrubber | /facts (timeline) |
| ProjectCard | /facts, /score |
| ForecastCard | /predictions/{type} |
| ScoreGauge | /score |
| ProximityChips | /proximity |
| BuilderCard | /builders |
| CopilotPanel | /copilot |
| ConstructionSignals | /signals |
| SimulationPanel | /simulate |
| Citation, ConfidenceBand, Disclaimer | cross-cutting trust |

## Trust Rules (non-negotiable)
1. Never render a prediction without ConfidenceBand + Disclaimer in same view
2. Never render a builder trust verdict — RERA facts + Citation only
3. Construction signals always labeled "pattern-detected, unverified"
4. Simulated results visually distinct from live predictions
