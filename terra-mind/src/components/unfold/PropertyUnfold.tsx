"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { LinkButton } from "@/components/shared/LinkButton";
import { formatRate } from "@/lib/listings";
import type { PropertyListing } from "@/lib/types";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STAGES = [
  { id: "cover", label: "Cover" },
  { id: "valuation", label: "Valuation" },
  { id: "infra", label: "Infra" },
  { id: "tx", label: "Ledger" },
  { id: "enquire", label: "Enquire" },
] as const;

interface PropertyUnfoldProps {
  property: PropertyListing;
  index?: number;
  scrollLength?: string;
  className?: string;
}

export function PropertyUnfold({
  property,
  index = 0,
  scrollLength = "320%",
  className,
}: PropertyUnfoldProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeStage, setActiveStage] = useState(0);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      // The pinned 3D unfold only makes sense once the stage has room to
      // breathe (tablet/desktop). On narrow screens the same five stages
      // render as a normal, non-pinned stacked card (see JSX below), so
      // mobile is left out of this timeline entirely rather than pinning
      // scroll for a cramped, unreadable animation.
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          desktopMotion: "(prefers-reduced-motion: no-preference) and (min-width: 768px)",
        },
        (context) => {
          const { reduceMotion, desktopMotion } = context.conditions ?? {};

          if (reduceMotion) {
            gsap.set(root.querySelectorAll("[data-panel]"), {
              clearProps: "all",
              autoAlpha: 1,
              rotationX: 0,
              rotationY: 0,
              scale: 1,
            });
            gsap.set(root.querySelector("[data-cover]"), { autoAlpha: 0, scale: 0.9 });
            setActiveStage(4);
            return;
          }

          if (!desktopMotion) return;

          const cover = root.querySelector("[data-cover]");
          const top = root.querySelector('[data-panel="top"]');
          const bottom = root.querySelector('[data-panel="bottom"]');
          const left = root.querySelector('[data-panel="left"]');
          const right = root.querySelector('[data-panel="right"]');
          const stage = root.querySelector("[data-stage]");

          gsap.set(stage, { transformPerspective: 1400 });
          gsap.set([top, bottom, left, right], { transformOrigin: "center center" });
          gsap.set(top, { rotationX: 0, transformOrigin: "top center" });
          gsap.set(bottom, { rotationX: 0, transformOrigin: "bottom center" });
          gsap.set(left, { rotationY: 0, transformOrigin: "left center" });
          gsap.set(right, { rotationY: 0, transformOrigin: "right center" });

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: `+=${scrollLength}`,
              pin: true,
              scrub: 0.65,
              anticipatePin: 1,
              refreshPriority: -index,
              onUpdate: (self) => {
                const p = self.progress;
                if (p < 0.18) setActiveStage(0);
                else if (p < 0.38) setActiveStage(1);
                else if (p < 0.58) setActiveStage(2);
                else if (p < 0.78) setActiveStage(3);
                else setActiveStage(4);
              },
            },
          });

          tl.to(cover, { autoAlpha: 0, scale: 0.82, y: -24, duration: 0.18 }, 0)
            .to(top, { rotationX: -102, autoAlpha: 1, duration: 0.22 }, 0.12)
            .to(bottom, { rotationX: 102, autoAlpha: 1, duration: 0.22 }, 0.22)
            .to(left, { rotationY: 98, autoAlpha: 1, duration: 0.22 }, 0.34)
            .to(right, { rotationY: -98, autoAlpha: 1, duration: 0.22 }, 0.46)
            .to({}, { duration: 0.2 });

          return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [property.id, index, scrollLength] },
  );

  return (
    <section
      ref={rootRef}
      className={cn("relative z-10", className)}
      aria-label={`Parcel unfold ${property.parcelId}`}
    >
      {/* Tablet / desktop — pinned 3D instrument unfold, scroll-scrubbed */}
      <div className="relative hidden h-svh items-center justify-center overflow-hidden px-4 md:flex md:px-8">
        <div
          className="pointer-events-none absolute inset-0 survey-hatch opacity-40"
          aria-hidden
        />

        <ol className="absolute right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3 md:right-8">
          {STAGES.map((stage, i) => (
            <li key={stage.id} className="flex items-center justify-end gap-2">
              <span
                className={cn(
                  "font-data text-[10px] uppercase tracking-[0.18em]",
                  i === activeStage ? "text-signal" : "text-dim",
                )}
              >
                {stage.label}
              </span>
              <span
                className={cn(
                  "block size-2 rounded-full border transition-colors",
                  i === activeStage
                    ? "border-signal bg-signal signal-glow"
                    : i < activeStage
                      ? "border-growth bg-growth/70"
                      : "border-steel bg-transparent",
                )}
                aria-current={i === activeStage ? "step" : undefined}
              />
            </li>
          ))}
        </ol>

        <div
          data-stage
          className="perspective-stage relative mx-auto h-[min(72vh,640px)] w-full max-w-3xl preserve-3d"
        >
          <div className="relative h-full w-full preserve-3d">
            {/* Core instrument face */}
            <div className="steel-frame absolute inset-[18%] z-10 flex flex-col justify-between p-5 md:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-data text-[10px] uppercase tracking-[0.22em] text-dim">
                    Parcel / core
                  </p>
                  <h3 className="mt-2 font-display text-xl text-foreground md:text-2xl">
                    {property.name}
                  </h3>
                </div>
                <p className="font-data text-xs text-signal">{property.parcelId}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-steel-line pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Spot rate</p>
                  <p className="mt-1 font-data text-lg text-foreground md:text-xl">
                    {formatRate(property.pricePerSqYd)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Uplift band</p>
                  <p className="mt-1 font-data text-lg text-growth md:text-xl">
                    +{property.growthPct.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-data text-[11px] text-dim">
                  {property.lat.toFixed(4)}° N · {property.lng.toFixed(4)}° E
                </p>
                <LinkButton
                  href={`/property/${property.id}`}
                  size="sm"
                  className="bg-signal text-background hover:bg-signal/90"
                >
                  Open dossier
                </LinkButton>
              </div>
            </div>

            {/* Cover */}
            <div
              data-cover
              className="steel-frame absolute inset-[12%] z-20 flex flex-col items-center justify-center gap-3 bg-panel/95 p-6 text-center"
            >
              <p className="font-data text-[11px] uppercase tracking-[0.28em] text-signal">
                Survey cover
              </p>
              <p className="font-display text-3xl text-foreground md:text-4xl">
                {property.parcelId}
              </p>
              <p className="max-w-sm text-sm text-dim">{property.location}</p>
              <p className="font-data text-[10px] uppercase tracking-[0.2em] text-steel">
                Scroll to unfold instrument panels
              </p>
            </div>

            {/* Top — Live Valuation */}
            <div
              data-panel="top"
              className="steel-frame absolute inset-x-[18%] top-[4%] z-[9] h-[16%] overflow-hidden bg-panel/95 px-4 py-3 backface-hidden opacity-90"
            >
              <p className="font-data text-[10px] uppercase tracking-[0.2em] text-signal">
                01 · Live valuation
              </p>
              <p className="mt-1 font-data text-sm text-foreground md:text-base">
                {formatRate(property.pricePerSqYd)} · conf{" "}
                <span className="text-growth">{property.confidencePct}%</span>
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-dim">{property.valuationNote}</p>
            </div>

            {/* Bottom — Infra Timeline */}
            <div
              data-panel="bottom"
              className="steel-frame absolute inset-x-[18%] bottom-[4%] z-[9] h-[16%] overflow-hidden bg-panel/95 px-4 py-3 backface-hidden opacity-90"
            >
              <p className="font-data text-[10px] uppercase tracking-[0.2em] text-signal">
                02 · Infrastructure timeline
              </p>
              <ul className="mt-1 space-y-0.5">
                {property.infraTimeline.slice(0, 2).map((item) => (
                  <li key={`${item.year}-${item.event}`} className="font-data text-[11px] text-foreground">
                    <span className="text-growth">{item.year}</span> — {item.event}
                  </li>
                ))}
              </ul>
            </div>

            {/* Left — Transactions */}
            <div
              data-panel="left"
              className="steel-frame absolute inset-y-[22%] left-[3%] z-[9] w-[16%] overflow-hidden bg-panel/95 p-3 backface-hidden opacity-90"
            >
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-signal">
                03 · Tx
              </p>
              <ul className="mt-2 space-y-1">
                {property.transactions.slice(0, 3).map((tx) => (
                  <li key={tx.date} className="font-data text-[10px] text-foreground">
                    {tx.date}
                    <br />
                    <span className="text-dim">{formatRate(tx.rate)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — Enquire */}
            <div
              data-panel="right"
              className="steel-frame absolute inset-y-[22%] right-[3%] z-[9] flex w-[16%] flex-col justify-between overflow-hidden bg-panel/95 p-3 backface-hidden opacity-90"
            >
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-signal">
                04 · Enquire
              </p>
              <p className="text-[11px] text-dim">Book a corridor briefing for this parcel.</p>
              <LinkButton
                href={`/enquire?property=${property.id}`}
                size="sm"
                className="bg-signal px-2 text-background hover:bg-signal/90"
              >
                Book call
              </LinkButton>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile — same five stages, presented as a normal-flow stacked card (no pin, no 3D) */}
      <div className="steel-frame relative mx-4 my-3 overflow-hidden rounded-3xl px-4 py-6 md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.22em] text-dim">
              Parcel / core
            </p>
            <h3 className="mt-2 font-display text-xl text-foreground">{property.name}</h3>
            <p className="mt-1 text-sm text-dim">{property.location}</p>
          </div>
          <p className="font-data text-xs text-signal">{property.parcelId}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-steel-line pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Spot rate</p>
            <p className="mt-1 font-data text-lg text-foreground">
              {formatRate(property.pricePerSqYd)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Uplift band</p>
            <p className="mt-1 font-data text-lg text-growth">+{property.growthPct.toFixed(1)}%</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-steel-line bg-background/60 p-4">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-signal">
              01 · Live valuation
            </p>
            <p className="mt-1 font-data text-sm text-foreground">
              {formatRate(property.pricePerSqYd)} · conf{" "}
              <span className="text-growth">{property.confidencePct}%</span>
            </p>
            <p className="mt-1 text-xs text-dim">{property.valuationNote}</p>
          </div>

          <div className="rounded-2xl border border-steel-line bg-background/60 p-4">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-signal">
              02 · Infrastructure timeline
            </p>
            <ul className="mt-1 space-y-0.5">
              {property.infraTimeline.slice(0, 2).map((item) => (
                <li key={`${item.year}-${item.event}`} className="font-data text-[11px] text-foreground">
                  <span className="text-growth">{item.year}</span> — {item.event}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-steel-line bg-background/60 p-4">
            <p className="font-data text-[10px] uppercase tracking-[0.16em] text-signal">
              03 · Recent transactions
            </p>
            <ul className="mt-2 space-y-1.5">
              {property.transactions.slice(0, 3).map((tx) => (
                <li
                  key={tx.date}
                  className="flex items-center justify-between gap-3 font-data text-[11px] text-foreground"
                >
                  <span>{tx.date}</span>
                  <span className="text-dim">{formatRate(tx.rate)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-steel-line pt-4">
          <p className="font-data text-[10px] text-dim">
            {property.lat.toFixed(4)}° N · {property.lng.toFixed(4)}° E
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <LinkButton
            href={`/property/${property.id}`}
            className="h-11 w-full bg-signal text-background hover:bg-signal/90"
          >
            Open dossier
          </LinkButton>
          <LinkButton
            href={`/enquire?property=${property.id}`}
            variant="outline"
            className="h-11 w-full border-steel-line text-foreground hover:bg-secondary"
          >
            Book call
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
