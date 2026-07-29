"use client";

import { useRouter } from "next/navigation";
import { LocationPicker } from "@/components/location/LocationPicker";

type Dict = Record<string, string>;

export function ServiceAreaLocation({ dict }: { dict: Dict }) {
  const router = useRouter();
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-lg font-semibold text-ink">{dict.chooseLocation}</h2>
      <LocationPicker dict={dict} onResolved={() => router.refresh()} />
    </div>
  );
}
