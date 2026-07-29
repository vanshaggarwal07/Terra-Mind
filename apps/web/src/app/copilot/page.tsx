import { CopilotChat } from "@/components/copilot/CopilotChat";

export default function CopilotPage() {
  return (
    <main className="mx-auto max-w-3xl px-ds-5 py-ds-7 md:px-ds-7 md:py-ds-8">
      <header className="mb-ds-6 max-w-xl">
        <h1 className="mb-ds-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.1] text-text-hi">
          Copilot
        </h1>
        <p className="font-display text-base text-text-mid md:text-lg">
          Ask about verified infrastructure, timelines, forecast bands, or RERA
          records. Every answer cites its source.
        </p>
      </header>

      <div className="rounded-surface border border-line-contour bg-ink-2/40 p-ds-4 md:p-ds-5">
        <CopilotChat />
      </div>
    </main>
  );
}
