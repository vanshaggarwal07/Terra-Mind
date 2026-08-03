"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logActivity } from "@/lib/activity";

export function EnquireForm() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("property") ?? "";
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setStatus("idle");
    const payload = {
      action: "enquire_submit" as const,
      propertyId: String(formData.get("propertyId") || ""),
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      message: String(formData.get("message") || ""),
    };

    try {
      const res = await fetch("/api/sheets-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("sync failed");
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

  return (
    <form action={onSubmit} className="steel-frame mx-auto max-w-xl space-y-5 p-5 md:p-7">
      <div>
        <p className="font-data text-[11px] uppercase tracking-[0.22em] text-signal">
          Enquire / book a call
        </p>
        <h1 className="mt-2 font-display text-3xl text-foreground">Corridor briefing</h1>
        <p className="mt-2 text-sm text-dim">
          Tell us which parcel you are evaluating. We log every enquiry to the Activity sheet
          in real time.
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
          className="rounded-sm border-steel-line bg-background font-data"
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
            className="rounded-sm border-steel-line bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
            Phone
          </Label>
          <Input
            id="phone"
            name="phone"
            required
            className="rounded-sm border-steel-line bg-background font-data"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-sm border-steel-line bg-background font-data"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
          Brief
        </Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Horizon, budget band, airport-distance preference…"
          className="rounded-sm border-steel-line bg-background"
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full rounded-sm bg-signal text-background hover:bg-signal/90"
      >
        {pending ? "Transmitting…" : "Submit enquiry"}
      </Button>

      {status === "ok" ? (
        <p className="font-data text-sm text-growth">Logged to Activity sheet. We will confirm the call slot.</p>
      ) : null}
      {status === "error" ? (
        <p className="font-data text-sm text-destructive">
          Sync failed. Check API credentials or retry — your form data was not discarded silently.
        </p>
      ) : null}
    </form>
  );
}
