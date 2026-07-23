"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders an artifact section with an "Edit on GitHub" affordance — the portal
 * displays; the repository is where editing happens (`docs/16-ui.md §16.4`,
 * constraint: no in-portal editing).
 */
export function MarkdownDoc({
  title,
  body,
  editHref,
  defaultOpen = false,
}: {
  title: string;
  body: string;
  editHref?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b py-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
        <span className="text-muted-foreground transition-transform group-open:rotate-90">▸</span>
        {title}
        {editHref && (
          <a
            href={editHref}
            className="ml-auto text-xs font-normal text-info hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Edit on GitHub
          </a>
        )}
      </summary>
      <div className="prose-portal mt-2 pl-5 text-sm text-foreground/90">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </details>
  );
}
