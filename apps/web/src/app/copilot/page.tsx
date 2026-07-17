import { CopilotChat } from "@/components/copilot/CopilotChat";

export default function CopilotPage() {
  return (
    <main>
      <h1>AI Property Copilot</h1>
      <p className="muted">
        Grounded in this platform&apos;s cited data only. It will say “I don&apos;t
        have that in my data” rather than guess, and it never predicts prices or
        renders a builder verdict.
      </p>
      <CopilotChat />
    </main>
  );
}
