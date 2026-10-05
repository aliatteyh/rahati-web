import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

/**
 * Forwards one banner impression or click to the panel.
 *
 * Proxied rather than called from the browser so the panel's host stays out of
 * the page, and so a blocked cross-origin request cannot quietly stop the
 * counting on somebody's browser.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    await fetch(`${API_BASE}/api/v1/customer/banner/${encodeURIComponent(id)}/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: body?.type,
        surface: "web",
      }),
      cache: "no-store",
    });
  } catch {
    // Always 200: the caller has nothing useful to do with a failed tally, and
    // an error here would show up in somebody's console for no reason.
  }

  return NextResponse.json({ ok: true });
}
