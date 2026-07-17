import Link from "next/link";
import { MapPanel } from "@/components/map/MapPanel";
import { Disclaimer } from "@/components/trust/Disclaimer";

export default function Home() {
  return (
    <main>
      <h1>Property Digital Twin</h1>
      <p className="muted">
        Future intelligence for the Noida · Greater Noida · Yamuna Expressway ·
        Jewar Airport corridor. Every fact is cited; nothing here is investment
        advice.
      </p>

      <div style={{ margin: "1rem 0" }}>
        <MapPanel height={520} />
      </div>

      <Disclaimer>
        The map shows only verified infrastructure facts from public/government
        sources. Predictive scoring is shown per-locality with a confidence band.
      </Disclaimer>

      <p style={{ marginTop: "1.5rem" }}>
        Explore the{" "}
        <Link href="/locality/sector-22d-poc">Sector 22D proof-of-concept</Link>{" "}
        timeline, or ask the <Link href="/copilot">AI copilot</Link>.
      </p>
    </main>
  );
}
