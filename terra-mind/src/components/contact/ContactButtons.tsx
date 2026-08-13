"use client";

import type { ComponentProps, ReactNode } from "react";
import { Phone, WhatsappLogo } from "@phosphor-icons/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { logActivity } from "@/lib/activity";
import { telUrl, whatsappUrl } from "@/lib/contact";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type CtaProps = VariantProps<typeof buttonVariants> & {
  /** Surface identifier logged to the Activity sheet, e.g. "property_header". */
  where: string;
  propertyId?: string;
  /** Extra context merged into the logged meta (e.g. projection numbers). */
  meta?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
  iconClassName?: string;
} & Omit<ComponentProps<"a">, "href" | "children" | "className">;

/** WhatsApp deep link styled as a Terra-Mind button. Logs every click. */
export function WhatsAppButton({
  message,
  where,
  propertyId,
  meta,
  className,
  children,
  iconClassName,
  variant = "default",
  size = "default",
  ...props
}: CtaProps & { message: string }) {
  return (
    <Button
      nativeButton={false}
      variant={variant}
      size={size}
      className={cn("rounded-full", className)}
      render={
        <a
          href={whatsappUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            void logActivity({
              action: "whatsapp_click",
              propertyId,
              meta: { where, ...meta },
            });
          }}
          {...props}
        />
      }
    >
      <WhatsappLogo weight="fill" className={cn("size-4", iconClassName)} />
      {children}
    </Button>
  );
}

/** tel: link styled as a Terra-Mind button. Logs every click. */
export function CallButton({
  where,
  propertyId,
  meta,
  className,
  children,
  iconClassName,
  variant = "outline",
  size = "default",
  ...props
}: CtaProps) {
  return (
    <Button
      nativeButton={false}
      variant={variant}
      size={size}
      className={cn("rounded-full", className)}
      render={
        <a
          href={telUrl()}
          onClick={() => {
            void logActivity({
              action: "call_click",
              propertyId,
              meta: { where, ...meta },
            });
          }}
          {...props}
        />
      }
    >
      <Phone weight="fill" className={cn("size-4", iconClassName)} />
      {children}
    </Button>
  );
}
