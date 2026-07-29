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
 * Copilot console — streams answers with inline citation chips.
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
    <div className="flex flex-col gap-ds-3">
      <Disclaimer variant="prediction">
        Answers are grounded only in this platform&apos;s cited data, never the
        open web, and are not investment advice.
      </Disclaimer>

      <div
        ref={scrollRef}
        className={cn(
          "flex min-h-[280px] max-h-[460px] flex-col gap-ds-2 overflow-y-auto",
          "rounded-surface border border-line-strong bg-ink p-ds-3",
          "scrollbar-thin",
        )}
        role="log"
        aria-label="Copilot conversation"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-sm leading-relaxed text-text-low">
            Ask about verified infrastructure, timelines, or a RERA builder
            record. Example: &quot;What metro projects affect Sector 22D?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {busy && (
          <div className="flex gap-1 self-start px-ds-3 py-ds-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-pill bg-brass/60 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-ds-2">
        <label className="sr-only" htmlFor="copilot-input">
          Your question for the copilot
        </label>
        <input
          id="copilot-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask the copilot…"
          className={cn(
            "flex-1 rounded-surface border border-line-strong bg-ink-3 px-ds-3 py-2.5",
            "text-sm text-text-hi placeholder:text-text-low",
            "focus:border-brass/50 focus:outline-none",
          )}
          disabled={busy}
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !input.trim()}
          className={cn(
            "btn-primary focus-brass",
            "disabled:cursor-not-allowed disabled:opacity-40",
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
        "max-w-[85%] rounded-surface px-ds-3 py-2.5 text-sm",
        isUser
          ? "self-end bg-brass font-medium text-ink"
          : cn(
              "self-start bg-ink-3 text-text-hi",
              message.refused && "border border-clay/40",
            ),
      )}
    >
      <div className="whitespace-pre-wrap">{message.text}</div>
      {message.citations && message.citations.length > 0 && (
        <div
          className="mt-ds-2 flex flex-wrap gap-1.5"
          aria-label="Sources cited in this answer"
        >
          {message.citations.map((c, i) => (
            <span
              key={i}
              className="rounded-control border border-line-strong bg-ink px-ds-2 py-0.5"
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
