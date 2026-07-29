/** Renders a JSON-LD structured-data script. Server component. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, server-built content.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
