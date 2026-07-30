"use client";

import { useState, type ReactNode } from "react";

export function BookingDetailTabs({
  detailsLabel,
  statusLabel,
  details,
  status,
}: {
  detailsLabel: string;
  statusLabel: string;
  details: ReactNode;
  status: ReactNode;
}) {
  const [tab, setTab] = useState<"details" | "status">("details");

  return (
    <div>
      <div className="flex gap-6 border-b border-border">
        {(
          [
            ["details", detailsLabel],
            ["status", statusLabel],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-semibold transition ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="pt-6">{tab === "details" ? details : status}</div>
    </div>
  );
}
