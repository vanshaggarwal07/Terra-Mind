"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { WhatsAppButton } from "@/components/contact/ContactButtons";
import { isValidIndianPhone } from "@/components/forms/PriceAlertForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logActivity } from "@/lib/activity";
import { cn } from "@/lib/utils";

const CONTACT_PREFS = ["WhatsApp", "Call", "Email"] as const;
type ContactPref = (typeof CONTACT_PREFS)[number];

const BUDGET_BANDS = [
  "Under ₹50 lakh",
  "₹50 lakh to ₹1 crore",
  "₹1 to ₹2 crore",
  "Above ₹2 crore",
];

const PURPOSES = ["Investment", "End use", "Both"];

const VISIT_TIMINGS = [
  "This week",
  "Within two weeks",
  "This month",
  "Just exploring for now",
];

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
}

export function EnquireForm() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("property") ?? "";

  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [preference, setPreference] = useState<ContactPref>("WhatsApp");
  const [budget, setBudget] = useState(BUDGET_BANDS[1]);
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [visitTiming, setVisitTiming] = useState(VISIT_TIMINGS[2]);
  const [submittedParcel, setSubmittedParcel] = useState("");

  function validate(formData: FormData): FieldErrors {
    const next: FieldErrors = {};
    if (!String(formData.get("name") || "").trim()) {
      next.name = "Please tell us your name.";
    }
    const phone = String(formData.get("phone") || "");
    if (!isValidIndianPhone(phone)) {
      next.phone = "Enter a 10-digit Indian mobile number (e.g. 98765 43210).";
    }
    const email = String(formData.get("email") || "").trim();
    if (preference === "Email" && !email) {
      next.email = "Email is required when it is your preferred channel.";
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "That email address does not look right.";
    }
    return next;
  }

  async function onSubmit(formData: FormData) {
    const fieldErrors = validate(formData);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setPending(true);
    setStatus("idle");

    const parcel = String(formData.get("propertyId") || "");
    const brief = String(formData.get("message") || "");
    // New structured answers are appended into the existing message/meta
    // shape so the Activity sheet columns stay backwards compatible.
    const detailLines = [
      brief,
      `Preferred channel: ${preference}`,
      `Budget band: ${budget}`,
      `Purpose: ${purpose}`,
      `Site visit: ${visitTiming}`,
    ]
      .filter(Boolean)
      .join(" | ");

    const payload = {
      action: "enquire_submit" as const,
      propertyId: parcel,
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      message: detailLines,
      meta: { preference, budget, purpose, visitTiming },
    };

    try {
      const res = await fetch("/api/sheets-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("sync failed");
      setSubmittedParcel(parcel);
      setStatus("ok");
      await logActivity({
        action: "cta_click",
        propertyId: payload.propertyId,
        meta: { where: "enquire_success" },
      });
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  }

  if (status === "ok") {
    const followUp = submittedParcel
      ? `Hi, I just sent an enquiry about ${submittedParcel} on Terra-Mind. Can we talk now?`
      : "Hi, I just sent an enquiry on Terra-Mind. Can we talk now?";
    return (
      <div className="steel-frame mx-auto max-w-xl p-6 text-center md:p-8" role="status">
        <CheckCircle2 className="mx-auto size-10 text-growth" strokeWidth={1.75} />
        <h2 className="mt-4 font-display text-2xl text-foreground">
          Enquiry received.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-dim">
          We will confirm your call slot shortly. If you would rather not wait,
          continue straight on WhatsApp.
        </p>
        <WhatsAppButton
          message={followUp}
          where="enquire_success"
          propertyId={submittedParcel || undefined}
          className="mt-6 h-11 bg-signal px-6 text-background hover:bg-signal/90"
        >
          Continue on WhatsApp
        </WhatsAppButton>
      </div>
    );
  }

  const inputClass = "rounded-sm border-steel-line bg-background";

  return (
    <form action={onSubmit} noValidate className="steel-frame mx-auto max-w-xl space-y-5 p-5 md:p-7">
      <div>
        <p className="font-data text-[11px] uppercase tracking-[0.22em] text-signal">
          Enquire / book a call
        </p>
        <h1 className="mt-2 font-display text-3xl text-foreground">Corridor briefing</h1>
        <p className="mt-2 text-sm text-dim">
          Tell us which parcel you are evaluating and how you want to be
          reached. Every enquiry is logged in real time.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="propertyId" className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
          Parcel ID
        </Label>
        <Input
          id="propertyId"
          name="propertyId"
          defaultValue={propertyId}
          placeholder="YE-22D-014"
          className={cn(inputClass, "font-data")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
            Name
          </Label>
          <Input
            id="name"
            name="name"
            required
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={inputClass}
          />
          {errors.name && (
            <p id="name-error" className="text-xs text-destructive" role="alert">
              {errors.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
            Phone
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="+91 98765 43210"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className={cn(inputClass, "font-data")}
          />
          {errors.phone && (
            <p id="phone-error" className="text-xs text-destructive" role="alert">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
          Email{preference === "Email" ? "" : " (optional)"}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={cn(inputClass, "font-data")}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
          Preferred channel
        </legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Preferred contact channel">
          {CONTACT_PREFS.map((pref) => (
            <label
              key={pref}
              className={cn(
                "flex-1 cursor-pointer rounded-sm border px-3 py-2.5 text-center text-sm transition-colors",
                "focus-within:ring-3 focus-within:ring-ring/50",
                preference === pref
                  ? "border-signal bg-signal-tint text-signal"
                  : "border-steel-line bg-background text-dim hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="preference"
                value={pref}
                checked={preference === pref}
                onChange={() => setPreference(pref)}
                className="sr-only"
              />
              {pref}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
            Budget band
          </Label>
          <Select value={budget} onValueChange={(v) => setBudget(String(v ?? BUDGET_BANDS[1]))}>
            <SelectTrigger className="h-10 w-full rounded-sm border-steel-line bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-sm border-steel-line bg-panel">
              {BUDGET_BANDS.map((band) => (
                <SelectItem key={band} value={band}>
                  {band}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
            Purpose
          </Label>
          <Select value={purpose} onValueChange={(v) => setPurpose(String(v ?? PURPOSES[0]))}>
            <SelectTrigger className="h-10 w-full rounded-sm border-steel-line bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-sm border-steel-line bg-panel">
              {PURPOSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
          Site visit timing
        </Label>
        <Select value={visitTiming} onValueChange={(v) => setVisitTiming(String(v ?? VISIT_TIMINGS[2]))}>
          <SelectTrigger className="h-10 w-full rounded-sm border-steel-line bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-sm border-steel-line bg-panel">
            {VISIT_TIMINGS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
          Brief
        </Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Horizon, airport-distance preference, anything specific…"
          className={inputClass}
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-sm bg-signal text-background hover:bg-signal/90"
      >
        {pending ? "Transmitting…" : "Submit enquiry"}
      </Button>

      {status === "error" ? (
        <p className="font-data text-sm text-destructive" role="alert">
          Sync failed. Your details were not lost; please retry, or reach us
          directly on WhatsApp below.
        </p>
      ) : null}
    </form>
  );
}
