"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Phone, WhatsappLogo } from "@phosphor-icons/react";

import { logActivity } from "@/lib/activity";
import { generalEnquiryMessage, telUrl, whatsappUrl } from "@/lib/contact";
import { cn } from "@/lib/utils";

/**
 * Floating WhatsApp + call dock, mounted once in the root layout.
 * Hidden on /enquire (already a contact page) and on mobile property pages,
 * where the sticky PropertyActionBar owns the bottom edge instead.
 */
export function ContactDock() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (pathname.startsWith("/enquire")) return null;

  const onPropertyPage = pathname.startsWith("/property/");

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed right-4 z-40 flex flex-col gap-2 md:right-6",
        "bottom-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-6",
        onPropertyPage && "max-md:hidden",
      )}
    >
      <a
        href={telUrl()}
        aria-label="Call Terra-Mind"
        title="Call us"
        onClick={() => {
          void logActivity({
            action: "call_click",
            meta: { where: "contact_dock", path: pathname },
          });
        }}
        className="steel-frame flex size-12 items-center justify-center rounded-full text-foreground transition-all hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-px"
      >
        <Phone weight="fill" className="size-5" />
      </a>
      <a
        href={whatsappUrl(generalEnquiryMessage())}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Terra-Mind on WhatsApp"
        title="WhatsApp us"
        onClick={() => {
          void logActivity({
            action: "whatsapp_click",
            meta: { where: "contact_dock", path: pathname },
          });
        }}
        className="signal-glow flex size-12 items-center justify-center rounded-full bg-signal text-background transition-all hover:bg-signal/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-px"
      >
        <WhatsappLogo weight="fill" className="size-6" />
      </a>
    </motion.div>
  );
}
