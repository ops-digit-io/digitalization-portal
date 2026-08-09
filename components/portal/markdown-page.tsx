"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mdComponents } from "./md-components";

/** Full-page markdown render (no collapsible chrome) — for the in-app spec reader. */
export function MarkdownPage({ body }: { body: string }) {
  return (
    <div className="prose-portal max-w-none text-sm text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{body}</ReactMarkdown>
    </div>
  );
}
