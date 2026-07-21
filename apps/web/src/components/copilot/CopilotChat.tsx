"use client";

import { useRef, useState } from "react";
import { copilotQuery, type Citation as CitationType } from "@/lib/api";
import { Citation } from "@/components/trust/Citation";
import { Disclaimer } from "@/components/trust/Disclaimer";
import { cn } from "@/lib/cn";

type Message = {
  role: "user" | "assistant";
  text: string;
  citations?: CitationType[];
  refused?: boolean;
  streaming?: boolean;
};

/**
 * Copilot chat (blueprint §1 feature 5, §6).
 * Streams the answer and renders inline citation chips.
 * Refusals shown clearly. Persistent disclaimer always visible.
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
          const others = m.filter(
            (x) => !(x.role === "assistant" && x.streaming),
          );
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
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
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
    <div className="flex flex-col gap-3">
      <Disclaimer variant="prediction">
        Answers are grounded only in this platform&apos;s cited data — never the open
        web — and are not investment advice.
      </Disclaimer>

      {/* Message thread */}
      <div
        ref={scrollRef}
        className={cn(
          "border border-white/10 rounded-card p-3",
          "min-h-[280px] max-h-[460px] overflow-y-auto",
          "flex flex-col gap-2.5 bg-ink-2 scrollbar-thin",
        )}
        role="log"
        aria-label="Copilot conversation"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-sm text-text-low font-voice italic">
            Ask about verified infrastructure, timelines, or a RERA builder
            record. Example: &quot;What metro projects affect Sector 22D?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {busy && (
          <div className="self-start flex gap-1 px-3 py-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-brass/60 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask the copilot…"
          aria-label="Your question for the copilot"
          className={cn(
            "flex-1 px-3 py-2.5 rounded-card",
            "bg-ink-3 border border-white/10 text-text-hi text-sm",
            "placeholder:text-text-low",
            "focus:outline-none focus:border-brass/50",
          )}
          disabled={busy}
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className={cn(
            "px-4 py-2.5 bg-brass text-ink font-display font-semibold text-sm rounded-card",
            "transition-opacity hover:opacity-90 focus-brass",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          {busy ? "…" : "Ask"}
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-card px-3 py-2.5 text-sm",
        isUser
          ? "self-end bg-brass text-ink font-medium"
          : cn(
              "self-start bg-ink-3 text-text-hi",
              message.refused && "border border-clay/40",
            ),
      )}
    >
      <div className="whitespace-pre-wrap">{message.text}</div>
      {message.citations && message.citations.length > 0 && (
        <div
          className="mt-2 flex flex-wrap gap-1.5"
          aria-label="Sources cited in this answer"
        >
          {message.citations.map((c, i) => (
            <span
              key={i}
              className="bg-ink border border-white/10 rounded-pill px-2 py-0.5"
            >
              <Citation citation={c} index={i + 1} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

async function revealStreamed(
  full: string,
  onUpdate: (partial: string, done: boolean) => void,
) {
  const words = full.split(" ");
  let acc = "";
  for (let i = 0; i < words.length; i++) {
    acc += (i === 0 ? "" : " ") + words[i];
    onUpdate(acc, false);
    await new Promise((r) => setTimeout(r, 16));
  }
  onUpdate(full, true);
}
