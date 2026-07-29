"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocationPicker } from "./LocationPicker";

type Dict = Record<string, string>;

export function HeaderLocation({
  dict,
  initialZoneName,
}: {
  dict: Dict;
  initialZoneName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialZoneName);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden max-w-[180px] items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-ink transition hover:border-primary lg:flex"
        title={dict.change}
      >
        <span>📍</span>
        <span className="truncate font-medium">{name ?? dict.chooseLocation}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">{dict.chooseLocation}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-soft"
                aria-label="close"
              >
                ✕
              </button>
            </div>
            <LocationPicker
              dict={dict}
              onResolved={(loc) => {
                setName(loc.zoneName);
                setOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
