"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

const DIAL_CODES = ["+971", "+966", "+965", "+974", "+973", "+968", "+962", "+20"];

export function LoginForm({ locale, dict }: { locale: Locale; dict: Dict }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [dial, setDial] = useState("+971");
  const [number, setNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionInfoRef = useRef<string>("");

  const fullPhone = `${dial}${number.replace(/\s/g, "").replace(/^0+/, "")}`;

  function resetRecaptcha() {
    try {
      verifierRef.current?.clear();
    } catch {
      /* ignore */
    }
    verifierRef.current = null;
    // Firebase mounts the reCAPTCHA widget into this element; wipe it so a new
    // verifier can render fresh (avoids "reCAPTCHA has already been rendered").
    if (wrapperRef.current) wrapperRef.current.innerHTML = "";
  }

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!number.trim()) return;
    setLoading(true);
    setError("");
    try {
      const auth = getFirebaseAuth();
      // Always start from a clean container + a fresh verifier per attempt.
      resetRecaptcha();
      const host = document.createElement("div");
      wrapperRef.current?.appendChild(host);
      const verifier = new RecaptchaVerifier(auth, host, { size: "invisible" });
      verifierRef.current = verifier;
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, verifier);
      sessionInfoRef.current = confirmation.verificationId;
      setStep("otp");
    } catch (err) {
      setError((err as Error)?.message || dict.invalidCode);
      resetRecaptcha();
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/firebase-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionInfo: sessionInfoRef.current,
          phoneNumber: fullPhone,
          code: otp.trim(),
          locale,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(`/${locale}`);
        router.refresh();
      } else if (data.isNewUser) {
        // Phone verified but no account yet -> continue to sign-up, prefilled.
        router.push(`/${locale}/register?phone=${encodeURIComponent(fullPhone)}`);
      } else {
        setError(data.message || dict.invalidCode);
      }
    } catch {
      setError(dict.invalidCode);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-border bg-surface p-8">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary-light text-2xl">
          📱
        </div>

        {step === "phone" ? (
          <>
            <h1 className="text-2xl font-bold text-ink">{dict.phoneTitle}</h1>
            <p className="mt-1 text-sm text-muted">{dict.phoneSubtitle}</p>
            <form onSubmit={sendOtp} className="mt-6 space-y-4">
              <div className="flex gap-2">
                <select
                  value={dial}
                  onChange={(e) => setDial(e.target.value)}
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-primary"
                >
                  {DIAL_CODES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder={dict.phonePlaceholder}
                  required
                  className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-primary"
                  dir="ltr"
                />
              </div>
              {error && <p className="text-sm text-accent-dark">{error}</p>}
              <button
                type="submit"
                disabled={loading || !number.trim()}
                className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
              >
                {loading ? dict.sending : dict.continue}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-muted">
              {dict.noAccount}{" "}
              <Link href={`/${locale}/register`} className="font-semibold text-primary">
                {dict.register}
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-ink">{dict.otpTitle}</h1>
            <p className="mt-1 text-sm text-muted">
              {dict.otpSubtitle}{" "}
              <span dir="ltr" className="font-medium text-ink">
                {fullPhone}
              </span>
            </p>
            <form onSubmit={verifyOtp} className="mt-6 space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={dict.otpPlaceholder}
                required
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-center text-lg tracking-widest outline-none focus:border-primary"
                dir="ltr"
              />
              {error && <p className="text-sm text-accent-dark">{error}</p>}
              <button
                type="submit"
                disabled={loading || !otp.trim()}
                className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
              >
                {loading ? dict.verifying : dict.verify}
              </button>
            </form>
            <div className="mt-4 flex justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                  resetRecaptcha();
                }}
                className="text-muted hover:text-primary"
              >
                {dict.changeNumber}
              </button>
              <button
                type="button"
                onClick={() => sendOtp()}
                disabled={loading}
                className="font-medium text-primary disabled:opacity-50"
              >
                {dict.resend}
              </button>
            </div>
          </>
        )}
        <div ref={wrapperRef} />
      </div>
    </div>
  );
}
