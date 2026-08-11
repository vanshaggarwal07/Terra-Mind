"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { LinkButton } from "@/components/shared/LinkButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-foreground font-display text-[13px] text-background">
            T
          </span>
          <span className="font-display text-base tracking-tight text-foreground">
            Terra-Mind
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full border border-steel-line bg-panel/70 p-1 md:flex"
          aria-label="Primary"
        >
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-dim hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-secondary"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                ) : null}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <LinkButton
            href="/enquire"
            size="sm"
            className="bg-foreground px-5 text-background hover:bg-foreground/85"
          >
            Book a call
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
