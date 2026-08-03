#!/usr/bin/env node
/**
 * Seed a DEMO portfolio through the portal's own HTTP API — for the product video
 * and for local demos where the funnel would otherwise be empty.
 *
 * Nothing here is a fixture the app reads directly. Every case is captured through
 * `/api/intake` and then moved by the same routes a human uses (`edit`, `triage`,
 * `advance`, `business-case`, `requirements`), so what the video shows is the real
 * write path, not a mock. `demands/` still "starts empty" as its README promises:
 * this script writes it at demo time and `--clean` removes exactly what it wrote.
 *
 *   node scripts/demo-seed.mjs           seed (requires the server + CRON_SECRET)
 *   node scripts/demo-seed.mjs --clean   remove every case this script created
 *
 * Env: BASE_URL (default http://127.0.0.1:3111), CRON_SECRET (must match the server).
 */

import { readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3111";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
/** Records the ids this script created so --clean never deletes anything else. */
const MANIFEST = ".demo-seed.json";

/**
 * The demo portfolio. `advance` is how many gates to pass from S1, so the cases
 * spread across the funnel the way a real portfolio does — a couple just captured,
 * most in the middle, one delivered and measured.
 */
const CASES = [
  {
    advance: 3,
    lane: "transform",
    value: { annualGross: 180000, buildEstimate: "35 person-days", annualRunEstimate: "8 person-days", baselineVerified: true },
    requirements: true,
    answers: {
      title: "Scrap attribution at shift granularity",
      problem:
        "Scrap is booked per production order, not per shift, so nobody can tell which shift, machine or material lot produced it. Quality reviews argue about whose number is right instead of about the cause.",
      currentPain:
        "Two quality engineers spend roughly a day and a half each week rebuilding scrap attribution by hand from MES exports and paper logs. The rework that follows a misattributed lot costs an estimated EUR 15k per month.",
      desiredOutcome:
        "Every scrap booking carries shift, line, machine and material lot at the moment it is recorded, and the weekly quality review opens on one agreed number instead of three competing spreadsheets.",
      affectedProcess: "Scrap booking and the weekly quality review. Quality engineering, shift leads and line operators.",
      frequencyScale: "Roughly 400 scrap bookings per week across two lines; the review runs weekly with eight people in the room.",
      constraints: "Must not add clicks for operators at the line. MES stays the system of record for the booking itself.",
      plant: "DE-ALD",
      domain: "quality",
      requester: "quality.engineer@example.com",
    },
  },
  {
    advance: 2,
    lane: "data_ai",
    value: { annualGross: 240000, buildEstimate: "60 person-days", annualRunEstimate: "20 person-days" },
    requirements: true,
    answers: {
      title: "Tender preparation copilot",
      problem:
        "Preparing a tender response means re-reading five years of past tenders to find the passages that still apply. The knowledge sits with three people and leaves with them when they are on holiday.",
      currentPain:
        "A mid-size tender takes eleven working days of specialist time, of which the team estimates six are spent searching rather than writing. Two tenders were missed last year purely on deadline.",
      desiredOutcome:
        "A drafter gets the relevant prior passages, with their source document named, within minutes — and every claim in the draft can be traced back to the tender it came from.",
      affectedProcess: "Tender response preparation in procurement. Bid managers and technical specialists.",
      frequencyScale: "About 40 tenders a year across all plants, each with a 3-6 week window.",
      constraints: "Customer documents are confidential and must not leave the EU. No claim may be generated without a citable source.",
      plant: "ALL",
      domain: "procurement",
      requester: "bid.manager@example.com",
    },
  },
  {
    // S5 is as far as `/advance` can take a case: `advanceDemand` calls `canOpenGate`
    // without the business case, so G5's baseline-verified precondition can never be
    // satisfied from this route. Stops at S5 rather than failing loudly mid-seed.
    advance: 4,
    lane: "transform",
    value: { annualGross: 96000, buildEstimate: "25 person-days", annualRunEstimate: "6 person-days", baselineVerified: true },
    answers: {
      title: "Cause code harmonization across plants",
      problem:
        "Each plant maintains its own downtime cause codes, so the same stoppage is called three different things. Group-level downtime reporting is assembled by hand and nobody fully trusts it.",
      currentPain:
        "One analyst spends four days a month mapping plant codes onto the group taxonomy. Every mapping change silently invalidates the previous month's comparison.",
      desiredOutcome:
        "One governed cause-code taxonomy, mapped once per plant, so group downtime reporting is generated rather than assembled and month-on-month comparisons hold.",
      affectedProcess: "Downtime booking and monthly group reporting. Maintenance planners and the group reporting analyst.",
      frequencyScale: "Around 2,000 downtime bookings a month across four plants.",
      constraints: "Plants keep their local code names in the local UI; harmonization happens on the way into the group layer.",
      plant: "DE-ALD",
      domain: "quality",
      requester: "reporting.analyst@example.com",
    },
  },
  {
    advance: 2,
    lane: "transform",
    value: { annualGross: 90000, buildEstimate: "30 person-days", annualRunEstimate: "10 person-days" },
    answers: {
      title: "Energy baseline per production line",
      problem:
        "Energy is metered at building level, so a line's consumption can only be estimated. Efficiency measures cannot be proven and the savings claimed after a retrofit are never verified.",
      currentPain:
        "The last compressor retrofit was signed off on an estimated saving. A year later nobody can say whether it delivered, and the same estimate is being reused for the next investment.",
      desiredOutcome:
        "Every line has a measured energy baseline, and any efficiency measure can be shown as a before/after on that baseline within one billing period.",
      affectedProcess: "Energy management and investment sign-off. Facility engineering and controlling.",
      frequencyScale: "Six lines, continuous measurement; investment decisions roughly quarterly.",
      constraints: "Sub-metering hardware budget is capped this year, so start with the four highest-consumption lines.",
      plant: "SK-PUC",
      domain: "energy",
      requester: "facility.engineer@example.com",
    },
  },
  {
    advance: 1,
    lane: "continuous_improvement",
    answers: {
      title: "Shift handover digitalization",
      problem:
        "Shift handover happens on a paper sheet that stays in the shift office. What the night shift learned rarely reaches the day shift, and never reaches maintenance.",
      currentPain:
        "Handover takes 20 minutes per shift change and still loses information. Three of last quarter's repeat stoppages were traced to a handover note nobody outside the shift ever saw.",
      desiredOutcome:
        "A handover is captured once, is readable by the next shift and by maintenance, and a recurring issue is visible as recurring rather than as three separate notes.",
      affectedProcess: "Shift handover at line level. Shift leads, operators and maintenance planners.",
      frequencyScale: "Three shift changes a day, seven days a week, on two lines.",
      constraints: "Must work on a shop-floor tablet with gloves on, and must not become a reporting obligation.",
      plant: "DE-ALD",
      domain: "production",
      requester: "shift.lead@example.com",
    },
  },
  {
    advance: 1,
    lane: "innovation",
    answers: {
      title: "Tool wear detection on the CNC cells",
      problem:
        "Tools are changed on a fixed interval, so good tools are scrapped early and worn tools occasionally run into a bad part. The interval is a compromise nobody has revisited in years.",
      currentPain:
        "Estimated EUR 4k a month in tools replaced before end of life, plus two quality escapes last year traced to a tool that went past its limit inside the interval.",
      desiredOutcome:
        "Tool changes are triggered by measured wear rather than by the calendar, with a confidence the cell operator can act on.",
      affectedProcess: "Tool management on the CNC cells. Machine operators and manufacturing engineering.",
      frequencyScale: "Twelve cells, roughly 90 tool changes a week.",
      constraints: "Spindle data is available but only on the newer cells; the older four have no usable signal yet.",
      plant: "DE-ALD",
      domain: "maintenance",
      requester: "manufacturing.engineer@example.com",
    },
  },
  {
    advance: 0,
    lane: "data_ai",
    answers: {
      title: "Supplier quality alerts from incoming inspection",
      problem:
        "Incoming inspection findings are recorded but never aggregated per supplier, so a supplier drifting out of tolerance is only noticed once it causes a line stop.",
      currentPain:
        "Two line stops last quarter, roughly EUR 30k each, both from a supplier whose incoming inspection results had been trending badly for six weeks.",
      desiredOutcome:
        "A supplier trending out of tolerance is flagged to purchasing and quality before it reaches the line, with the inspection history behind the flag.",
      affectedProcess: "Incoming goods inspection and supplier management. Incoming quality and strategic purchasing.",
      frequencyScale: "About 600 inspections a month across 80 active suppliers.",
      constraints: "The supplier scorecard already exists in purchasing; this should feed it, not replace it.",
      plant: "ALL",
      domain: "quality",
      requester: "incoming.quality@example.com",
    },
  },
  {
    advance: 0,
    lane: "regulatory",
    answers: {
      title: "Paperless line clearance record",
      problem:
        "Line clearance before a product changeover is signed on paper and filed in a binder. Retrieving a specific clearance for an audit takes hours and two of them could not be found last year.",
      currentPain:
        "Roughly 90 minutes per audit request, several times a year, plus the standing risk of a finding for a record that cannot be produced.",
      desiredOutcome:
        "A clearance is signed once, is retrievable by product and date in seconds, and the retention period is enforced by the system rather than by the binder.",
      affectedProcess: "Line clearance at changeover. Shift leads, quality assurance and the audit team.",
      frequencyScale: "Around 25 changeovers a week across two lines.",
      constraints: "The signature must satisfy the existing GMP requirement; this is a regulated record, not a convenience form.",
      plant: "SK-PUC",
      domain: "safety",
      requester: "qa.specialist@example.com",
    },
  },
  {
    advance: 1,
    park: "Overlaps with the tender copilot; revisit once that case reaches pilot.",
    lane: "data_ai",
    answers: {
      title: "Chatbot for maintenance manuals",
      problem:
        "Maintenance manuals are PDFs on a shared drive. Finding the right procedure during a stoppage takes longer than the repair, so technicians ask a colleague instead.",
      currentPain:
        "Technicians estimate 10-15 minutes of searching per unplanned stoppage, on roughly 40 stoppages a month.",
      desiredOutcome:
        "A technician asks in plain language at the machine and gets the procedure, with the manual and page it came from.",
      affectedProcess: "Unplanned maintenance response. Maintenance technicians.",
      frequencyScale: "Roughly 40 unplanned stoppages a month.",
      constraints: "Must work offline in the plant's dead zones, which rules out a purely hosted answer.",
      plant: "DE-ALD",
      domain: "maintenance",
      requester: "maintenance.tech@example.com",
    },
  },
];

const SPONSOR = "ops.director@example.com";
const VALUE_OWNER = "plant.controller@example.com";

async function api(path, body, opts = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, json };
}

async function clean() {
  if (!existsSync(MANIFEST)) {
    console.log("no manifest — nothing this script created is on disk");
  } else {
    const ids = JSON.parse(await readFile(MANIFEST, "utf8")).ids ?? [];
    for (const id of ids) {
      await rm(`demands/${id}`, { recursive: true, force: true });
    }
    await rm(MANIFEST, { force: true });
    console.log(`removed ${ids.length} demo case folder(s) from demands/`);
  }
  // The interim buffer and the projection cache are demo-time state either way.
  await rm(".pending-demands", { recursive: true, force: true });
  console.log("removed .pending-demands/");
}

async function seed() {
  if (!CRON_SECRET) {
    console.error("CRON_SECRET is required (it authenticates the buffer flush). Start the server with the same value.");
    process.exit(1);
  }

  const ids = [];
  // 1. Capture every case through the real intake.
  for (const c of CASES) {
    const r = await api("/api/intake", { action: "save", answers: c.answers });
    if (!r.ok || !r.json.id) {
      console.error(`  intake FAILED "${c.answers.title}" → ${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
      continue;
    }
    c.id = r.json.id;
    ids.push(r.json.id);
    console.log(`  captured ${r.json.id}  ${c.answers.title}`);
  }
  await writeFile(MANIFEST, JSON.stringify({ ids, createdAt: new Date().toISOString() }, null, 2));

  // 2. Flush the interim buffer so the cases become funnel pages on disk.
  const flush = await api("/api/cron/flush", {}, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  console.log(`  flush → ${flush.status} ${JSON.stringify(flush.json).slice(0, 160)}`);

  // 3. Move each case the way a human would: name the accountabilities, confirm the
  //    lane, quantify the case, then pass gates one at a time.
  for (const c of CASES) {
    if (!c.id) continue;
    const log = (step, r) => console.log(`  ${c.id} ${step} → ${r.ok ? "ok" : `${r.status} ${JSON.stringify(r.json).slice(0, 120)}`}`);

    log("edit(people)", await api(`/api/demands/${c.id}/edit`, { patch: { sponsor: SPONSOR, value_owner: VALUE_OWNER } }));
    log("lane", await api(`/api/demands/${c.id}/triage`, { action: "assign_lane", lane: c.lane }));

    if (c.value) {
      log("bc(draft)", await api("/api/business-case", { id: c.id, action: "generate" }));
      log("bc(value)", await api("/api/business-case", { id: c.id, action: "set-value", ...c.value }));
    }
    if (c.requirements) {
      log("requirements", await api("/api/requirements", { id: c.id, action: "generate" }));
    }

    for (let i = 0; i < (c.advance ?? 0); i++) {
      const r = await api(`/api/demands/${c.id}/advance`, {});
      log(`advance#${i + 1}`, r);
      if (!r.ok) break;
    }
    if (c.park) {
      log("park", await api(`/api/demands/${c.id}/triage`, { action: "reject", reason: c.park }));
    }
  }

  console.log(`\nseeded ${ids.length} demo case(s). Remove them with: node scripts/demo-seed.mjs --clean`);
}

if (process.argv.includes("--clean")) await clean();
else await seed();
