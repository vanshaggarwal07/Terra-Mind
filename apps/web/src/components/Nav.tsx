"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/**
 * Instrument sticky nav — adapted from 21st Header 1 pattern
 * (sticky + scroll blur + mobile portal), restyled to Terra-Mind tokens.
 *
 * CTA intent lock: one path to Copilot ("Ask the copilot").
 * Explore + Localities are the only text links.
 */

const NAV_LINKS = [
  { href: "/", label: "Explore" },
  { href: "/localities", label: "Localities" },
] as const;

const CTA = { href: "/copilot", label: "Ask the copilot" } as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 8);
  });

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-nav w-full border-b transition-[background-color,border-color,backdrop-filter] duration-mid ease-out-expo",
        scrolled || open
          ? "border-line bg-ink/90 backdrop-blur-lg supports-[backdrop-filter]:bg-ink/70"
          : "border-transparent bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-nav max-w-content items-center justify-between px-ds-5 md:px-ds-7"
        aria-label="Main navigation"
      >
        {/* Wordmark */}
        <Link
          href="/"
          className="font-display text-[13px] font-semibold tracking-[0.16em] uppercase text-text-hi focus-brass"
          aria-label="Terra-Mind home"
        >
          TERRA<span className="text-brass">·</span>MIND
        </Link>

        {/* Desktop links + CTA */}
        <div className="hidden md:flex items-center gap-ds-6">
          <ul className="flex items-center gap-ds-5">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "relative text-[13px] transition-colors duration-fast ease-out-soft focus-brass",
                      active
                        ? "text-text-hi"
                        : "text-text-mid hover:text-text-hi",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -bottom-1 left-0 h-px w-full bg-brass transition-opacity duration-fast",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href={CTA.href}
            className={cn(
              "btn-primary focus-brass",
              isActive(pathname, CTA.href) && "ring-1 ring-brass-light/40",
            )}
          >
            {CTA.label}
          </Link>
        </div>

        {/* Mobile: menu toggle */}
        <button
          type="button"
          className={cn(
            "md:hidden inline-flex items-center justify-center",
            "h-9 w-9 rounded-surface border border-line-strong text-text-hi",
            "bg-ink-2/60 transition-[background-color,border-color,transform] duration-fast ease-out-soft",
            "hover:border-brass/40 hover:bg-brass-dim active:scale-[0.98] focus-brass",
          )}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <X size={18} weight="bold" aria-hidden="true" />
          ) : (
            <List size={18} weight="bold" aria-hidden="true" />
          )}
        </button>
      </nav>

      <MobileMenu open={open} onNavigate={() => setOpen(false)} pathname={pathname} />
    </header>
  );
}

function MobileMenu({
  open,
  onNavigate,
  pathname,
}: {
  open: boolean;
  onNavigate: () => void;
  pathname: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        "fixed inset-x-0 bottom-0 z-overlay md:hidden",
        "top-nav border-t border-line",
        "bg-ink/95 supports-[backdrop-filter]:bg-ink/85 backdrop-blur-lg",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
    >
      <div className="flex h-full flex-col justify-between px-ds-5 py-ds-6 animate-fade-up">
        <ul className="flex flex-col gap-ds-1">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-surface px-ds-3 py-ds-3 text-base transition-colors duration-fast focus-brass",
                    active
                      ? "bg-brass-dim text-text-hi"
                      : "text-text-mid hover:bg-ink-3 hover:text-text-hi",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href={CTA.href}
          onClick={onNavigate}
          className="btn-primary w-full focus-brass"
        >
          {CTA.label}
        </Link>
      </div>
    </div>,
    document.body,
  );
}
