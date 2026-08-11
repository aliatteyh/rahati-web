/**
 * The uploaded logo or favicon — or nothing, when none has been uploaded.
 *
 * The API never answers "no image". When the setting is empty it returns the
 * admin panel's own upload placeholder, which is a grey "drop a file here"
 * graphic — so a naive `if (logo)` puts that placeholder in the site header and
 * in the browser tab. Treating those known paths as absent is what lets the
 * header fall back to the brand initial instead.
 */
const PLACEHOLDERS = [
  "banner-upload-file",
  "upload-file",
  "def.png",
  "image-place-holder",
];

export function uploadedImage(url?: string | null): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (PLACEHOLDERS.some((p) => lower.includes(p))) return null;
  return url;
}
