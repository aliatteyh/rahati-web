"use client";

import { useState } from "react";
import { Eyebrow } from "./primitives";

type Dict = Record<string, string>;

/**
 * The careers block: why work here, and the four answers it takes.
 *
 * A name, a number, an email and how long they have been doing this — and
 * nothing else. A cleaner asking for work has no account here and should not
 * have to make one, so the form posts straight through with no sign-in.
 *
 * It answers the same way whether the application is new or a repeat, because
 * the server quietly ignores a second one from the same number within the hour
 * and there is nothing useful to tell someone about that.
 */
export function NaqiCareers({
  index,
  label,
  title,
  intro,
  benefits,
  dict,
}: {
  index: string;
  label: string;
  title: string;
  intro: string;
  benefits: string[];
  dict: Dict;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [experience, setExperience] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const ready = name.trim().length > 1 && phone.trim().length > 5;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || sending) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, experience }),
      });
      const data = await res.json();

      if (data?.ok) {
        setSent(true);
        setName("");
        setPhone("");
        setEmail("");
        setExperience("");
      } else {
        setError(data?.message || dict.careersError);
      }
    } catch {
      setError(dict.careersError);
    } finally {
      setSending(false);
    }
  }

  const field =
    "w-full rounded-xl border border-line bg-paper px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-62 focus:border-green";

  return (
    <section
      id="careers"
      className="bg-paper-alt py-[clamp(56px,7vw,96px)]"
    >
      <div className="mx-auto grid w-full max-w-page gap-[clamp(28px,4vw,64px)] px-[clamp(20px,4vw,48px)] lg:grid-cols-2 lg:items-start">
        <div>
          <Eyebrow index={index} label={label} />
          <h2 className="mt-5 text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.15] text-ink [text-wrap:balance]">
            {title}
          </h2>
          <p className="mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-ink-62">
            {intro}
          </p>

          {/* Numbered because the list is a set of terms, not a sequence — the
              numbers are there to be pointed at in a conversation. */}
          <ul className="mt-8 border-t border-line">
            {benefits.map((benefit, i) => (
              <li
                key={benefit}
                className="flex items-baseline gap-4 border-b border-line py-4"
              >
                <span className="font-mono text-[12.5px] text-green">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[15.5px] text-ink">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-hero border border-line bg-paper p-[clamp(20px,2.6vw,32px)] shadow-[0_24px_60px_-40px_rgba(22,33,29,0.4)]">
          <h3 className="text-[19px] font-semibold text-ink">{dict.careersFormTitle}</h3>

          {sent ? (
            /* The whole card becomes the answer. Leaving the form up with a
               note above it invites the same person to send it again. */
            <div className="mt-6 rounded-xl bg-green-band px-5 py-6 text-center">
              <p className="text-[16px] font-semibold text-ink">{dict.careersSentTitle}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-62">
                {dict.careersSentNote}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 grid gap-3">
              <input
                className={field}
                placeholder={dict.careersName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={120}
                required
              />
              <input
                className={field}
                placeholder={dict.careersPhone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                dir="ltr"
                autoComplete="tel"
                maxLength={32}
                required
              />
              <input
                className={field}
                placeholder={dict.careersEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                dir="ltr"
                autoComplete="email"
                maxLength={191}
              />
              <select
                className={field}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option value="">{dict.careersExperience}</option>
                <option value="<1">{dict.careersExpNone}</option>
                <option value="1-2">{dict.careersExp12}</option>
                <option value="3-5">{dict.careersExp35}</option>
                <option value="5+">{dict.careersExp5}</option>
              </select>

              {error && <p className="text-sm text-accent-dark">{error}</p>}

              <button
                type="submit"
                disabled={!ready || sending}
                className="mt-1 rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-green disabled:opacity-50"
              >
                {sending ? "…" : dict.careersSend}
              </button>

              <p className="text-center text-[12.5px] leading-relaxed text-ink-62">
                {dict.careersPrivacy}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
