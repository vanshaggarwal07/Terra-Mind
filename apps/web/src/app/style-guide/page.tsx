/**
 * /style-guide — visual QA for every design token and component.
 * Phase 0 Definition of Done: render all colors, type roles, and primitives.
 */
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Citation } from "@/components/trust/Citation";
import { ConfidenceBand } from "@/components/trust/ConfidenceBand";
import { Disclaimer } from "@/components/trust/Disclaimer";

const TOKENS = [
  { name: "ink",         hex: "#0A1A22", var: "--color-ink",         role: "Base surface" },
  { name: "ink-2",       hex: "#0F2530", var: "--color-ink-2",       role: "Elevated surface" },
  { name: "ink-3",       hex: "#142E3A", var: "--color-ink-3",       role: "Double-elevated" },
  { name: "cyan",        hex: "#6FB8C9", var: "--color-cyan",        role: "Contour / secondary" },
  { name: "brass",       hex: "#C89A4C", var: "--color-brass",       role: "Primary accent" },
  { name: "brass-light", hex: "#E4C481", var: "--color-brass-light", role: "Readout text" },
  { name: "parchment",   hex: "#F2ECDE", var: "--color-parchment",   role: "Light surface / text" },
  { name: "moss",        hex: "#7A9B76", var: "--color-moss",        role: "Semantic positive ONLY" },
  { name: "clay",        hex: "#B5623F", var: "--color-clay",        role: "Semantic risk ONLY" },
];

const MOCK_CITATION = {
  source_id: "yeida-dpr-2024",
  source_name: "YEIDA DPR 2024",
  source_document: "https://yeida.org",
  as_of: "2024-06-01T00:00:00Z",
};

export default function StyleGuide() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
      <div>
        <h1 className="font-display text-display-sm font-medium text-text-hi mb-2">
          Terra-Mind — Style Guide
        </h1>
        <p className="font-voice italic text-text-mid text-lg">
          Every token, type role, and trust component for visual QA.
        </p>
      </div>

      {/* ── Color tokens ─────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-low mb-6">
          01 — Color Tokens
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TOKENS.map((t) => (
            <div
              key={t.name}
              className="rounded-card overflow-hidden border border-white/10"
            >
              <div
                className="h-16"
                style={{ backgroundColor: t.hex }}
                aria-label={t.hex}
              />
              <div className="p-3 bg-ink-2">
                <div className="font-mono text-xs text-brass-light">{t.name}</div>
                <div className="font-mono text-[10px] text-text-low">{t.hex}</div>
                <div className="text-[10px] text-text-low mt-1">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Typography ───────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-low mb-6">
          02 — Typography
        </h2>
        <div className="space-y-6">
          <div>
            <div className="text-[10px] font-mono text-text-low mb-1">
              Space Grotesk / display · 56px
            </div>
            <p className="font-display text-display font-medium text-text-hi leading-none">
              See the property.
            </p>
          </div>
          <div>
            <div className="text-[10px] font-mono text-text-low mb-1">
              Fraunces / editorial voice · 22px italic
            </div>
            <p className="font-voice italic text-[22px] text-text-mid">
              Every locality&apos;s next ten years — sourced, cited, and never a bare number.
            </p>
          </div>
          <div>
            <div className="text-[10px] font-mono text-text-low mb-1">
              IBM Plex Mono / data instrument · 20px
            </div>
            <p className="font-mono text-data-lg text-brass-light tabular">
              +19% · Confidence 78% · ₹90L → ₹1.07Cr
            </p>
          </div>
        </div>
      </section>

      {/* ── Badges ───────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-low mb-6">
          03 — Badges
        </h2>
        <div className="flex flex-wrap gap-3">
          <Badge tone="default">Default</Badge>
          <Badge tone="good">Approved</Badge>
          <Badge tone="warn">Proposed</Badge>
          <Badge tone="bad">Delayed</Badge>
          <Badge tone="accent">Under Construction</Badge>
          <Badge tone="brass">Score 92</Badge>
        </div>
      </section>

      {/* ── Card ─────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-low mb-6">
          04 — Card Primitive
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Card with title">
            <p className="text-text-mid text-sm">
              This is body content inside a card. The border uses cyan/18 opacity
              and the background resolves from{" "}
              <code className="font-mono text-xs text-cyan">--color-ink</code>.
            </p>
          </Card>
          <Card title="Card with actions" actions={<Badge tone="brass">Live</Badge>}>
            <p className="text-text-mid text-sm">
              Cards can carry an actions slot — typically a badge or small button.
            </p>
          </Card>
        </div>
      </section>

      {/* ── Trust: Citation ──────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-low mb-6">
          05 — Trust: Citation
        </h2>
        <Card title="Citation component">
          <p className="text-sm text-text-mid mb-3">
            Every fact carries a citation. Example:
          </p>
          <Citation citation={MOCK_CITATION} />
          <div className="mt-3">
            <Citation citation={MOCK_CITATION} index={1} />
          </div>
        </Card>
      </section>

      {/* ── Trust: ConfidenceBand ────────────────────────────── */}
      <section>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-low mb-6">
          06 — Trust: ConfidenceBand
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card title="High confidence · 78%">
            <ConfidenceBand confidence={0.78} low={90_00000} high={1_07_00000} unit="₹" />
          </Card>
          <Card title="Medium confidence · 55%">
            <ConfidenceBand confidence={0.55} value={65} min={0} max={100} />
          </Card>
          <Card title="Low confidence · 28%">
            <ConfidenceBand confidence={0.28} value={40} min={0} max={100} unit="AQI" />
          </Card>
        </div>
      </section>

      {/* ── Trust: Disclaimer ────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-low mb-6">
          07 — Trust: Disclaimer
        </h2>
        <div className="space-y-3">
          <Disclaimer variant="prediction" />
          <Disclaimer variant="builder" />
          <Disclaimer variant="prediction">
            Custom disclaimer copy — this forecast uses 2024 input data and
            assumes no significant policy changes. Estimate only.
          </Disclaimer>
        </div>
      </section>

      {/* ── Chip / Tag ───────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-low mb-6">
          08 — Chips / Tags
        </h2>
        <div className="flex flex-wrap gap-2">
          {["Metro approved", "Airport 14km", "Expressway", "Film City", "IT Park"].map(
            (tag) => (
              <span
                key={tag}
                className="text-[11px] text-text-mid border border-white/[0.14] rounded-sm px-2 py-1"
              >
                {tag}
              </span>
            ),
          )}
        </div>
      </section>

      {/* ── Buttons ──────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-low mb-6">
          09 — Buttons
        </h2>
        <div className="flex flex-wrap gap-3 items-center">
          <button className="px-5 py-2.5 bg-brass text-ink font-display font-semibold text-sm rounded-sm transition-opacity hover:opacity-90 focus-brass">
            Primary CTA
          </button>
          <button className="px-5 py-2.5 border border-brass/50 text-brass-light font-display text-sm rounded-sm transition-all hover:bg-brass/10 focus-brass">
            Secondary
          </button>
          <button className="px-5 py-2.5 border border-cyan/30 text-cyan font-display text-sm rounded-sm transition-all hover:bg-cyan/10 focus-brass">
            Explorer
          </button>
        </div>
      </section>
    </main>
  );
}
