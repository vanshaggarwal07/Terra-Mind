import { CopilotChat } from "@/components/copilot/CopilotChat";

export default function CopilotPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 md:px-12 py-12">
      <div className="mb-8">
        <h1 className="font-display font-medium text-[clamp(28px,4vw,44px)] text-text-hi mb-3">
          Copilot
        </h1>
        <p className="font-voice italic text-text-mid text-lg max-w-xl">
          Ask about verified infrastructure, timelines, forecast bands, or RERA
          records. Every answer cites its source. Nothing here is investment advice.
        </p>
      </div>
      <CopilotChat />
    </main>
  );
}
