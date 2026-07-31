---
name: process-agent-digest-shape
kind: playbook
summary: The exact JSON shape the digest must return.
---

{
  "processStatement": "two or three sentences: what this process is for and how well it does it today",
  "processScore": { "value": 0-100, "basis": "one sentence naming what drove the number" },
  "technologyStatement": "two or three sentences: what the process runs on and how well that stack serves it",
  "technologyScore": { "value": 0-100, "basis": "one sentence" },
  "tools": [
    {
      "name": "EIP",
      "role": "what it does in this process",
      "velocityOfChange": "high | medium | low",
      "velocityNote": "why — who owns it and how long a change takes",
      "criticalityOfTouch": "high | medium | low",
      "criticalityNote": "what breaks downstream if this is changed badly",
      "demandOfTouch": "high | medium | low",
      "demandNote": "how much this tool is actually asking to be changed"
    }
  ],
  "friction": {
    "actual":    [{ "where": "step or boundary", "what": "what happens", "evidence": "what in the anamnesis says so" }],
    "potential": [{ "where": "...", "what": "what would start hurting, and under what condition" }],
    "prunable":  [{ "where": "...", "what": "what could be removed outright", "cost": "what removing it would cost" }]
  },
  "dependencies": {
    "influences":   [{ "process": "name", "how": "what this process hands them, and what breaks for them if it changes" }],
    "influencedBy": [{ "process": "name", "how": "what they hand this process, and what breaks here if it changes" }]
  },
  "confidence": "high | medium | low",
  "basedOn": ["section keys actually read"],
  "gaps": ["what was missing and therefore left thin"]
}
