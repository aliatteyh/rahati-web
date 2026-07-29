import type { Metadata } from "next";
import type { ReactNode } from "react";

// Private area — keep it out of search indexes.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-10">{children}</div>;
}
