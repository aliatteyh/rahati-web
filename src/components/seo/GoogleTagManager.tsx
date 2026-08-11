import Script from "next/script";

/**
 * Loads a Google Tag Manager container, when one is configured.
 *
 * GTM is a box the marketing tags go in — Google Ads conversions, remarketing,
 * Meta or Snap pixels — so adding one later is a change made in Google's own
 * interface rather than a change to this repository and a deploy.
 *
 * ⚠️ Do not put GA4 inside the container while `NEXT_PUBLIC_GTAG_ID` is also
 * set. The site already loads gtag.js directly, and a second GA4 tag firing
 * through GTM counts every visitor twice — the reports do not break, they just
 * quietly read double, which is worse. Use the container for advertising tags
 * only, or remove the direct id first.
 */

/**
 * Rahati's own container.
 *
 * A GTM id is public — readable in the source of every site that uses one — so
 * it sits here rather than only in the hosting dashboard, and the site keeps
 * working without anyone having to remember a deploy-time variable. An
 * environment variable still wins where one is set, so a staging deployment can
 * point at a different container.
 */
const DEFAULT_CONTAINER = "GTM-KL9VBCFS";

export function GoogleTagManager() {
  const id = process.env.NEXT_PUBLIC_GTM_ID || DEFAULT_CONTAINER;
  if (!id) return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');`}
      </Script>

      {/* The fallback for visitors with JavaScript disabled. Google requires it
          immediately after <body> opens; Next places it where this component
          sits, which is the first thing inside body. */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
