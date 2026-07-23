"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Kind = "dashboard" | "app" | "mockup" | "report";
interface RepoRef { owner: string; name: string; url: string; local: boolean }
interface ScaffoldResp { host: string; repo: RepoRef; committedPaths: string[]; spec: string; specPath: string }
interface ArtifactResp { host: string; artifactPath: string; pullRequest: { number: number; url: string; local: boolean }; artifact: string }

const KINDS: { id: Kind; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "app", label: "Web app" },
  { id: "mockup", label: "UI mockup" },
  { id: "report", label: "Report" },
];

export default function PocBuilder() {
  const { id } = useParams<{ id: string }>();
  const [kind, setKind] = useState<Kind>("dashboard");
  const [busy, setBusy] = useState<string | null>(null);
  const [scaffold, setScaffold] = useState<ScaffoldResp | null>(null);
  const [artifact, setArtifact] = useState<ArtifactResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/poc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "request failed");
    return json;
  }

  async function runScaffold() {
    setBusy("scaffold"); setError(null); setArtifact(null);
    try {
      setScaffold(await post({ step: "scaffold", useCaseId: id, kind }));
    } catch (e) { setError(String(e)); } finally { setBusy(null); }
  }

  async function approveAndBuild() {
    if (!scaffold) return;
    setBusy("artifact"); setError(null);
    try {
      setArtifact(await post({ step: "artifact", useCaseId: id, kind, approved: true, repo: scaffold.repo }));
    } catch (e) { setError(String(e)); } finally { setBusy(null); }
  }

  const step = artifact ? 3 : scaffold ? 2 : 1;

  return (
    <main className="mx-auto max-w-[960px] px-4 py-6">
      <nav className="mb-3 text-sm text-muted-foreground">
        <Link href="/board" className="hover:text-foreground">Portfolio</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href={`/uc/${id}`} className="hover:text-foreground">{id}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Build PoC</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">Agentic PoC builder</h1>
        <Badge variant="secondary" className="font-normal">drafts only, never approves</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The assistant creates a use-case repository, drafts a spec for your approval,
        then builds the artifact and opens a pull request. It never merges.
      </p>

      {/* Stepper */}
      <div className="mt-5 flex items-center gap-2 text-sm">
        {["Scaffold repo", "Approve spec", "Build artifact"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`grid size-6 place-items-center rounded-full text-xs ${step > i ? "bg-foreground text-background" : step === i + 1 ? "border-2 border-foreground" : "border text-muted-foreground"}`}>
              {i + 1}
            </span>
            <span className={step === i + 1 ? "font-medium" : "text-muted-foreground"}>{s}</span>
            {i < 2 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
          </div>
        ))}
      </div>

      {error && <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">{error}</div>}

      {/* Step 1 */}
      {!scaffold && (
        <Card className="mt-5 p-4">
          <h2 className="text-sm font-semibold">1 · Create the repository and draft the spec</h2>
          <p className="mt-1 text-xs text-muted-foreground">Choose what the PoC should produce.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`rounded-full border px-3 py-1 text-xs ${kind === k.id ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <Button className="mt-4" onClick={runScaffold} disabled={busy !== null}>
            {busy === "scaffold" ? "Creating repository…" : "Scaffold repo & draft spec"}
          </Button>
        </Card>
      )}

      {/* Step 2: repo created, spec drafted, awaiting approval */}
      {scaffold && (
        <Card className="mt-5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">2 · Repository created — review the drafted spec</h2>
            <Badge variant="outline" className="font-normal">{scaffold.host === "github" ? "GitHub" : "local workspace"}</Badge>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-mono">{scaffold.repo.name}</span> · {scaffold.committedPaths.length} files committed
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-muted-foreground sm:grid-cols-3">
            {scaffold.committedPaths.map((p) => <li key={p}>✓ {p}</li>)}
          </ul>

          <div className="mt-4">
            <div className="mb-1 text-xs font-medium">{scaffold.specPath} <span className="text-muted-foreground">· drafted by the assistant</span></div>
            <pre className="max-h-72 overflow-auto rounded bg-secondary/60 p-3 text-xs leading-relaxed">{scaffold.spec}</pre>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-info/30 bg-info/5 p-3">
            <div className="text-sm">
              <span className="font-medium">Human checkpoint.</span>{" "}
              <span className="text-muted-foreground">The artifact is built only after you approve this spec.</span>
            </div>
            <Button className="ml-auto" onClick={approveAndBuild} disabled={busy !== null || artifact !== null}>
              {busy === "artifact" ? "Building…" : "Approve spec & build"}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: artifact built, PR opened, preview */}
      {artifact && (
        <Card className="mt-5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">3 · Artifact built — pull request opened</h2>
            <Badge className="font-normal">PR #{artifact.pullRequest.number}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono">{artifact.artifactPath}</span> committed on <span className="font-mono">poc/artifact</span> ·
            a human reviews and merges — the portal never merges.
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border">
            <div className="border-b bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground">Preview · {artifact.artifactPath}</div>
            <iframe title="PoC artifact preview" srcDoc={artifact.artifact} className="h-[420px] w-full bg-white" />
          </div>
        </Card>
      )}
    </main>
  );
}
