"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBuilder, type Builder } from "@/lib/api";
import { BuilderCard } from "@/components/builder/BuilderCard";
import { Card } from "@/components/ui/Card";

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const [builder, setBuilder] = useState<Builder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getBuilder(params.id)
      .then((b) => alive && setBuilder(b))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [params.id]);

  return (
    <main>
      <h1>Builder record</h1>
      {error ? (
        <Card>Could not load builder: {error}</Card>
      ) : builder ? (
        <BuilderCard builder={builder} />
      ) : (
        <Card>Loading…</Card>
      )}
    </main>
  );
}
