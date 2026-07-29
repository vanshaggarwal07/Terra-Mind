/**
 * /style-guide — visual QA for every design token and primitive.
 * Phase 1: cartographer / instrument system.
 */
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Citation } from "@/components/trust/Citation";
import { ConfidenceBand } from "@/components/trust/ConfidenceBand";
import { Disclaimer } from "@/components/trust/Disclaimer";

const SURFACES = [
  { name: "ink",   hex: "#0A1A22", role: "Base surface" },
  { name: "ink-2", hex: "#0F2530", role: "Elevated surface" },
  { name: "ink-3", hex: "#142E3A", role: "Double-elevated" },
  { name: "ink-4", hex: "#1A3A48", role: "Hover / active panel" },
];

const ACCENT = [
  { name: "brass",       hex: "#C89A4C", role: "ONLY brand accent (CTAs, focus, key metrics)" },
  { name: "brass-light", hex: "#E4C481", role: "Readout / hover lift" },
];

const STRUCTURAL = [
  { name: "contour", hex: "#6FB8C9", role: "Map strokes / structural only - not CTA" },
];

const SEMANTIC = [
  { name: "moss", hex: "#7A9B76", role: "Positive status ONLY" },
  { name: "clay", hex: "#B5623F", role: "Risk / caution ONLY" },
];

const TEXT = [
  { name: "text-hi",    hex: "#F2ECDE", role: "Primary text / parchment" },
  { name: "text-mid",   hex: "72%",     role: "Secondary body" },
  { name: "text-low",   hex: "46%",     role: "Meta / labels" },
  { name: "text-faint", hex: "28%",     role: "Disabled / hairline labels" },
];

const SPACING = [
  { token: "1", px: 4 },
  { token: "2", px: 8 },
  { token: "3", px: 12 },
  { token: "4", px: 16 },
  { token: "5", px: 24 },
  { token: "6", px: 32 },
  { token: "7", px: 48 },
  { token: "8", px: 64 },
  { token: "9", px: 96 },
];

const RADII = [
  { name: "control", value: "2px",  use: "Inputs, small chips" },
  { name: "surface", value: "3px",  use: "Cards, panels, buttons" },
  { name: "pill",    value: "999px", use: "Scrubber thumb only" },
];

const MOCK_CITATION = {
  source_id: "yeida-dpr-2024",
  source_name: "YEIDA DPR 2024",
  source_document: "https://yeida.org",
  as_of: "2024-06-01T00:00:00Z",
};

function Swatch({
  name,
  hex,
  role,
  cssVar,
}: {
  name: string;
  hex: string;
  role: string;
  cssVar?: string;
}) {
  const bg = cssVar ? `var(${cssVar})` : hex.endsWith("%") ? undefined : hex;
  return (
    <div className="rounded-surface overflow-hidden border border-line-strong">
      <div
        className="h-16"
        style={
          bg
            ? { backgroundColor: bg }
            : {
                background:
                  "linear-gradient(90deg, transparent, var(--color-parchment))",
                opacity: Number(hex.replace("%", "")) / 100,
              }
        }
        aria-label={hex}
      />
      <div className="p-3 bg-ink-2">
        <div className="font-mono text-xs text-brass-light">{name}</div>
        <div className="font-mono text-[10px] text-text-low">{hex}</div>
        <div className="text-[10px] text-text-low mt-1">{role}</div>
      </div>
    </div>
  );
}

export default function StyleGuide() {
  return (
    <main className="max-w-content mx-auto px-ds-5 md:px-ds-7 py-ds-8 space-y-ds-9">
      <header className="max-w-2xl">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-brass mb-ds-3">
          Design system
        </p>
        <h1 className="font-display text-display-sm font-medium text-text-hi mb-ds-3">
          Terra-Mind tokens
        </h1>
        <p className="font-display text-text-mid text-body max-w-[65ch]">
          Cold cartographer / instrument console. One accent (brass). Contour cyan
          is map structure only. Space Grotesk + IBM Plex Mono. Sharp 3px surfaces.
        </p>
      </header>

      {/* Surfaces */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Surfaces
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-ds-3">
          {SURFACES.map((t) => (
            <Swatch key={t.name} {...t} cssVar={`--color-${t.name}`} />
          ))}
        </div>
      </section>

      {/* Accent lock */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Accent lock (one)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-ds-3">
          {ACCENT.map((t) => (
            <Swatch key={t.name} {...t} cssVar={`--color-${t.name}`} />
          ))}
          {STRUCTURAL.map((t) => (
            <Swatch key={t.name} {...t} cssVar={`--color-${t.name}`} />
          ))}
        </div>
      </section>

      {/* Semantic + text */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Semantic status + text
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-ds-3 mb-ds-3">
          {SEMANTIC.map((t) => (
            <Swatch key={t.name} {...t} cssVar={`--color-${t.name}`} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-ds-3">
          {TEXT.map((t) => (
            <div
              key={t.name}
              className="rounded-surface border border-line-strong p-ds-3 bg-ink-2"
            >
              <div className="font-mono text-xs text-brass-light mb-ds-2">{t.name}</div>
              <div
                className={
                  t.name === "text-hi"
                    ? "text-text-hi text-sm"
                    : t.name === "text-mid"
                      ? "text-text-mid text-sm"
                      : t.name === "text-low"
                        ? "text-text-low text-sm"
                        : "text-text-faint text-sm"
                }
              >
                Sample readout
              </div>
              <div className="text-[10px] text-text-low mt-ds-2">{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Typography
        </h2>
        <div className="space-y-ds-6 border border-line-strong rounded-surface p-ds-5 bg-ink-2">
          <div>
            <div className="text-[10px] font-mono text-text-low mb-1">
              Space Grotesk / display · clamp to 56px
            </div>
            <p className="font-display text-display font-medium text-text-hi leading-[1.1] pb-1">
              See the property.
            </p>
          </div>
          <div>
            <div className="text-[10px] font-mono text-text-low mb-1">
              Space Grotesk italic / emphasis (same family - Fraunces removed)
            </div>
            <p className="font-display italic text-[22px] text-text-mid leading-[1.2] pb-1">
              Every locality&apos;s next ten years - sourced, cited, never a bare number.
            </p>
          </div>
          <div>
            <div className="text-[10px] font-mono text-text-low mb-1">
              IBM Plex Mono / data instrument
            </div>
            <p className="font-mono text-data-lg text-brass-light tabular">
              +19% · Confidence 78% · ₹90L → ₹1.07Cr
            </p>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Spacing scale (use ds-* utilities)
        </h2>
        <div className="space-y-ds-2">
          {SPACING.map((s) => (
            <div key={s.token} className="flex items-center gap-ds-4">
              <span className="font-mono text-[11px] text-text-low w-20 shrink-0">
                ds-{s.token}
              </span>
              <span className="font-mono text-[11px] text-text-faint w-10 shrink-0">
                {s.px}px
              </span>
              <div
                className="h-3 bg-brass/40 rounded-control"
                style={{ width: s.px }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Radius */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Radius system
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-ds-3">
          {RADII.map((r) => (
            <div
              key={r.name}
              className="border border-line-strong bg-ink-2 p-ds-5"
              style={{ borderRadius: r.value }}
            >
              <div className="font-mono text-xs text-brass-light">
                rounded-{r.name === "surface" ? "surface / card" : r.name}
              </div>
              <div className="font-mono text-[10px] text-text-low mt-1">{r.value}</div>
              <div className="text-[11px] text-text-mid mt-ds-2">{r.use}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Buttons (brass only)
        </h2>
        <div className="flex flex-wrap gap-ds-3 items-center">
          <button type="button" className="btn-primary focus-brass">
            Ask the copilot
          </button>
          <button type="button" className="btn-secondary focus-brass">
            See localities
          </button>
          <button
            type="button"
            className="btn-primary focus-brass opacity-40 cursor-not-allowed"
            disabled
          >
            Disabled
          </button>
        </div>
        <p className="text-[11px] text-text-low mt-ds-3 max-w-[65ch]">
          Contour cyan is never used on buttons. Ghost/secondary stays brass-bordered.
        </p>
      </section>

      {/* Badges */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Badges
        </h2>
        <div className="flex flex-wrap gap-ds-3">
          <Badge tone="default">Default</Badge>
          <Badge tone="good">Approved</Badge>
          <Badge tone="warn">Proposed</Badge>
          <Badge tone="bad">Delayed</Badge>
          <Badge tone="accent">Under Construction</Badge>
          <Badge tone="brass">Score 92</Badge>
        </div>
      </section>

      {/* Card */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Card primitive
        </h2>
        <div className="grid md:grid-cols-2 gap-ds-4">
          <Card title="Card with title">
            <p className="text-text-mid text-sm">
              Border uses structural contour at low opacity. Accent brass appears only
              on hover/focus or key metrics.
            </p>
          </Card>
          <Card title="Card with actions" actions={<Badge tone="brass">Live</Badge>}>
            <p className="text-text-mid text-sm">
              Actions slot for a badge or compact control. Radius: surface (3px).
            </p>
          </Card>
        </div>
      </section>

      {/* Trust */}
      <section>
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-4">
          Trust components
        </h2>
        <div className="space-y-ds-4">
          <Card title="Citation">
            <Citation citation={MOCK_CITATION} />
          </Card>
          <div className="grid md:grid-cols-3 gap-ds-4">
            <Card title="High · 78%">
              <ConfidenceBand confidence={0.78} low={90_00000} high={1_07_00000} unit="₹" />
            </Card>
            <Card title="Medium · 55%">
              <ConfidenceBand confidence={0.55} value={65} min={0} max={100} />
            </Card>
            <Card title="Low · 28%">
              <ConfidenceBand confidence={0.28} value={40} min={0} max={100} unit="AQI" />
            </Card>
          </div>
          <Disclaimer variant="prediction" />
        </div>
      </section>

      {/* Motion notes */}
      <section className="border border-line-strong rounded-surface p-ds-5 bg-ink-2">
        <h2 className="font-display text-sm font-medium text-text-hi mb-ds-3">
          Motion tokens (wired for Phase 3+)
        </h2>
        <ul className="font-mono text-[11px] text-text-mid space-y-ds-2">
          <li>--ease-out-expo · cubic-bezier(0.16, 1, 0.3, 1)</li>
          <li>--duration-fast 150ms · --duration-mid 300ms · --duration-slow 600ms</li>
          <li>Animate transform + opacity only. Honor prefers-reduced-motion.</li>
          <li>z: base 0 · raised 10 · sticky 30 · nav 40 · overlay 50 · modal 60 · toast 70</li>
        </ul>
      </section>
    </main>
  );
}
