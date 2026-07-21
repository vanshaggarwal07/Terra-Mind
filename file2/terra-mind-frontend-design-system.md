# Terra-Mind — Frontend Design System & UX Blueprint

## 0. Reference Analysis (what was actually studied)

Fetched and read six of the eight sites directly (`db-longbow.webflow.io` blocked automated access — noted, not guessed at).

| Site | What it's actually doing | What we borrow |
|---|---|---|
| coffee-tech.com | Product-first hero, spec-driven feature cards, dense testimonial proof wall | Proof density — real quotes/numbers build trust for a technical product |
| loftthirtyone.com | Full-bleed muted video loop, oversized line-broken headline, minimal expandable nav | Cinematic hero restraint — one big video/visual statement, not clutter |
| duoswynwood.com | Suite-type navigator strip, animated nav icons, dense legal/disclaimer footer | The **disclaimer-as-design-element** pattern — critical for a prediction product |
| luxury-places.ch | Numbered category carousel (01-04), property cards with price/sqm/room chips, favorites | Property card anatomy — price + specs + one-line hook, scannable at a glance |
| bymonolog.com | Big metric callouts ("$2M+ in enquiries"), numbered case-study pagination, FAQ accordion | The **bold-number-with-context** callout — exactly what a forecast score needs |
| elephant-skin.com | "Living data" — hover/filter a global stats dashboard in real time, numbered framework sections | Filterable live-data dashboard — the direct template for an infra-signal explorer |

None of these are "3D real estate sites" in the literal sense — they're **restraint-first, motion-disciplined marketing sites** that spend their one big visual risk in exactly one place (a video hero, a living dashboard, a scrubbing metric). That's the actual lesson, more than any specific visual trick, and it's what the plan below follows.

---

## 1. Design Brief (pinned)

- **Subject**: a geospatial future-intelligence platform — not a listings site. The product's entire differentiator is *time*: what a place becomes, not just what it costs today.
- **Audience**: serious buyers/investors in the Noida–Yamuna Expressway corridor, including NRI investors — sophisticated, financially literate, skeptical of hype, want proof before polish.
- **The hero's one job**: make "we predict the next 10 years of this place, and show our work" legible in the first 3 seconds — not "browse listings."

---

## 2. Token System

### 2.1 Color — "Cartographer's studio," not a proptech dashboard

Grounded in the actual subject matter: land surveying, blueprint drafting, brass instruments, deed paper — not a generic dark-SaaS palette.

| Name | Hex | Role |
|---|---|---|
| Ink Blueprint | `#0A1A22` | Base dark surface — a cyanotype-black, not pure black |
| Cyanotype | `#6FB8C9` | Contour lines, map strokes, secondary data accent |
| Survey Brass | `#C89A4C` | **Primary accent** — CTAs, score highlights, active states, the scrubber handle |
| Parchment | `#F2ECDE` | Light-mode surface / card paper — deed-paper warmth, not stark white |
| Moss Signal | `#7A9B76` | Semantic only — positive forecast / growth signal |
| Clay Flag | `#B5623F` | Semantic only — risk/caution flag (flood, delay, traffic). Never decorative. |

**Explicitly avoided**: cream-background-plus-terracotta-accent (the current AI-generated default) and near-black-plus-neon-green (the other default). Here the dark base is a desaturated blueprint teal-black, the primary accent is warm brass rather than terracotta or neon, and the two "loud" colors (moss, clay) are locked to semantic meaning only — they can never be used decoratively, which is also the same discipline the backend enforces for prediction confidence bands.

### 2.2 Typography — three roles, deliberately not the default serif-on-cream

| Role | Face | Use |
|---|---|---|
| Display / UI | Space Grotesk | Headlines, nav, buttons, card titles — technical, engineered character |
| Editorial voice | Fraunces | "Why invest" narrative copy, testimonials, copilot answers — a warm, slightly idiosyncratic serif that reads as considered advice, not marketing |
| Data / instrument | IBM Plex Mono | Prices, coordinates, confidence percentages, timestamps, RERA IDs — reads like a survey instrument readout |

Type scale: display 56/44/32px (desktop/tablet/mobile) at weight 500, body 16px/1.6, data-mono 14–20px depending on context (always tabular-nums).

### 2.3 Signature element — "The Timefold"

The one bold risk, per the "spend your boldness in one place" rule. On the home hero: a horizontal year scrubber (2026 → 2035) laid over a line-art topographic rendering of the corridor. Dragging the brass handle:

- densifies the contour lines under the cursor's year
- fades in small brass nodes at the real, sourced infra events for that year (metro, airport phase, school) — each labeled from actual data, never invented
- ticks a live headline number in mono type: `Projected value uplift +19% · confidence 78%`

This isn't decoration — it **is** the product thesis (a digital twin across time), made interactive in the first viewport, which no reference site does (they all use static hero video/image). Everything else on the page stays quiet around it.

---

## 3. Layout Concepts

### 3.1 Home

```
┌────────────────────────────────────────────────────────┐
│ TERRA-MIND        Explore  Localities  Copilot  Sign in │
│                                                          │
│   (faint ink-blueprint contour map, full bleed)          │
│    See the property.                                    │
│    See its next ten years.                              │
│                                                          │
│    2026 ●───────────────────○──────────── 2035          │
│    drag to fold time — infra nodes ignite as you go      │
│    Projected value uplift  +19%   Confidence 78%         │
└────────────────────────────────────────────────────────┘
                        ↓ scroll
┌────────────────────────────────────────────────────────┐
│  Upcoming in the corridor                     see all → │
│  [tilt card] [tilt card] [tilt card] [tilt card]  →scroll│
└────────────────────────────────────────────────────────┘
```

### 3.2 Locality / Project Detail — the "why invest" page

```
┌───────────────────┬──────────────────────────────────────┐
│ [sticky]           │ Sector 22D, Yamuna Expressway          │
│ map / satellite     │ Future Intelligence Score  92          │
│ toggle              │                                        │
│                     │ 01 — Metro                             │
│                     │ Approved · 2030 · source: YEIDA DPR     │
│                     │ 02 — Airport                            │
│                     │ Operational phase 1 · source: NIA        │
│                     │ 03 — Price forecast                       │
│                     │ ₹90L → ₹1.07Cr  band 1.02–1.14Cr           │
│                     │ Confidence 78% · estimate, not advice      │
│                     │ 04 — Builder record (RERA, facts only)      │
│                     │ Ask the copilot about this locality →        │
└───────────────────┴──────────────────────────────────────┘
```

The `01 / 02 / 03` numbering here is earned, not decorative — it's the real chronological signal sequence the score is built from, which is exactly the case the frontend-design principle allows.

### 3.3 Explorer (map)

Full-screen Deck.gl/Mapbox canvas, a floating pill filter bar (locality, price band, infra type — modeled on luxury-places.ch's category chips), and a living-data corner panel (modeled on Elephant Skin's hover-to-explore dashboard) showing aggregate stats for whatever's in view: avg. score, count of approved infra, count of flagged risk.

---

## 4. Motion System

- **Page load**: contour lines draw themselves in via stroke animation, staggered ~40ms apart — one orchestrated moment, not scattered.
- **Scroll reveals**: numbered signal sections on the detail page fade/slide up as they enter viewport (IntersectionObserver-driven).
- **Hover**: project cards tilt subtly toward the cursor (CSS 3D perspective transform, ±6deg max — restrained, not gimmicky) and lift 4px.
- **Smooth scroll**: Lenis, tuned to a light touch — this is a financial-decision product, not an art portfolio; scroll should feel responsive, not viscous.
- **Reduced motion**: every animation above has a static fallback behind `prefers-reduced-motion: reduce` — the scrubber still works via click/keyboard, just without the ignite/densify animation.

---

## 5. Component Inventory → API Surface

Every component maps to a real backend endpoint from the existing system — nothing here is speculative UI without data behind it.

| Component | Backend source | Notes |
|---|---|---|
| Timefold hero scrubber | `/facts` (locality timeline, corridor-wide) | Aggregate, not per-property |
| Project/locality tilt card | `/facts`, `/score` | Score badge + one-line hook |
| ForecastCard (price/traffic/flood/water/AQI) | `/predictions/{type}` | **Must** render the confidence band + disclaimer — never a bare number, matching the existing ML guardrails |
| Future Intelligence Score gauge | `/score` | Rule-based envelope, banded |
| Proximity chips (metro/airport/school) | `/proximity` | Icon + distance + status |
| Builder record card | `/builders` | RERA facts only — **no trust verdict rendered, ever** |
| Copilot chat panel | `/copilot` (streaming) | Grounded answers with inline `Citation` component |
| Construction signal markers | `/signals` | Always tagged "pattern-detected, unverified" in the UI, never presented as confirmed fact |
| Simulation panel | `/simulate` | What-if sliders, diffs baseline vs scenario |
| Trust components (`Citation`, `ConfidenceBand`, `Disclaimer`) | cross-cutting | Reused everywhere a prediction or builder fact appears — this is non-negotiable, not a nice-to-have |

---

## 6. Accessibility & Performance Guardrails

This is a financial-decision product for a corridor that includes real mobile-network variability — the aesthetics cannot come at the cost of trust or usability:

- Lighthouse performance ≥ 90 on the locality detail page on mid-tier mobile throttling; LCP < 2.5s, CLS < 0.1.
- Every animated/3D element has a static, correct fallback — no content is animation-only.
- Numbers (prices, scores, confidence) stay in high-contrast mono type regardless of motion state — legibility of the actual data always wins over the visual effect around it.
- Full keyboard operability, visible focus rings in brass, and the Timefold scrubber operable via arrow keys.
- `prefers-reduced-motion` respected everywhere per Section 4.
- Contrast: brass-on-ink and cyanotype-on-ink both verified at WCAG AA for body text sizes; decorative-only contrast can go lower.

---

## 7. Implementation Stack

- **Framework**: Next.js (already the stack in `apps/web`)
- **Styling**: Tailwind, configured with the Section 2 tokens as custom theme values (not default Tailwind palette)
- **Motion**: Framer Motion for component-level transitions, GSAP + ScrollTrigger for the scroll-reveal sequences, Lenis for smooth scroll
- **3D/interactive hero**: CSS 3D transforms + SVG/Canvas for the Timefold scrubber — this does not need WebGL/Three.js; save that complexity budget for if/when a true 3D locality model viewer is justified later
- **Base components**: shadcn/ui primitives, restyled to the token system, not left at default Tailwind look
- **Charts**: existing `ForecastCard` chart library, restyled with the token palette, band always visible
