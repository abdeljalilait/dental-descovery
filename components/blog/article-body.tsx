import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal Markdown subset for article bodies.
 *
 * Posts are authored as plain text in the admin UI, one block per
 * blank-line-separated chunk. Rendering a tiny subset — `##`/`###` headings,
 * `-` bullet lists, `**bold**` and `[text](url)` links — gives articles real
 * heading structure and internal links, which search engines can surface as
 * snippets and sitelinks, without pulling in a Markdown dependency.
 *
 * Everything is composed of React nodes, so an article body can never inject
 * raw HTML.
 */

const LINK_CLASS =
  "font-semibold text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary-dark";

/** Only navigate to schemes that cannot execute script. */
const SAFE_HREF = /^(https?:\/\/|\/|mailto:|tel:)/i;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    // Strip Latin combining accents, then keep any Unicode letter/number so an
    // Arabic heading still gets a meaningful anchor instead of an empty id.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*)|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      nodes.push(
        <strong key={`${keyPrefix}-b${match.index}`} className="font-bold text-foreground">
          {match[2]}
        </strong>
      );
    } else if (match[3] && match[4] && SAFE_HREF.test(match[4])) {
      const label = match[3];
      const href = match[4];
      nodes.push(
        href.startsWith("/") ? (
          <Link key={`${keyPrefix}-a${match.index}`} href={href} className={LINK_CLASS}>
            {label}
          </Link>
        ) : (
          <a
            key={`${keyPrefix}-a${match.index}`}
            href={href}
            className={LINK_CLASS}
            rel="noopener noreferrer"
          >
            {label}
          </a>
        )
      );
    } else {
      // Unsupported link target: leave the raw syntax in place rather than
      // linking somewhere unsafe.
      nodes.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

type BlockKind = "h2" | "h3" | "list" | "paragraph";

function classifyBlock(block: string): BlockKind {
  if (block.startsWith("### ")) return "h3";
  if (block.startsWith("## ")) return "h2";
  const lines = block.split("\n").map((line) => line.trim());
  if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) return "list";
  return "paragraph";
}

export function ArticleBody({ content }: { content: string }) {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  // The drop cap belongs to the opening paragraph, whatever precedes it (an
  // article that starts with a heading or a list still gets one).
  const firstParagraphIndex = blocks.findIndex((block) => classifyBlock(block) === "paragraph");

  return (
    <article className="space-y-5">
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        const kind = classifyBlock(block);

        if (kind === "h3") {
          const text = block.slice(4);
          return (
            <h3 key={key} id={slugify(text) || undefined} className="mt-8 scroll-mt-24 text-xl font-semibold text-foreground">
              {renderInline(text, key)}
            </h3>
          );
        }

        if (kind === "h2") {
          const text = block.slice(3);
          return (
            <h2 key={key} id={slugify(text) || undefined} className="mt-10 scroll-mt-24 text-2xl font-bold text-foreground">
              {renderInline(text, key)}
            </h2>
          );
        }

        if (kind === "list") {
          const lines = block.split("\n").map((line) => line.trim());
          return (
            <ul key={key} className="mt-4 list-disc space-y-2 ps-6 text-muted">
              {lines.map((line, lineIndex) => (
                <li key={`${key}-${lineIndex}`} className="leading-relaxed">
                  {renderInline(line.slice(2), `${key}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={key}
            className={
              index === firstParagraphIndex
                ? "text-lg leading-relaxed text-foreground first-letter:float-left first-letter:me-3 first-letter:text-5xl first-letter:font-extrabold first-letter:leading-[0.85] first-letter:text-primary"
                : "leading-relaxed text-muted"
            }
          >
            {renderInline(block, key)}
          </p>
        );
      })}
    </article>
  );
}
