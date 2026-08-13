"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { LinkButton } from "@/components/shared/LinkButton";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface ParallaxSectionData {
  image: string;
  title: string;
  subtitle: string;
  label: string;
}

const DEFAULT_SECTIONS: ParallaxSectionData[] = [
  {
    image: "/heroes/parallax-expressway.jpg",
    label: "Expressway",
    title: "The corridor moves first",
    subtitle: "Infrastructure sets the clock. Listings catch up later.",
  },
  {
    image: "/heroes/parallax-airport.jpg",
    label: "Jewar",
    title: "Jewar resets the map",
    subtitle: "Distance to runway becomes the new measure of prime.",
  },
  {
    image: "/heroes/parallax-parcels.jpg",
    label: "Dossier",
    title: "Every plot has a dossier",
    subtitle: "Valuation, infra timeline, and ledger in one instrument.",
  },
];

/** Scroll distance per chapter transition (viewport heights). */
const SCROLL_PER_STEP = 100;

interface ParallaxSectionsProps {
  sections?: ParallaxSectionData[];
  className?: string;
}

export function ParallaxSections({
  sections = DEFAULT_SECTIONS,
  className,
}: ParallaxSectionsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);

  const steps = Math.max(sections.length - 1, 1);
  const trackHeightVh = 100 + steps * SCROLL_PER_STEP;

  useGSAP(
    () => {
      const root = rootRef.current;
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!root || !track || !stage) return;

      const panels = gsap.utils.toArray<HTMLElement>(
        stage.querySelectorAll("[data-panel]"),
      );
      const inners = gsap.utils.toArray<HTMLElement>(
        stage.querySelectorAll("[data-panel-inner]"),
      );
      const contents = gsap.utils.toArray<HTMLElement>(
        stage.querySelectorAll("[data-panel-content]"),
      );
      const bgs = gsap.utils.toArray<HTMLElement>(
        stage.querySelectorAll("[data-panel-bg]"),
      );
      const dots = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-progress-dot]"),
      );

      if (progressFillRef.current) {
        gsap.set(progressFillRef.current, { scaleY: 0, transformOrigin: "50% 0%" });
      }

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        panels.forEach((panel, i) => {
          gsap.set(panel, {
            yPercent: 0,
            autoAlpha: i === 0 ? 1 : 0,
            zIndex: i + 1,
          });
        });
        gsap.set(inners, { clearProps: "transform,opacity,filter" });
        gsap.set(contents, { clearProps: "all", autoAlpha: 1, y: 0 });
        gsap.set(bgs, { clearProps: "transform" });
        if (progressFillRef.current) {
          gsap.set(progressFillRef.current, { scaleY: 1 });
        }
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        panels.forEach((panel, i) => {
          gsap.set(panel, {
            zIndex: i + 1,
            yPercent: i === 0 ? 0 : 100,
            autoAlpha: 1,
          });
          gsap.set(inners[i], {
            scale: 1,
            opacity: 1,
            filter: "brightness(1)",
            transformOrigin: "50% 50%",
            force3D: true,
          });
          gsap.set(bgs[i], {
            scale: 1.08,
            transformOrigin: "50% 50%",
            force3D: true,
          });
          gsap.set(contents[i], {
            autoAlpha: i === 0 ? 1 : 0,
            y: i === 0 ? 0 : 28,
          });
        });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: track,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.75,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const active = Math.min(
                panels.length - 1,
                Math.round(self.progress * (panels.length - 1)),
              );
              dots.forEach((dot, i) => {
                dot.dataset.active = i === active ? "true" : "false";
              });
              if (progressFillRef.current) {
                gsap.set(progressFillRef.current, { scaleY: self.progress });
              }
            },
          },
        });

        // Hold / settle first chapter while user starts scrolling
        tl.to(bgs[0], { scale: 1, duration: 0.35 }, 0);

        for (let i = 1; i < panels.length; i += 1) {
          const at = i === 1 ? 0.35 : i - 0.65;

          tl.to(panels[i], { yPercent: 0, duration: 1, force3D: true }, at);

          tl.to(
            inners[i - 1],
            {
              scale: 0.92,
              opacity: 0.45,
              filter: "brightness(0.55)",
              duration: 1,
              force3D: true,
            },
            at,
          );

          tl.to(bgs[i], { scale: 1, duration: 1, force3D: true }, at);

          tl.to(contents[i - 1], { autoAlpha: 0, y: -16, duration: 0.28 }, at);

          tl.fromTo(
            contents[i],
            { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0, duration: 0.4 },
            at + 0.45,
          );
        }

        const refresh = () => {
          ScrollTrigger.refresh();
        };

        const images = Array.from(stage.querySelectorAll("img"));
        let pending = images.length;
        if (pending === 0) {
          refresh();
        } else {
          images.forEach((img) => {
            const done = () => {
              pending -= 1;
              if (pending <= 0) refresh();
            };
            if (img.complete) done();
            else {
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            }
          });
        }

        const onResize = () => refresh();
        window.addEventListener("resize", onResize);
        requestAnimationFrame(refresh);

        return () => {
          window.removeEventListener("resize", onResize);
        };
      });
    },
    { scope: rootRef, dependencies: [sections, trackHeightVh] },
  );

  return (
    <div ref={rootRef} className={cn("parallax-page relative isolate", className)}>
      <div
        ref={trackRef}
        className="relative w-full"
        style={{ height: `${trackHeightVh}dvh` }}
      >
        <div
          ref={stageRef}
          className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-background"
        >
          {sections.map((section, i) => (
            <article
              key={`${section.title}-${i}`}
              data-panel
              className="absolute inset-0 h-full w-full will-change-transform"
              aria-hidden={i === 0 ? undefined : true}
            >
              <div
                data-panel-inner
                className="relative h-full w-full overflow-hidden will-change-transform"
              >
                <div
                  data-panel-bg
                  className="absolute inset-0 h-full w-full will-change-transform"
                >
                  <Image
                    src={section.image}
                    alt={section.title}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover object-center"
                  />
                </div>

                <div
                  className="absolute inset-0 bg-[linear-gradient(105deg,rgba(8,12,16,0.9)_0%,rgba(8,12,16,0.42)_48%,rgba(8,12,16,0.78)_100%)]"
                  aria-hidden
                />
                <div
                  className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_35%,transparent_0%,rgba(8,12,16,0.5)_100%)]"
                  aria-hidden
                />
                <div
                  className="absolute inset-0 survey-hatch opacity-[0.12]"
                  aria-hidden
                />

                <div
                  data-panel-content
                  className="absolute inset-0 z-10 mx-auto flex w-full max-w-6xl flex-col justify-end px-4 pb-16 pt-24 md:px-6 md:pb-20"
                >
                  {i === 0 ? (
                    <div className="max-w-3xl">
                      <p className="font-display text-5xl leading-none tracking-tight text-foreground md:text-7xl lg:text-8xl">
                        Terra-Mind
                      </p>
                      <h2 className="mt-5 font-display text-2xl leading-[1.12] text-foreground md:text-4xl">
                        {section.title}
                      </h2>
                      <p className="mt-3 max-w-md text-base text-dim md:text-lg">
                        {section.subtitle}
                      </p>
                      <div className="mt-8 flex flex-wrap gap-3">
                        <LinkButton href="/explore">Browse parcels</LinkButton>
                        <LinkButton
                          href="/calculator"
                          variant="outline"
                          className="border-steel text-foreground"
                        >
                          Wealth calculator
                        </LinkButton>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-xl">
                      <p className="font-data text-[11px] uppercase tracking-[0.28em] text-signal">
                        {section.label}
                      </p>
                      <h2 className="mt-3 font-display text-3xl leading-[1.08] text-foreground md:text-5xl">
                        {section.title}
                      </h2>
                      <p className="mt-3 max-w-md text-sm text-dim md:text-base">
                        {section.subtitle}
                      </p>
                    </div>
                  )}

                  <div className="mt-10 flex items-center gap-3 font-data text-[11px] uppercase tracking-[0.2em] text-dim">
                    <span className="text-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="h-px w-8 bg-steel" aria-hidden />
                    <span>{String(sections.length).padStart(2, "0")}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {/* Side progress */}
          <div
            className="pointer-events-none absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 md:right-6 md:flex"
            aria-hidden
          >
            <div className="relative h-24 w-px overflow-hidden bg-steel/60">
              <div
                ref={progressFillRef}
                className="absolute inset-x-0 top-0 h-full origin-top scale-y-0 bg-signal will-change-transform"
              />
            </div>
            <div className="flex flex-col gap-2">
              {sections.map((_, i) => (
                <span
                  key={i}
                  data-progress-dot
                  data-active={i === 0 ? "true" : "false"}
                  className="block size-1.5 rounded-full bg-steel transition-[background-color,transform] duration-300 data-[active=true]:scale-125 data-[active=true]:bg-signal"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParallaxSections;
