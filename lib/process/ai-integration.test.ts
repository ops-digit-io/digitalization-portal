/**
 * Every AI module of the Process Funnel, end to end, against a live HTTP mock
 * of the Anthropic Messages API.
 *
 * This is the test that answers "do all modules actually interact with the
 * model?" — not by mocking `llm.chat`, but by standing up a real server that
 * speaks the Messages wire format and letting each module run its full path:
 * assemble the prompt from playbooks and store state, POST it, parse the reply
 * (fenced artefact, fenced JSON, tool_use), grade it, and write the result back
 * into the store. If a prompt stops assembling, a parser stops matching, or the
 * provider stops speaking the protocol, this fails.
 *
 * The mock inspects each request and answers in the shape that request calls
 * for, so it also asserts the requests are well-formed (system present, key
 * header present, tools declared for the analysis agent).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { hasContentMirror } from "../testing/mirror";
import { createServer, type Server } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";

const NOW = "2026-08-01T00:00:00.000Z";

interface Seen {
  system: string;
  tools: { name: string }[];
  hasKeyHeader: boolean;
  maxTokens: number;
  /** Whether the system prompt arrived carrying a cache breakpoint. */
  cached: boolean;
  streamed: boolean;
}
const seen: Seen[] = [];

/**
 * The system prompt goes out as a plain string when it is short and as a block
 * array carrying `cache_control` when it is big enough to cache. Both are the
 * same prompt to a reader, so the mock flattens them — and records which shape
 * it was, because "did the large prompt get its cache marker" is a fact worth
 * asserting over the wire rather than in isolation.
 */
function flatten(system: unknown): { text: string; cached: boolean } {
  if (typeof system === "string") return { text: system, cached: false };
  if (!Array.isArray(system)) return { text: "", cached: false };
  return {
    text: system.map((b: any) => String(b?.text ?? "")).join(""),
    cached: system.some((b: any) => b?.cache_control?.type === "ephemeral"),
  };
}

/** Re-encode a Messages response as the SSE frames a streamed call expects. */
function asSse(msg: Record<string, any>): string {
  const frames: unknown[] = [{ type: "message_start", message: { usage: msg.usage } }];
  (msg.content as Record<string, any>[]).forEach((block, index) => {
    if (block.type === "tool_use") {
      frames.push({ type: "content_block_start", index, content_block: { ...block, input: {} } });
      frames.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: JSON.stringify(block.input) } });
    } else {
      frames.push({ type: "content_block_start", index, content_block: { ...block, text: "" } });
      frames.push({ type: "content_block_delta", index, delta: { type: "text_delta", text: block.text } });
    }
    frames.push({ type: "content_block_stop", index });
  });
  frames.push({ type: "message_delta", delta: { stop_reason: msg.stop_reason }, usage: { output_tokens: msg.usage.output_tokens } });
  frames.push({ type: "message_stop" });
  return frames.map((f) => `event: ${(f as any).type}\ndata: ${JSON.stringify(f)}\n\n`).join("");
}

/** One Messages-API-shaped answer, chosen from what the request asks for. */
function answer(req: { system: string; tools?: { name: string }[] }): Record<string, unknown> {
  const content: Record<string, unknown>[] = [];
  if (req.tools?.some((t) => t.name === "propose_demands")) {
    // the analysis agent — reply with a tool call, as a live model would
    content.push({
      type: "tool_use",
      id: "tu_1",
      name: "propose_demands",
      input: { demands: [{ title: "Wire the ERP export", problem: "Manual re-keying between mail and ERP.", basis: "D2" }] },
    });
  } else if (req.system.includes('"processScatement"') || req.system.includes("processStatement")) {
    // the digest — strict JSON in a fence
    content.push({
      type: "text",
      text:
        '```json\n{"processStatement":"Order intake works but leans on one person.",' +
        '"processScore":{"value":55,"basis":"self-reported latencies"},' +
        '"technologyStatement":"Mail plus ERP, no exports.",' +
        '"technologyScore":{"value":40,"basis":"no interfaces"},' +
        '"confidence":"low","gaps":["no timestamps"]}\n```',
    });
  } else {
    // coaching / section generation / advisory — a fenced markdown artefact
    content.push({
      type: "text",
      text:
        "Understood. Here is the artefact.\n\n```markdown\n# Process profile\n\n## Boundaries\n" +
        "Starts at order arrival, ends at ERP confirmation. Three people touch it.\n```",
    });
  }
  return { content, stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 20 } };
}

let server: Server;
let baseUrl: string;
let dir: string;
const saved: Record<string, string | undefined> = {};

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c: Buffer) => (body += c.toString()));
    req.on("end", () => {
      const parsed = JSON.parse(body) as { system: unknown; tools?: { name: string }[]; max_tokens: number; stream?: boolean };
      const { text, cached } = flatten(parsed.system);
      seen.push({
        system: text,
        tools: parsed.tools ?? [],
        hasKeyHeader: Boolean(req.headers["x-api-key"]),
        maxTokens: parsed.max_tokens,
        cached,
        streamed: parsed.stream === true,
      });
      const msg = answer({ system: text, tools: parsed.tools });
      if (parsed.stream) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.end(asSse(msg));
      } else {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(msg));
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pf-ai-"));
  for (const k of ["PROCESS_DATA_DIR", "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_ORG", "MODEL_PROVIDER", "OPENAI_API_KEY"]) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.PROCESS_DATA_DIR = dir;
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = baseUrl;
  seen.length = 0;
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(dir, { recursive: true, force: true });
});

async function mods() {
  return {
    store: await import("./store"),
    llm: await import("./llm"),
    coach: await import("./coach"),
    digest: await import("./digest"),
    advisory: await import("./advisory"),
    analysis: await import("./analysis"),
    grader: await import("./grader"),
    schemas: await import("./schemas"),
  };
}

describe.skipIf(!hasContentMirror)("every AI module, over the wire", () => {
  it("the provider goes live the moment the key is present", async () => {
    const { llm } = await mods();
    expect(await llm.available()).toBe(true);
    expect(await llm.provider()).toBe("anthropic");
  });

  it("section generation: prompt → model → artefact → grade → store", async () => {
    const { store, llm, coach, grader, schemas } = await mods();
    await store.create({ title: "Order intake", owner: "J. Gabriel", unit: "Ops", anflug: "process" }, NOW);

    const system = await coach.buildSection("order-intake", "profile", "en");
    const out = await llm.chat(system, [{ role: "user", content: "Produce the section now." }], { maxTokens: 6000 });
    const doc = llm.extractArtefact(out.text);
    expect(doc).toContain("# Process profile");

    const schema = schemas.schemaOf("profile");
    const graded = schema ? grader.grade(doc!, schema) : null;
    expect(graded?.score).toBeGreaterThan(0);

    const w = await store.writeSection("order-intake", "profile", doc!, NOW, graded?.score);
    expect(w.filledSections).toContain("profile");
    expect(w.sectionScores.profile).toBe(graded?.score);

    // The request that went out was a real Messages call with the assembled prompt.
    const call = seen[0]!;
    expect(call.hasKeyHeader).toBe(true);
    expect(call.system).toContain("Process Profile");     // section label in the framing
    expect(call.system).toContain("<target-template>");   // template travelled with it
  });

  it("dimension coaching: criteria travel in the system prompt, a turn comes back", async () => {
    const { store, llm, coach } = await mods();
    await store.create({ title: "Order intake", owner: "", unit: "", anflug: "process" }, NOW);

    const out = await llm.chat(await coach.build("order-intake", "D1", "en"), [{ role: "user", content: "Start." }]);
    expect(out.text.length).toBeGreaterThan(0);
    expect(seen[0]!.system).toContain('<criteria dimension="D1">');
    expect(seen[0]!.system).toContain("K1.1");
  });

  it("digest: prompt → strict JSON → parsed → stored with its stamp", async () => {
    const { store, digest } = await mods();
    await store.create({ title: "Order intake", owner: "", unit: "", anflug: "process" }, NOW);
    await store.writeSection("order-intake", "profile", "# Process profile\n\ntext", NOW, 50);

    const d = await digest.generate("order-intake", NOW);
    expect(d.processStatement).toContain("Order intake");
    expect(d.generatedAt).toBe(NOW);

    const stored = await store.readDigest("order-intake");
    expect(stored?.processStatement).toBe(d.processStatement);
    expect(seen[0]!.system).toContain("<anamnesis>");
    // 9 000 output tokens is not something to gamble on finishing inside one
    // request timeout — the digest streams, and the parser must cope with that.
    expect(seen[0]!.streamed).toBe(true);
  });

  it("the big composed prompts travel with a cache breakpoint — the same prefix, every engagement", async () => {
    const { store, llm, coach, advisory } = await mods();
    await store.create({ title: "Order intake", owner: "", unit: "", anflug: "process" }, NOW);
    await store.writeSection("order-intake", "profile", "# Process profile\n\ntext", NOW, 50);

    await llm.chat(await coach.buildSection("order-intake", "profile", "en"), [{ role: "user", content: "go" }], { maxTokens: 6000 });
    await llm.chat(await advisory.build("order-intake", "challenge"), [{ role: "user", content: "go" }]);

    for (const call of seen) {
      expect(call.system.length).toBeGreaterThan(4_000); // these really are the large ones
      expect(call.cached, "a large governance prompt went out uncached").toBe(true);
    }
  });

  it("advisory pass: anamnesis + prior verdicts in, artefact out, stored apart", async () => {
    const { store, llm, advisory } = await mods();
    await store.create({ title: "Order intake", owner: "", unit: "", anflug: "process" }, NOW);
    await store.writeSection("order-intake", "profile", "# Process profile\n\ntext", NOW, 50);
    await store.writeDecisions("order-intake", [
      { advisoryKey: "challenge", proposalId: "P9", title: "Old idea", verdict: "rejected", reason: "tried in 2024", at: NOW, supersedes: null },
    ], NOW);

    const out = await llm.chat(await advisory.build("order-intake", "challenge"), [{ role: "user", content: "Run the pass now." }]);
    const doc = llm.extractArtefact(out.text)!;
    await store.writeAdvisory("order-intake", "challenge", doc, NOW);

    expect(await store.readAdvisory("order-intake", "challenge")).toContain("# Process profile");
    // Prior verdicts must reach the model — a rejected proposal that comes back
    // without "what changed" is the failure the layer exists to prevent.
    expect(seen[0]!.system).toContain("P9");
    expect(seen[0]!.system).toContain("tried in 2024");
  });

  it("analysis agent: declares the propose_demands tool and honours the tool_use reply", async () => {
    const { store, analysis } = await mods();
    await store.create({ title: "Order intake", owner: "", unit: "", anflug: "process" }, NOW);
    await store.rate("order-intake", "K1.1", { level: 2, confidence: "S" }, NOW);

    const r = await analysis.analyse("order-intake", "en");
    expect(r.live).toBe(true);
    expect(r.demands.length).toBeGreaterThan(0);
    expect(r.demands[0]!.title).toBe("Wire the ERP export");
    expect(seen[0]!.tools.map((t) => t.name)).toContain("propose_demands");
  });
});
