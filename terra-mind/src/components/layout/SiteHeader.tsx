"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

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

        <div className="flex items-center gap-2 md:gap-2.5">
          <ThemeToggle />
          <LinkButton
            href="/enquire"
            size="sm"
            className="hidden h-9 bg-foreground px-5 text-background hover:bg-foreground/85 md:inline-flex"
          >
            Book a call
          </LinkButton>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-steel-line bg-panel text-foreground transition-colors hover:bg-secondary md:hidden"
          >
            {menuOpen ? <X className="size-5" strokeWidth={2} /> : <Menu className="size-5" strokeWidth={2} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-steel-line bg-background md:hidden"
          >
            <nav aria-label="Mobile primary" className="flex flex-col gap-1 px-4 pb-4 pt-2">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex h-12 items-center rounded-lg px-3 text-base font-medium transition-colors",
                      active
                        ? "bg-secondary text-foreground"
                        : "text-dim hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <LinkButton
                href="/enquire"
                onClick={() => setMenuOpen(false)}
                className="mt-2 h-12 w-full bg-foreground text-base text-background hover:bg-foreground/85"
              >
                Book a call
              </LinkButton>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
