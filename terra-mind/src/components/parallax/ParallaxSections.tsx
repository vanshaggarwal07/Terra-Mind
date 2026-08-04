"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface ParallaxSectionData {
  image: string;
  title: string;
  subtitle: string;
}

const DEFAULT_SECTIONS: ParallaxSectionData[] = [
  {
    image: "/heroes/parallax-expressway.jpg",
    title: "The corridor moves first",
    subtitle: "Infrastructure sets the clock. Listings catch up later.",
  },
  {
    image: "/heroes/parallax-airport.jpg",
    title: "Jewar resets the map",
    subtitle: "Distance to runway becomes the new measure of prime.",
  },
  {
    image: "/heroes/parallax-parcels.jpg",
    title: "Every plot has a dossier",
    subtitle: "Valuation, infra timeline, and ledger in one instrument.",
  },
];

interface ParallaxSectionProps extends ParallaxSectionData {
  priority?: boolean;
}

function ParallaxSection({
  image,
  title,
  subtitle,
  priority = false,
}: ParallaxSectionProps) {
  return (
    <section
      data-parallax-section
      className="parallax-section relative flex min-h-[100dvh] items-center justify-center overflow-hidden"
    >
      <div
        data-parallax-bg
        className="parallax-bg absolute inset-x-0 -top-[18%] bottom-[-18%] will-change-transform"
      >
        <Image
          src={image}
          alt={title}
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <div
        className="parallax-overlay absolute inset-0 bg-[linear-gradient(120deg,rgba(10,14,18,0.78)_0%,rgba(10,14,18,0.42)_48%,rgba(10,14,18,0.82)_100%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 survey-hatch opacity-20"
        aria-hidden
      />

      <div
        data-parallax-content
        className="parallax-content relative z-10 mx-auto max-w-3xl px-4 text-center md:px-6"
      >
        <h2 className="parallax-title font-display text-4xl leading-[1.08] text-foreground md:text-6xl">
          {title}
        </h2>
        <p className="parallax-subtitle mx-auto mt-4 max-w-xl text-base text-dim md:text-lg">
          {subtitle}
        </p>
      </div>
    </section>
  );
}

interface ParallaxSectionsProps {
  sections?: ParallaxSectionData[];
  className?: string;
}

export function ParallaxSections({
  sections = DEFAULT_SECTIONS,
  className,
}: ParallaxSectionsProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(root.querySelectorAll("[data-parallax-bg]"), { clearProps: "transform" });
        gsap.set(root.querySelectorAll("[data-parallax-content]"), {
          clearProps: "all",
          autoAlpha: 1,
          y: 0,
        });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const panels = gsap.utils.toArray<HTMLElement>(
          root.querySelectorAll("[data-parallax-section]"),
        );

        panels.forEach((section, index) => {
          const bg = section.querySelector<HTMLElement>("[data-parallax-bg]");
          const content = section.querySelector<HTMLElement>(
            "[data-parallax-content]",
          );

          if (bg) {
            gsap.fromTo(
              bg,
              { yPercent: -14 },
              {
                yPercent: 14,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          }

          if (content) {
            if (index === 0) {
              gsap.set(content, { autoAlpha: 1, y: 0 });
            } else {
              gsap.fromTo(
                content,
                { autoAlpha: 0, y: 36 },
                {
                  autoAlpha: 1,
                  y: 0,
                  ease: "power2.out",
                  scrollTrigger: {
                    trigger: section,
                    start: "top 72%",
                    end: "top 28%",
                    scrub: 0.6,
                  },
                },
              );
            }
          }
        });
      });
    },
    { scope: rootRef, dependencies: [sections] },
  );

  return (
    <div ref={rootRef} className={cn("parallax-page relative", className)}>
      {sections.map((section, i) => (
        <ParallaxSection
          key={`${section.title}-${i}`}
          priority={i === 0}
          {...section}
        />
      ))}
    </div>
  );
}

export default ParallaxSections;
