"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

interface ChatUser {
  id?: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
  provider?: { company_name?: string } | null;
}
interface ChatFile {
  original_file_name?: string;
  file_full_path?: string | null;
  file_type?: string;
}
interface ChatMessage {
  id?: string;
  message?: string | null;
  user_id?: string;
  created_at?: string;
  user?: ChatUser | null;
  conversation_files?: ChatFile[] | null;
}

function fullName(u?: ChatUser | null): string {
  if (!u) return "";
  return [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
}

function isImage(t?: string): boolean {
  return !!t && ["jpg", "jpeg", "png", "gif", "webp"].includes(t.toLowerCase());
}

export function ChatWindow({
  bookingId,
  locale,
  dict,
  businessName,
  meId,
}: {
  bookingId: string;
  locale: Locale;
  dict: Dict;
  businessName: string;
  meId?: string;
}) {
  const [channelId, setChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<"init" | "ready" | "error" | "sending">("init");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const label = (u?: ChatUser | null) => {
    const me = (u?.id && u.id === meId) || u?.user_type === "customer";
    if (me) return { name: dict.you, me: true };
    const type = u?.user_type ?? "";
    if (type.includes("provider"))
      return { name: u?.provider?.company_name || dict.provider, me: false };
    if (type.includes("serviceman"))
      return { name: fullName(u) || dict.serviceman, me: false };
    if (type.includes("admin"))
      return { name: businessName || dict.admin, me: false };
    return { name: fullName(u) || "—", me: false };
  };

  const loadConversation = useCallback(async (cid: string) => {
    try {
      const res = await fetch(
        `/api/chat/conversation?channel_id=${encodeURIComponent(cid)}&locale=${locale}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      const rows: ChatMessage[] = Array.isArray(json.messages) ? json.messages : [];
      // API returns newest-first; show oldest-first.
      setMessages(rows.slice().reverse());
    } catch {
      /* keep previous messages on transient errors */
    }
  }, [locale]);

  // Create/reuse the booking channel on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat/create-booking-channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: bookingId, locale }),
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && json.ok && json.channel_id) {
          setChannelId(json.channel_id);
          setState("ready");
          await loadConversation(json.channel_id);
        } else {
          setState("error");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, locale, loadConversation]);

  // Poll for new messages every 5s.
  useEffect(() => {
    if (!channelId) return;
    const id = setInterval(() => loadConversation(channelId), 5000);
    return () => clearInterval(id);
  }, [channelId, loadConversation]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!channelId || (!text.trim() && files.length === 0)) return;
    setState("sending");
    try {
      const fd = new FormData();
      fd.append("channel_id", channelId);
      fd.append("locale", locale);
      if (text.trim()) fd.append("message", text.trim());
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/chat/send-message", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setText("");
        setFiles([]);
        if (fileRef.current) fileRef.current.value = "";
        await loadConversation(channelId);
      }
    } finally {
      setState((s) => (s === "sending" ? "ready" : s));
    }
  }

  if (state === "error") {
    return <p className="text-sm text-accent-dark">{dict.chatError}</p>;
  }

  return (
    <div className="flex h-[28rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {state === "init" ? (
          <p className="text-sm text-muted">{dict.loading}</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted">{dict.noMessages}</p>
        ) : (
          messages.map((m, i) => {
            const l = label(m.user);
            return (
              <div key={m.id ?? i} className={`flex ${l.me ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    l.me
                      ? "bg-primary text-white"
                      : "border border-border bg-surface-soft text-ink"
                  }`}
                >
                  {!l.me && (
                    <p className="mb-0.5 text-xs font-semibold text-primary-dark">{l.name}</p>
                  )}
                  {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                  {(m.conversation_files ?? []).map((f, fi) =>
                    f.file_full_path && isImage(f.file_type) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={fi}
                        src={f.file_full_path}
                        alt={f.original_file_name ?? ""}
                        className="mt-1 max-h-40 rounded-lg"
                      />
                    ) : (
                      <a
                        key={fi}
                        href={f.file_full_path ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-1 block text-xs underline ${l.me ? "text-white" : "text-primary"}`}
                      >
                        📎 {f.original_file_name ?? "file"}
                      </a>
                    )
                  )}
                  {m.created_at && (
                    <p className={`mt-1 text-[10px] ${l.me ? "text-white/70" : "text-muted"}`}>
                      {m.created_at.slice(0, 16).replace("T", " ")}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-3">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="rounded-lg bg-surface-soft px-2 py-1 text-xs text-muted">
                📎 {f.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-lg text-muted hover:border-primary"
            aria-label={dict.attach}
          >
            📎
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={dict.typeMessage}
            className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={send}
            disabled={state === "sending" || (!text.trim() && files.length === 0)}
            className="shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
          >
            {dict.send}
          </button>
        </div>
      </div>
    </div>
  );
}
