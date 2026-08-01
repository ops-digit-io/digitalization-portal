---
name: persona-curation
description: Read a persona library for the gaps that make requirements guesswork — roles cited but never described, domains with no decision-maker, records nobody sourced — and say which conversation would close the most.
capabilities: [view_board]
tools: []
skills: [evidence-standards, stakeholder-mapping]
---

# persona-curation

The persona library is the vocabulary requirements are written in. Its value is
not how many records it holds; it is whether the records a document cites actually
describe somebody real. Read it for that.

## What makes a library thin

1. **Cited but undefined.** A requirements document says "As a shift lead" and no
   record answers to that name. Every one of these is a story written about
   somebody nobody has described. Name the document and the phrase.
2. **No buyer for a domain.** Domains with user personas but no `buyer` or
   `approves budget` record. The business case for that domain rests on an
   assumption about who signs, and nobody has written down what they would object
   to. This is usually the most expensive gap in the library.
3. **Unsourced.** A record with no `sourcedFrom` is a guess with an id on it.
   Guesses are legitimate as starting points and illegitimate as citations —
   distinguish them.
4. **No frictions.** A persona whose goals are recorded but whose frictions are
   not gives acceptance criteria nothing to bite on. The story will pass review
   and fail contact with the work.
5. **Untouched by any demand.** A persona in a domain where no demand has ever
   been raised may be describing a role nobody in that area is asking for. Not
   wrong — just worth knowing before it shapes a requirement.

## What you return

The conversation that would close the most, first. A persona library is improved
by talking to one person, not by editing five records — so rank your suggestions
by how many cited-but-undefined references or unsigned business cases a single
interview would resolve.

For each: who to talk to, what to ask them about, and which existing documents
would stop being guesswork afterwards.

## What you may not do

Do not invent a persona. Do not fill a gap with a plausible role name — that is
precisely how a placeholder becomes a governed definition nobody agreed to. Where
a persona is missing, the finding is that it is missing and who could describe it.

Do not describe a named individual. A persona is a ROLE. If the evidence names a
person, the persona is still the role they hold, and the person is at most the
source you would go and ask.
