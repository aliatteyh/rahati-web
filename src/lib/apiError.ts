/**
 * The most useful sentence the backend gave us about a failure.
 *
 * Every rejection arrives wrapped in the same envelope, whose `message` is the
 * response constant — "Invalid or missing information" — while the sentence that
 * says what actually went wrong sits in `errors`. Preferring `message` means the
 * customer is told nothing they can act on: a stale cart line, a service with no
 * provider nearby and a genuinely malformed request all read identically, and
 * the one thing that would let them fix it is the thing we discard.
 *
 * `errors` is not one shape. Validation failures produce a list of
 * {error_code, message}; hand-written refusals pass a bare string. Both are
 * handled here rather than at each call site.
 */
export function apiErrorMessage(json: unknown, fallback?: string): string | undefined {
  const body = (json ?? {}) as { message?: unknown; errors?: unknown };
  const errors = body.errors;

  if (typeof errors === "string" && errors.trim()) return errors;

  if (Array.isArray(errors)) {
    for (const entry of errors) {
      if (typeof entry === "string" && entry.trim()) return entry;
      const message = (entry as { message?: unknown })?.message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }

  // Some endpoints answer with a keyed object rather than a list.
  if (errors && typeof errors === "object") {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }

  if (typeof body.message === "string" && body.message.trim()) return body.message;
  return fallback;
}
