import Link from "next/link";
import type { ComponentProps } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type LinkButtonProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  };

/** Next Link styled as Terra-Mind button (avoids Base UI nativeButton warning). */
export function LinkButton({
  href,
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Button
      nativeButton={false}
      render={<Link href={href} {...props} />}
      variant={variant}
      size={size}
      className={cn("rounded-sm", className)}
    >
      {children}
    </Button>
  );
}
