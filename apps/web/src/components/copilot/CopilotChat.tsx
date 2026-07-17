"use client";

import { useRef, useState } from "react";
import { copilotQuery, type Citation as CitationType } from "@/lib/api";
import { Citation } from "@/components/trust/Citation";
import { Disclaimer } from "@/components/trust/Disclaimer";

type Message = {
  role: "user" | "assistant";
  text: string;
  citations?: CitationType[];
  refused?: boolean;
  streaming?: boolean;
};

/**
 * Copilot chat (blueprint §1 feature 5, §6). Streams the answer in and renders
 * inline citation chips. Honest "not in my data" refusals are shown clearly; a
 * persistent disclaimer is always visible.
 */
export function CopilotChat({ localityId }: { localityId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const query = input.trim();
    if (!query || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: query }]);

    try {
      const res = await copilotQuery(query, localityId);
      await revealStreamed(res.answer, (partial, done) => {
        setMessages((m) => {
          const others = m.filter((x) => !(x.role === "assistant" && x.streaming));
          return [
            ...others,
            {
              role: "assistant",
              text: partial,
              citations: done ? res.citations : undefined,
              refused: done ? res.refused : undefined,
              streaming: !done,
            },
          ];
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Error: ${String(e)}`, refused: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Disclaimer>
        Answers are grounded only in this platform&apos;s cited data — never the open
        web — and are not investment advice.
      </Disclaimer>

      <div
        ref={scrollRef}
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 12,
          minHeight: 280,
          maxHeight: 460,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "var(--bg-elev)",
        }}
      >
        {messages.length === 0 && (
          <p className="muted">
            Ask about verified infrastructure, timelines, or a RERA builder record.
            Example: “What metro projects affect Sector 22D?”
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask the copilot…"
          style={{
            flex: 1,
            padding: "0.6rem 0.8rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg-elev-2)",
            color: "var(--fg)",
          }}
        />
        <button className="btn" onClick={send} disabled={busy || !input.trim()}>
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        background: isUser ? "var(--accent)" : "var(--bg-elev-2)",
        color: isUser ? "#04121f" : "var(--fg)",
        padding: "0.55rem 0.8rem",
        borderRadius: 10,
        border: message.refused ? "1px solid var(--warn)" : undefined,
      }}
    >
      <div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div>
      {message.citations && message.citations.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {message.citations.map((c, i) => (
            <span
              key={i}
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              <Citation citation={c} index={i + 1} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Progressive reveal to drive the streaming UI (the backend also exposes a true
// text stream at /copilot/stream; this keeps citations attached to the answer).
async function revealStreamed(
  full: string,
  onUpdate: (partial: string, done: boolean) => void,
) {
  const words = full.split(" ");
  let acc = "";
  for (let i = 0; i < words.length; i++) {
    acc += (i === 0 ? "" : " ") + words[i];
    onUpdate(acc, false);
    await new Promise((r) => setTimeout(r, 18));
  }
  onUpdate(full, true);
}
