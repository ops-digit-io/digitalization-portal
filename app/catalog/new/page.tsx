"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/providers";

export default function NewEntryPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <NewEntry />
    </Suspense>
  );
}

function Fallback() {
  const { t } = useI18n();
  return <main className="mx-auto max-w-[640px] px-4 py-6 text-sm text-muted-foreground">{t("common.loading", "Loading…")}</main>;
}

/** Start a new skill or playbook — routes to the shared editor with a template. */
function NewEntry() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const initialType = params.get("type");
  const [type, setType] = useState<"skill" | "playbook" | "contract">(
    initialType === "playbook" || initialType === "contract" ? initialType : "skill",
  );
  const [name, setName] = useState("");

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <main className="mx-auto max-w-[640px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/catalog" className="hover:text-foreground">{t("nav.skillsPlaybooks", "Skills & Playbooks")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("common.new", "New")}</span>
      </nav>
      <h1 className="text-lg font-semibold">{t("common.new", "New")} {type}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("catalog.new.intro", "Give it a name; you'll edit the template, and it saves to the registry.")}</p>

      <Card className="mt-5 p-4">
        <div className="inline-flex rounded-md border p-0.5 text-sm">
          {(["skill", "playbook", "contract"] as const).map((tt) => (
            <button key={tt} onClick={() => setType(tt)} className={`rounded px-3 py-1 ${tt === type ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {tt}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs font-medium text-muted-foreground">{t("catalog.new.name", "Name")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "skill" ? "duplicate-detection" : "s2-triage-sweep"}
          className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {slug && <p className="mt-1 text-xs text-muted-foreground">{t("catalog.new.file", "File:")} {type}s/{slug}.md</p>}
        <Button className="mt-4" disabled={!slug} onClick={() => router.push(`/catalog/${type}/${slug}`)}>
          {t("catalog.new.createEdit", "Create & edit")}
        </Button>
      </Card>
    </main>
  );
}
