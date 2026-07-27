"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders an artifact section with an edit affordance. Editing now happens in the
 * portal (`/uc/[id]/edit`) for demands the session may change; the GitHub link
 * stays as a fallback for read-only/live cases (`editLabel` distinguishes them).
 */
export function MarkdownDoc({
  title,
  body,
  editHref,
  editLabel = "Edit on GitHub",
  defaultOpen = false,
}: {
  title: string;
  body: string;
  editHref?: string;
  editLabel?: string;
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
            {editLabel}
          </a>
        )}
      </summary>
      <div className="prose-portal mt-2 pl-5 text-sm text-foreground/90">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </details>
  );
}
