/**
 * One place a booking status becomes a colour.
 *
 * Taken from the Demandium app's `CustomThemeColors`, which resolves status
 * colours through a single map rather than an if/else in every view. The admin
 * templates here currently repeat that decision in several blades; routing them
 * through this means a new status is one line, not a hunt.
 *
 * Pair with `demandium-tokens.css`, which defines the matching classes.
 */

export type BookingStatus =
  | "pending"
  | "accepted"
  | "ongoing"
  | "completed"
  | "settled"
  | "canceled"
  | "approved"
  | "expired"
  | "running"
  | "denied"
  | "paused"
  | "resumed";

export type PackageStatus = "active" | "expired" | "canceled";

const CLASS_BY_STATUS: Record<string, string> = {
  pending: "dm-status--pending",
  accepted: "dm-status--accepted",
  ongoing: "dm-status--ongoing",
  completed: "dm-status--completed",
  settled: "dm-status--settled",
  canceled: "dm-status--canceled",
  cancelled: "dm-status--canceled", // both spellings reach this from the API
  approved: "dm-status--approved",
  expired: "dm-status--expired",
  running: "dm-status--running",
  denied: "dm-status--denied",
  paused: "dm-status--paused",
  resumed: "dm-status--resumed",

  // Packages borrow the booking vocabulary: an active package reads like an
  // accepted booking, and a spent one like an expired subscription.
  active: "dm-status--accepted",
};

/** The pill classes for a status, falling back to a neutral tint. */
export function statusClass(status: string | null | undefined): string {
  if (!status) return "dm-status";
  return `dm-status ${CLASS_BY_STATUS[status.toLowerCase()] ?? "dm-status--pending"}`;
}
