import { cn } from "@/lib/cn";

/**
 * Base card primitive — ink surface, subtle cyan border.
 * Maps to the design system's "cartographer's studio" card pattern.
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
        "bg-ink border border-cyan/[0.18] rounded-card shadow-card",
        !noPad && "p-5",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {typeof title === "string" ? (
            <h3 className="m-0 text-sm font-semibold font-display uppercase tracking-widest text-text-low">
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
