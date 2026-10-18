import { headers } from "next/headers";

/**
 * Renders a JSON-LD graph.
 *
 * The script carries the request's CSP nonce. With a `script-src 'nonce-...'`
 * policy, an un-nonced script here would be blocked and the structured data
 * would silently disappear from the page. Reading `headers()` is fine because
 * every page that renders this is already request-time (`force-dynamic`).
 */
export async function StructuredData({ data }: { data: object }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
