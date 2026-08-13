"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Indian mobile: optional +91 / 91 prefix, then 10 digits starting 6-9. */
export function isValidIndianPhone(raw: string): boolean {
  const digits = raw.replace(/[\s-]/g, "");
  return /^(\+?91)?[6-9]\d{9}$/.test(digits);
}

interface PriceAlertFormProps {
  /** Surface identifier stored with the lead, e.g. "home_band". */
  where: string;
  propertyId?: string;
  className?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Single-field lead capture: phone number in, price updates out.
 * Posts through the existing /api/sheets-sync Activity pipe.
 */
export function PriceAlertForm({ where, propertyId, className }: PriceAlertFormProps) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidIndianPhone(phone)) {
      setValidationError("Enter a 10-digit Indian mobile number.");
      return;
    }
    setValidationError(null);
    setStatus("submitting");
    try {
      const res = await fetch("/api/sheets-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lead_capture",
          phone: phone.trim(),
          propertyId,
          message: "Price alert signup",
          meta: { where },
        }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-growth/30 bg-growth-tint p-4",
          className,
        )}
        role="status"
      >
        <CheckCircle2 className="size-5 shrink-0 text-growth" strokeWidth={2} />
        <p className="text-sm text-foreground">
          You&apos;re on the list. We&apos;ll message when corridor rates move.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-1.5">
          <Label
            htmlFor={`price-alert-${where}`}
            className="font-data text-[10px] uppercase tracking-[0.18em] text-dim"
          >
            Mobile number
          </Label>
          <Input
            id={`price-alert-${where}`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (validationError) setValidationError(null);
            }}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? `price-alert-${where}-error` : undefined}
            className="h-11 rounded-full border-steel-line bg-background px-4"
          />
          {validationError && (
            <p
              id={`price-alert-${where}-error`}
              className="text-xs text-destructive"
              role="alert"
            >
              {validationError}
            </p>
          )}
          {status === "error" && !validationError && (
            <p className="text-xs text-destructive" role="alert">
              Could not save right now. Please try again in a moment.
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={status === "submitting"}
          className="h-11 shrink-0 rounded-full bg-signal px-6 text-background hover:bg-signal/90 sm:mt-[26px]"
        >
          {status === "submitting" ? "Saving…" : "Get price updates"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-dim">
        Rate movements for this corridor only. No spam, opt out any time.
      </p>
    </form>
  );
}

/** Home-page band wrapper around the form — a natural section, not a popup. */
export function PriceAlertBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
      <div className="steel-frame grid gap-8 rounded-[2.5rem] p-6 md:grid-cols-[1fr_1fr] md:items-center md:p-12">
        <div>
          <h2 className="font-display text-2xl leading-tight text-foreground md:text-3xl">
            Know when corridor rates move.
          </h2>
          <p className="mt-3 max-w-md text-sm text-dim">
            One message when tracked parcels re-price, sourced from the same
            ledgers shown on this site.
          </p>
        </div>
        <PriceAlertForm where="home_band" />
      </div>
    </section>
  );
}
