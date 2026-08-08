import type { SocialMediaLink } from "@/lib/types";

/**
 * The business's social accounts, as set in the admin panel.
 *
 * Two things are filtered out rather than rendered, because both are worse than
 * showing nothing:
 *
 * - Anything switched off.
 * - Anything still pointing at a platform's own front page. The settings ship
 *   with `https://www.facebook.com` in every row, and a customer who clicks a
 *   Facebook icon expecting to find this business — checking it is real before
 *   letting a stranger into their home — lands on a login wall instead. An
 *   absent icon costs nothing; that one costs trust at the exact moment it is
 *   being decided.
 */

/** Bare platform front pages — the placeholders the settings arrive with. */
const PLACEHOLDER = /^https?:\/\/(www\.)?(facebook|instagram|twitter|x|linkedin|youtube|tiktok|snapchat|threads|whatsapp)\.(com|me)\/?$/i;

const LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  whatsapp: "WhatsApp",
};

/**
 * Inline paths rather than an icon package: the footer would otherwise pull a
 * whole library in for six glyphs, on every page.
 */
const ICONS: Record<string, string> = {
  facebook: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z",
  instagram: "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 5.4a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 7.2a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Zm5.6-7.4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  twitter: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.3 22H3.2l7.3-8.3L2.4 2h6.4l4.4 5.8L18.9 2Zm-1.1 18h1.7L7.3 3.7H5.5L17.8 20Z",
  x: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.3 22H3.2l7.3-8.3L2.4 2h6.4l4.4 5.8L18.9 2Zm-1.1 18h1.7L7.3 3.7H5.5L17.8 20Z",
  linkedin: "M6.9 21H3.4V9h3.5v12ZM5.1 7.4a2 2 0 1 1 0-4.1 2 2 0 0 1 0 4.1ZM21 21h-3.5v-5.8c0-1.4 0-3.2-1.9-3.2s-2.2 1.5-2.2 3.1V21H9.9V9h3.3v1.6h.1a3.7 3.7 0 0 1 3.3-1.8c3.5 0 4.2 2.3 4.2 5.3V21Z",
  youtube: "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2L10 15.2Z",
  tiktok: "M16.6 5.8a4.8 4.8 0 0 1-1.1-3.1h-3.1v12.6a2.6 2.6 0 1 1-1.9-2.5V9.6a5.7 5.7 0 1 0 5 5.6V9.4a7.8 7.8 0 0 0 4.5 1.4V7.7a4.8 4.8 0 0 1-3.4-1.9Z",
  snapchat: "M12 2c2.8 0 4.7 2 4.8 4.8v1.9c.6.2 1.1-.3 1.6-.3.4 0 .9.3.9.7 0 .8-1.6 1-1.9 1.5-.2.4.9 2.8 3 3.5.3.1.5.3.5.6 0 .7-1.6 1-2 1.2-.2.2-.1.9-.5 1-.4.1-1.2-.2-2 0-.7.2-1.5 1.6-3.4 1.6s-2.7-1.4-3.4-1.6c-.8-.2-1.6.1-2 0-.4-.1-.3-.8-.5-1-.4-.2-2-.5-2-1.2 0-.3.2-.5.5-.6 2.1-.7 3.2-3.1 3-3.5-.3-.5-1.9-.7-1.9-1.5 0-.4.5-.7.9-.7.5 0 1 .5 1.6.3V6.8C7.3 4 9.2 2 12 2Z",
  whatsapp: "M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6 0l.9-1.1c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.1.1.6-.1 1.3Z",
};

export function SocialLinks({ links, label }: { links?: SocialMediaLink[]; label: string }) {
  const usable = (links ?? []).filter((link) => {
    const url = (link.link ?? "").trim();
    return (
      Number(link.status) === 1 &&
      url !== "" &&
      !PLACEHOLDER.test(url) &&
      ICONS[(link.media ?? "").toLowerCase()]
    );
  });

  if (usable.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-ink">{label}</h3>
      <ul className="flex flex-wrap gap-2">
        {usable.map((link) => {
          const media = (link.media ?? "").toLowerCase();
          const name = LABELS[media] ?? media;

          return (
            <li key={link.id ?? link.link}>
              <a
                href={link.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                title={name}
                className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d={ICONS[media]} />
                </svg>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
