/**
 * Renders a JSON-LD structured-data block. Server component.
 *
 * `JSON.stringify` does not escape `<`, so a value containing a closing script
 * tag ends the block early and everything after it is parsed as page script.
 * Nothing here comes from a customer — the fields are the business name,
 * address and service titles from the admin panel — but the same reasoning
 * applies as to the policy pages: one stolen admin session should not become
 * script running in every visitor's browser.
 *
 * Escaping the three characters that can break out costs nothing and leaves the
 * JSON valid, because a `<` escape parses back to the original character.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
