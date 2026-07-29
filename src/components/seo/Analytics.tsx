import Script from "next/script";

/**
 * Loads Google gtag.js (GA4 / Google Ads) only when NEXT_PUBLIC_GTAG_ID is set.
 * The same base tag supports Google Ads conversion events.
 */
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GTAG_ID;
  if (!id) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
