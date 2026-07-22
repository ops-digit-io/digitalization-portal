"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NewEntryPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[640px] px-4 py-6 text-sm text-muted-foreground">Loading…</main>}>
      <NewEntry />
    </Suspense>
  );
}

/** Start a new skill or playbook — routes to the shared editor with a template. */
function NewEntry() {
  const router = useRouter();
  const params = useSearchParams();
  const [type, setType] = useState<"skill" | "playbook">(params.get("type") === "playbook" ? "playbook" : "skill");
  const [name, setName] = useState("");

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <main className="mx-auto max-w-[640px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/catalog" className="hover:text-foreground">Skills &amp; Playbooks</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">New</span>
      </nav>
      <h1 className="text-lg font-semibold">New {type}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Give it a name; you&apos;ll edit the template, then open a pull request.</p>

      <Card className="mt-5 p-4">
        <div className="inline-flex rounded-md border p-0.5 text-sm">
          {(["skill", "playbook"] as const).map((tt) => (
            <button key={tt} onClick={() => setType(tt)} className={`rounded px-3 py-1 ${tt === type ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {tt}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs font-medium text-muted-foreground">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "skill" ? "duplicate-detection" : "s2-triage-sweep"}
          className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {slug && <p className="mt-1 text-xs text-muted-foreground">File: {type}s/{slug}.md</p>}
        <Button className="mt-4" disabled={!slug} onClick={() => router.push(`/catalog/${type}/${slug}`)}>
          Create &amp; edit
        </Button>
      </Card>
    </main>
  );
}
