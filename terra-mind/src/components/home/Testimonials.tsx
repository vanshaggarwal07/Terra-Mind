"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const QUOTES = [
  {
    quote:
      "The valuation confidence band changed how I negotiate. I walked into every deal knowing the real range, not the broker's number.",
    name: "Ritika Sharma",
    role: "First-time land buyer, Sector 22D",
    initials: "RS",
    featured: false,
  },
  {
    quote:
      "I tracked three parcels near the airport node for four months. The infrastructure timeline told me exactly when to move.",
    name: "Arjun Mehta",
    role: "Corridor investor, Jewar",
    initials: "AM",
    featured: true,
  },
  {
    quote:
      "Moved capital from Gurugram to the expressway corridor without a single site visit. The timeline data did the convincing.",
    name: "Devika Rao",
    role: "Portfolio investor, Delhi NCR",
    initials: "DR",
    featured: false,
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-steel-line bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-medium text-signal">What investors say</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-foreground md:text-4xl">
            Real parcels, real decisions.
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {QUOTES.map((item, i) => (
            <motion.figure
              key={item.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={cn(
                "flex flex-col rounded-3xl border p-6",
                item.featured
                  ? "border-foreground/10 bg-foreground text-background md:-translate-y-2"
                  : "border-steel-line bg-panel",
              )}
            >
              <blockquote
                className={cn(
                  "text-[15px] leading-relaxed",
                  item.featured ? "text-background/90" : "text-foreground",
                )}
              >
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    item.featured ? "bg-background/15 text-background" : "bg-secondary text-foreground",
                  )}
                >
                  {item.initials}
                </span>
                <div>
                  <p className={cn("text-sm font-medium", item.featured ? "text-background" : "text-foreground")}>
                    {item.name}
                  </p>
                  <p className={cn("text-[13px]", item.featured ? "text-background/70" : "text-dim")}>
                    {item.role}
                  </p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
