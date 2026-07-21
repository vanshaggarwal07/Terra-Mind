# Terra-Mind Frontend — Loop Engineering Prompt Playbook

How to use this: each phase below is a self-contained prompt for an agentic coding tool (Claude Code, working in your existing monorepo). This is "loop engineering" in the same sense your backend phases were built — each prompt has a **Goal**, **Context**, **Deliverables**, **Constraints**, and a **Definition of Done** the agent checks itself against before reporting the phase complete. If any DoD item fails, the agent iterates within that phase before moving on. You review and gate between phases; you don't hand-hold within them.

**Before Phase 0**: save `terra-mind-frontend-design-system.md` into your repo at `docs/frontend-design-system.md`. Every phase prompt below references it instead of re-explaining the design system each time — keep it as the single source of truth and update it if the direction evolves.

---

## Kickoff — persona prompt (paste once at session start)

```
You are the lead frontend engineer on Terra-Mind, an existing production monorepo
(apps/web = Next.js, packages/api = FastAPI backend already live with routers for
facts, score, proximity, builders, copilot, predictions, simulate, signals,
admin_sources, review, metrics, ops).

Read docs/frontend-design-system.md now and treat it as binding spec — the color
tokens, type system, motion rules, component-to-endpoint mapping, and accessibility/
performance guardrails in that file are not suggestions, they are the contract.

Two rules override everything else, carried over from the backend's own compliance
layer:
1. Never render a prediction number without its confidence band and disclaimer
   visible in the same view (ConfidenceBand + Disclaimer components).
2. Never render a builder trust verdict — only cited RERA facts (Citation component).

Work in small, reviewable commits. After each phase, run the Definition of Done
checklist yourself before telling me it's done, and list what you checked.
```

---

## Phase 0 — Design system foundation

```
GOAL
Stand up the design token system and base component library in apps/web so every
later phase builds on real tokens, not ad hoc Tailwind defaults.

CONTEXT
apps/web already exists (Next.js). No custom design tokens are wired in yet.

DELIVERABLES
1. tailwind.config with the Section 2 tokens from docs/frontend-design-system.md
   as named theme colors (ink, ink-2, cyan, brass, brass-light, parchment, moss,
   clay) — not left as Tailwind's default palette.
2. Font loading for Space Grotesk (display), Fraunces (editorial voice), IBM Plex
   Mono (data) via next/font, mapped to CSS variables --font-display/--font-voice/
   --font-mono.
3. Base primitives restyled from shadcn/ui defaults to the token system: Button,
   Card, Badge, Tabs, Chip/Tag — these already exist per the backend doc's "shared
   UI kit," restyle rather than rebuild from scratch.
4. Shared trust components as real, reusable components (not per-page copies):
   <Citation source={} />, <ConfidenceBand low={} mid={} high={} />,
   <Disclaimer variant="prediction" | "builder" />.
5. A /style-guide route rendering every token and component for visual QA.

CONSTRAINTS
- Do not touch page content/routing yet — this phase is tokens and primitives only.
- Every color must resolve from a CSS variable, never a hardcoded hex in a component.

DEFINITION OF DONE
- [ ] /style-guide renders all colors, type roles, and primitives correctly
- [ ] No hardcoded hex values outside the tailwind.config token definitions
- [ ] Citation/ConfidenceBand/Disclaimer components exist and are documented with
      one usage example each
- [ ] Lighthouse on /style-guide: no console errors, fonts load without layout shift
```

---

## Phase 1 — Core layout, navigation, home page (static)

```
GOAL
Build the home page structure and global layout wired to real data, with no motion
yet — motion is Phase 2. This phase proves the data plumbing works before we spend
effort on animation.

CONTEXT
Backend endpoints /facts, /score, /proximity are live. Design reference:
docs/frontend-design-system.md Section 3.1 (home wireframe) and Section 5
(component → API mapping).

DELIVERABLES
1. Global nav (wordmark, Explore/Localities/Copilot links, primary CTA) per the
   design system's layout.
2. Home hero section: headline, subhead, and a static (non-interactive yet) year
   scrubber UI shell — real markup and styling, interactivity comes in Phase 2.
3. "Upcoming in the corridor" project card rail, populated from real /facts +
   /score data for at least 8 localities — no hardcoded/mock card content.
4. Project card component: locality name, region, score badge, price-today,
   proximity tag chips — matches Section 3.1/5 exactly.
5. Footer with the disclaimer line from the design system's footer pattern.

CONSTRAINTS
- No animation libraries yet (Framer Motion/GSAP/Lenis land in Phase 2).
- Card data must come from the real API — if a locality is missing a field, show
  an honest empty state, don't fabricate a placeholder number.

DEFINITION OF DONE
- [ ] Home page renders real backend data, verified against at least 3 known
      localities in the seed data
- [ ] No console errors, no layout shift on load
- [ ] Responsive at 375px, 768px, 1440px
- [ ] Keyboard tab order is logical through nav → hero → card rail
```

---

## Phase 2 — Motion & the Timefold signature interaction

```
GOAL
Add the motion system and the Timefold scrubber interaction from
docs/frontend-design-system.md Section 2.3 and Section 4 — this is the one
deliberate visual risk in the whole product; execute it precisely rather than
adding motion everywhere.

CONTEXT
A working vanilla-JS prototype of the Timefold interaction exists at
terra-mind-hero-prototype.html (attached/provided separately) — port its
behavior (scrubber → contour density crossfade → node ignition → live uplift/
confidence readout), not its literal markup, into a proper React component
backed by real /facts data instead of the hardcoded year lookup tables in the
prototype.

DELIVERABLES
1. Install and configure Lenis (smooth scroll) and GSAP + ScrollTrigger.
2. <TimefoldScrubber /> component: drag/click/keyboard-operable year control,
   contour SVG background that densifies with position, infra nodes that ignite
   at their real approved year (sourced from /facts), live uplift% and
   confidence% readout sourced from /predictions/price for the aggregate
   corridor view.
3. Scroll-triggered reveal on the project card rail (staggered fade/slide-up).
4. Hover tilt on project cards (CSS 3D transform, max ±6deg, per the design
   system's restraint note).
5. prefers-reduced-motion handling: scrubber remains fully operable, contour
   ignite/densify and card tilt are disabled, reveals become instant opacity
   swaps.

CONSTRAINTS
- The Timefold's uplift/confidence numbers must come from real prediction data,
  not the prototype's placeholder lookup table — if per-year aggregate
  predictions aren't available yet from the backend, use the nearest real
  locality-level prediction and label it clearly rather than inventing corridor
  averages.
- No other page gets a comparable "big" animation — keep the signature
  concentrated here per the design system.

DEFINITION OF DONE
- [ ] Scrubber operable by mouse, touch, and keyboard (arrow keys)
- [ ] All displayed numbers during scrubbing trace to real backend data or are
      explicitly labeled as illustrative
- [ ] prefers-reduced-motion verified in devtools: scrubber still functions,
      decorative motion is off
- [ ] No jank on mid-tier mobile (test with CPU throttling in devtools)
```

---

## Phase 3 — Locality detail page ("why invest")

```
GOAL
Build the full locality/project detail page — this is the core product
experience the person is buying: score, signals, forecast, builder facts,
copilot, all in one trustworthy view.

CONTEXT
Endpoints live: /facts (timeline), /score, /proximity, /predictions/{price,
traffic,flood,water,aqi}, /builders, /copilot (streaming). Design reference:
docs/frontend-design-system.md Section 3.2.

DELIVERABLES
1. Two-column layout: sticky map/satellite toggle (left), scrolling numbered
   signal sections (right) — numbering is earned here (real chronological
   signal order), not decorative.
2. Signal sections per locality, each sourced live: metro/airport/expressway
   proximity (from /proximity), approved infra timeline (from /facts),
   ForecastCard per prediction type (from /predictions/*) — every ForecastCard
   renders ConfidenceBand + Disclaimer, no exceptions.
3. Builder record card (from /builders) — RERA facts only, Citation component
   for every claim, no numeric or descriptive "trust score" anywhere in the
   markup or copy.
4. Embedded copilot panel scoped to the current locality (streaming from
   /copilot), answers render with inline Citation components.
5. Construction signal markers (from /signals) visually distinct and labeled
   "pattern-detected, unverified" — never styled to look as confirmed as an
   official /facts entry.

CONSTRAINTS
- Every prediction render must pass through the same ConfidenceBand/Disclaimer
  components built in Phase 0 — do not let this page invent a "cleaner" inline
  version that skips the disclaimer for visual reasons.
- Builder section: run an explicit self-check for any word implying judgment
  ("reliable," "trusted," "risky") and remove it — facts only.

DEFINITION OF DONE
- [ ] Every number on the page traces to a cited source or a labeled prediction
      with confidence band
- [ ] Builder section contains zero evaluative language — grep for "trust,"
      "reliable," "risk score" and confirm none appear as UI copy
- [ ] Copilot panel streams correctly and every factual claim in its answers
      carries a citation
- [ ] Page passes the Phase 0 style-guide's component contract (no ad hoc
      styling reinventing existing primitives)
```

---

## Phase 4 — Explorer / map + simulation panel

```
GOAL
Build the full-corridor map explorer and the what-if simulation panel.

CONTEXT
Endpoints: /facts, /score, /signals for map layers; /simulate for what-if
recompute. Design reference: docs/frontend-design-system.md Section 3.3.

DELIVERABLES
1. Full-screen Deck.gl/Mapbox map with locality markers colored/sized by score,
   satellite and contour-blueprint style toggle.
2. Floating filter pill bar (locality type, price band, infra type).
3. Living-data corner panel: aggregate stats for whatever's in the current map
   viewport (avg score, approved infra count, flagged risk count) — updates on
   pan/zoom.
4. Simulation panel: sliders for the same what-if parameters the backend
   /simulate endpoint accepts (e.g. metro delay, new expressway), diffing
   baseline vs scenario score/prediction, rendered with the same ForecastCard/
   ConfidenceBand components — a simulated result must be visually distinct
   from a live prediction (e.g. dashed band) so it's never mistaken for a real
   forecast.

CONSTRAINTS
- Map performance: viewport-based data fetching, not "load every locality in
  the corridor on mount."
- Simulated results are clearly labeled as hypothetical in both visual style
  and copy.

DEFINITION OF DONE
- [ ] Map interaction stays smooth (no dropped frames) with the full corridor's
      locality count loaded
- [ ] Filter bar correctly narrows both map markers and the living-data panel
- [ ] Simulated vs live predictions are visually distinguishable at a glance
- [ ] Simulation panel never writes to the database (matches the backend's
      in-memory sandbox design — confirm no unexpected POSTs beyond /simulate)
```

---

## Phase 5 — Accessibility, performance, responsive QA

```
GOAL
Harden everything built in Phases 1-4 against the guardrails in
docs/frontend-design-system.md Section 6, before this ships to real users
making real financial decisions.

DELIVERABLES
1. Full keyboard-navigation pass across home, locality detail, explorer, and
   copilot — every interactive element reachable and operable, visible focus
   rings in brass per the token system.
2. Screen reader pass (VoiceOver or NVDA) on the locality detail page
   specifically — confirm ConfidenceBand and Disclaimer content is actually
   announced, not just visually present.
3. Performance budget enforcement: Lighthouse ≥ 90 performance on locality
   detail under mid-tier mobile throttling, LCP < 2.5s, CLS < 0.1. Optimize
   images (satellite/map tiles especially), lazy-load below-the-fold rail
   content, code-split the map/Deck.gl bundle so it's not in the home page's
   initial JS payload.
4. Responsive QA at 375/768/1024/1440px on every page built so far.
5. prefers-reduced-motion re-verification across all four pages, not just the
   Timefold scrubber.

DEFINITION OF DONE
- [ ] Lighthouse scores recorded and attached for home + locality detail
- [ ] Keyboard-only walkthrough completes a full "explore → detail → ask
      copilot" flow with no dead ends
- [ ] Screen reader confirms confidence bands and disclaimers are announced
- [ ] No layout breakage at any of the four breakpoints tested
```

---

## Phase 6 — Visual regression + CI/CD integration

```
GOAL
Wire frontend quality gates into the existing CD pipeline
(.github/workflows/cd.yml) so future changes can't silently regress the design
system or the trust-component guarantees.

DELIVERABLES
1. Playwright visual regression snapshots for home, locality detail, and
   explorer at the three core breakpoints.
2. A CI check that greps built component output for evaluative builder
   language (mirrors the backend's existing "no builder verdicts" compliance
   guard, extended to the frontend).
3. A CI check that fails the build if any ForecastCard renders without an
   adjacent ConfidenceBand/Disclaimer in the DOM output.
4. Lighthouse CI budget gate on the locality detail page matching Phase 5's
   numbers, wired into the existing dev → manual approval → prod flow.

DEFINITION OF DONE
- [ ] CI fails correctly when a test PR intentionally removes a Disclaimer
      (verify the gate actually catches it, don't just assume the check works)
- [ ] Visual regression baseline committed and documented for how to update it
      intentionally
- [ ] Lighthouse CI gate visible in the same PR check list as the existing
      backend gates
```
