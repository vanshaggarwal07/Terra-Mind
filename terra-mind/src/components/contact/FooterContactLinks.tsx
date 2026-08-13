"use client";

import { logActivity } from "@/lib/activity";
import {
  CONTACT,
  generalEnquiryMessage,
  mailtoUrl,
  telUrl,
  whatsappUrl,
} from "@/lib/contact";

/** Footer contact links with activity logging. */
export function FooterContactLinks() {
  return (
    <ul className="mt-4 space-y-3">
      <li>
        <a
          href={telUrl()}
          onClick={() => {
            void logActivity({ action: "call_click", meta: { where: "site_footer" } });
          }}
          className="font-data text-sm text-dim transition-colors hover:text-foreground"
        >
          {CONTACT.phone}
        </a>
      </li>
      <li>
        <a
          href={whatsappUrl(generalEnquiryMessage())}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            void logActivity({
              action: "whatsapp_click",
              meta: { where: "site_footer" },
            });
          }}
          className="text-sm text-dim transition-colors hover:text-foreground"
        >
          WhatsApp us
        </a>
      </li>
      <li>
        <a
          href={mailtoUrl("Corridor enquiry via Terra-Mind")}
          className="text-sm text-dim transition-colors hover:text-foreground"
        >
          {CONTACT.email}
        </a>
      </li>
    </ul>
  );
}
