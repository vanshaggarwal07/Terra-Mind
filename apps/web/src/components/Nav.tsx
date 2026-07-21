"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "/",            label: "Explore" },
  { href: "/localities",  label: "Localities" },
  { href: "/copilot",     label: "Copilot" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="relative z-30 flex items-center justify-between px-6 md:px-12 py-6"
      aria-label="Main navigation"
    >
      {/* Wordmark */}
      <Link
        href="/"
        className="font-display text-sm font-semibold tracking-[0.14em] uppercase text-text-hi focus-brass"
        aria-label="Terra-Mind home"
      >
        TERRA<span className="text-brass">·</span>MIND
      </Link>

      {/* Links */}
      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm transition-colors focus-brass",
              pathname === link.href
                ? "text-text-hi"
                : "text-text-mid hover:text-text-hi",
            )}
          >
            {link.label}
          </Link>
        ))}

        {/* Primary CTA */}
        <Link
          href="/copilot"
          className={cn(
            "text-[13px] text-brass-light border border-brass/50 rounded-sm px-4 py-2",
            "transition-all hover:bg-brass/10 hover:border-brass focus-brass",
          )}
        >
          Ask the copilot
        </Link>
      </div>

      {/* Mobile: just the CTA */}
      <div className="md:hidden">
        <Link
          href="/copilot"
          className="text-[13px] text-brass-light border border-brass/50 rounded-sm px-3 py-1.5 focus-brass"
        >
          Copilot
        </Link>
      </div>
    </nav>
  );
}
