import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/**
 * Chat landing — the primary intake surface (`docs/16-ui.md §16.5 Chat`). The
 * opening question asks for what the portal needs, not "How can I help?".
 * The transparency notice is persistent (the AI Act obligation is continuous).
 */
const LOADED_SKILLS = ["intake-conversation", "demand-classification", "duplicate-detection", "lane-proposal"];

export default function ChatLanding() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        What&apos;s the problem you&apos;re seeing?
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Describe it in your own words. The assistant shapes it into a use case —
        you decide what happens next.
      </p>

      <div className="mt-8 w-full">
        <div className="rounded-xl border bg-card p-2 shadow-sm">
          <textarea
            rows={3}
            placeholder="Describe it in your own words…"
            className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {LOADED_SKILLS.map((s) => (
                <Badge key={s} variant="secondary" className="font-normal text-muted-foreground">
                  {s}
                </Badge>
              ))}
            </div>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Link href="/board" className="font-medium text-foreground hover:underline">
          Browse portfolio
        </Link>
        <span aria-hidden>·</span>
        <Link href="/board" className="hover:underline">
          Use a form instead
        </Link>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        AI assistant · drafts only, never approves
      </p>
    </main>
  );
}
