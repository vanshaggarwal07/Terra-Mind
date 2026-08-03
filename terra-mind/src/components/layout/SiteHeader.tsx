"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { LinkButton } from "@/components/shared/LinkButton";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/news", label: "News" },
  { href: "/calculator", label: "Calculator" },
  { href: "/enquire", label: "Enquire" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-steel-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="inline-flex size-8 items-center justify-center border border-steel font-data text-[10px] text-signal">
            TM
          </span>
          <span className="font-display text-sm tracking-[0.18em] text-foreground uppercase">
            Terra-Mind
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative font-data text-[11px] uppercase tracking-[0.2em] transition-colors",
                  active ? "text-signal" : "text-dim hover:text-foreground",
                )}
              >
                {item.label}
                {active ? (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 h-px w-full bg-signal"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <LinkButton
          href="/enquire"
          size="sm"
          className="bg-signal text-background hover:bg-signal/90"
        >
          Book a call
        </LinkButton>
      </div>
    </header>
  );
}
