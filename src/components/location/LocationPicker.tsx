"use client";

import { useEffect, useRef, useState } from "react";

export interface ResolvedLocation {
  zoneId: string;
  zoneName?: string;
  count?: number;
  lat: number;
  lon: number;
  city?: string;
  area?: string;
  formattedAddress?: string;
}

type Dict = Record<string, string>;

interface Suggestion {
  placeId: string;
  text: string;
}

/** Pull city / area / formatted address out of a Google geocode payload. */
function parseGeocode(geo: unknown): {
  city?: string;
  area?: string;
  formattedAddress?: string;
} {
  const results = (geo as { results?: unknown[] })?.results;
  const first = Array.isArray(results) ? (results[0] as Record<string, unknown>) : undefined;
  if (!first) return {};
  const components = (first.address_components as
    | { types: string[]; long_name: string }[]
    | undefined) ?? [];
  const pick = (type: string) =>
    components.find((c) => c.types?.includes(type))?.long_name;
  return {
    city: pick("locality") ?? pick("administrative_area_level_2"),
    area:
      pick("sublocality") ?? pick("neighborhood") ?? pick("sublocality_level_1"),
    formattedAddress: first.formatted_address as string | undefined,
  };
}

export function LocationPicker({
  dict,
  onResolved,
  autoDetect = false,
}: {
  dict: Dict;
  onResolved?: (loc: ResolvedLocation) => void;
  autoDetect?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve a coordinate: zone + reverse-geocode, then surface the result.
  async function resolveCoords(lat: number, lon: number) {
    setBusy(true);
    setError("");
    setUnavailable(false);
    setSuggestions([]);
    try {
      const [zoneRes, geoRes] = await Promise.all([
        fetch(`/api/location/zone?lat=${lat}&lng=${lon}`).then((r) => r.json()),
        fetch(`/api/location/geocode?lat=${lat}&lng=${lon}`).then((r) => r.json()),
      ]);
      const geo = parseGeocode(geoRes);
      if (!zoneRes?.found) {
        setResolved(null);
        setUnavailable(true);
        return;
      }
      const loc: ResolvedLocation = {
        zoneId: zoneRes.id,
        zoneName: zoneRes.name,
        count: zoneRes.count,
        lat,
        lon,
        ...geo,
      };
      await fetch("/api/location/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loc.zoneId, name: loc.zoneName, count: loc.count }),
      });
      setResolved(loc);
      onResolved?.(loc);
    } catch {
      setError(dict.locationError);
    } finally {
      setBusy(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError(dict.locationError);
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolveCoords(pos.coords.latitude, pos.coords.longitude),
      () => {
        setBusy(false);
        setError(dict.locationDenied);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function pickSuggestion(s: Suggestion) {
    setQuery(s.text);
    setBusy(true);
    try {
      const place = await fetch(
        `/api/location/place?place_id=${encodeURIComponent(s.placeId)}`
      ).then((r) => r.json());
      const loc = place?.location as { latitude?: number; longitude?: number } | undefined;
      if (loc?.latitude && loc?.longitude) {
        await resolveCoords(loc.latitude, loc.longitude);
      } else {
        setBusy(false);
        setError(dict.locationError);
      }
    } catch {
      setBusy(false);
      setError(dict.locationError);
    }
  }

  useEffect(() => {
    if (autoDetect) useMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetect]);

  function onQueryChange(value: string) {
    setQuery(value);
    setResolved(null);
    setUnavailable(false);
    if (debounce.current) clearTimeout(debounce.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const data = await fetch(
          `/api/location/autocomplete?q=${encodeURIComponent(value.trim())}`
        ).then((r) => r.json());
        const raw = (data?.suggestions ?? []) as {
          placePrediction?: { placeId?: string; text?: { text?: string } };
        }[];
        setSuggestions(
          raw
            .filter((s) => s.placePrediction?.placeId)
            .map((s) => ({
              placeId: s.placePrediction!.placeId!,
              text: s.placePrediction!.text?.text ?? "",
            }))
        );
      } catch {
        setSuggestions([]);
      }
    }, 350);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={dict.searchLocation}
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-primary"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-surface shadow-lg">
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="block w-full px-4 py-2.5 text-start text-sm text-ink hover:bg-surface-soft"
                >
                  {s.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={busy}
        className="flex items-center gap-2 text-sm font-medium text-primary disabled:opacity-60"
      >
        <span>📍</span>
        {busy ? dict.locating : dict.useMyLocation}
      </button>

      {error && <p className="text-sm text-accent-dark">{error}</p>}

      {unavailable && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-accent-dark">
          {dict.serviceUnavailable}
        </div>
      )}

      {resolved && (
        <div className="rounded-xl border border-primary/30 bg-primary-light/40 px-4 py-3 text-sm">
          <p className="font-semibold text-ink">
            ✓ {resolved.zoneName ?? dict.serviceAvailable}
          </p>
          {resolved.formattedAddress && (
            <p className="mt-0.5 text-muted">{resolved.formattedAddress}</p>
          )}
          {typeof resolved.count === "number" && resolved.count > 0 && (
            <p className="mt-0.5 text-primary">
              {resolved.count} {dict.servicesAvailable}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
