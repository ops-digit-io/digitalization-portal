import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalHost } from "./local-host.js";

let root: string;
afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });

describe("LocalHost read/write", () => {
  it("writes, reads back, and lists a directory", async () => {
    root = await mkdtemp(join(tmpdir(), "gh-"));
    const host = new LocalHost({ root });
    const repo = await host.createRepo("du-demands");

    await host.putFile(repo, { path: "demands/UC-1/README.md", content: "# UC-1" }, "seed", "main");
    await host.putFile(repo, { path: "demands/UC-1/requirements.md", content: "# reqs" }, "seed", "main");

    expect(await host.getFile(repo, "demands/UC-1/README.md")).toBe("# UC-1");
    expect(await host.getFile(repo, "demands/missing.md")).toBeUndefined();

    const top = await host.listDir(repo, "demands");
    expect(top.map((e) => e.name)).toContain("UC-1");
    expect(top.find((e) => e.name === "UC-1")!.type).toBe("dir");

    const inCase = await host.listDir(repo, "demands/UC-1");
    expect(inCase.map((e) => e.name).sort()).toEqual(["README.md", "requirements.md"]);
    expect(inCase.every((e) => e.type === "file")).toBe(true);
    expect(await host.listDir(repo, "nope")).toEqual([]);
  });
});
