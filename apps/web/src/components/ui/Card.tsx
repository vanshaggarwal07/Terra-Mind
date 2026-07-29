import { cn } from "@/lib/cn";

/**
 * Base surface panel — ink, contour hairline, surface radius.
 */
export function Card({
  title,
  actions,
  children,
  className,
  noPad = false,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-surface border border-line-contour bg-ink shadow-card",
        !noPad && "p-ds-4 md:p-ds-5",
        className,
      )}
    >
      {(title || actions) && (
        <div className="mb-ds-4 flex items-center justify-between gap-ds-3">
          {typeof title === "string" ? (
            <h3 className="m-0 font-display text-sm font-medium text-text-hi">
              {title}
            </h3>
          ) : (
            title
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
