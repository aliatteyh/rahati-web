"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ZONE_COOKIE } from "@/lib/cookies";

/** Resolve a coordinate to a zone and store it, coordinates included. */
async function persist(lat: number, lon: number): Promise<boolean> {
  const zone = await fetch(`/api/location/zone?lat=${lat}&lng=${lon}`).then((r) => r.json());
  if (!zone?.found) return false;
  await fetch("/api/location/set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: zone.id, name: zone.name, count: zone.count, lat, lon }),
  });
  return true;
}

/**
 * Work out where the visitor is, once, on their first visit.
 *
 * Without this the site assumed everyone was in the default zone, so a customer
 * in another emirate was shown providers who do not serve them and told the
 * prices of a city they are not in. The picker in the header could fix it, but
 * only for someone who noticed it was wrong and thought to look.
 *
 * Deliberately silent. It asks the browser once and then does nothing visible:
 * on success the page refreshes with the right zone, and on refusal — the
 * common answer — the site carries on exactly as before. Nothing is blocked
 * behind the permission and no prompt of our own is stacked on the browser's.
 *
 * Runs only when no zone is stored, so a customer who has chosen an area is
 * never quietly moved out of it, and a refusal is not re-asked on every page.
 */
export function AutoLocate() {
  const router = useRouter();

  useEffect(() => {
    // A zone cookie — set by choosing an area or by an earlier run — means the
    // question is already answered.
    if (document.cookie.split("; ").some((c) => c.startsWith(`${ZONE_COOKIE}=`))) return;
    if (!("geolocation" in navigator)) return;

    // Remember that we asked. Browsers keep a denial for the origin, but a
    // dismissed prompt leaves no trace and would return on the next page.
    const ASKED = "rahati_located";
    try {
      if (sessionStorage.getItem(ASKED)) return;
      sessionStorage.setItem(ASKED, "1");
    } catch {
      // Private mode with storage blocked: better to ask again than not at all.
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const ok = await persist(pos.coords.latitude, pos.coords.longitude);
          // Refresh only on success. Refreshing after a zone we do not serve
          // would reload the page to no visible effect.
          if (ok && !cancelled) router.refresh();
        } catch {
          /* An unreachable lookup is not worth telling the customer about. */
        }
      },
      () => {
        /* Refused or unavailable — the default zone still works. */
      },
      { timeout: 8000, maximumAge: 600000 }
    );

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
