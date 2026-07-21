"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getBuilder, type Builder } from "@/lib/api";
import { BuilderCard } from "@/components/builder/BuilderCard";

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const [builder, setBuilder] = useState<Builder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getBuilder(params.id)
      .then((b) => alive && setBuilder(b))
      .catch((e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, [params.id]);

  return (
    <main className="max-w-3xl mx-auto px-6 md:px-12 py-12">
      <Link
        href="/"
        className="font-mono text-[11px] text-text-low hover:text-text-mid mb-5 inline-block focus-brass"
      >
        ← Home
      </Link>
      <h1 className="font-display font-medium text-[clamp(24px,3vw,36px)] text-text-hi mb-6">
        Builder record
      </h1>
      {error ? (
        <p className="text-sm text-clay">Could not load builder: {error}</p>
      ) : builder ? (
        <BuilderCard builder={builder} />
      ) : (
        <p className="font-mono text-xs text-text-low">Loading…</p>
      )}
    </main>
  );
}
