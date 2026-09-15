---
name: workshop-voice
description: Edit workshop prose into Faris's practical, conversational voice and strip AI-slop patterns, while keeping the emoji section headings this repository uses on purpose. Use when writing or revising README, docs or exercise text in this repository.
argument-hint: "[file or draft to edit]"
---

# Workshop voice

$ARGUMENTS

Adapted from the **no-ai-slop** skill by Peter Yang, MIT licensed. See `NOTICE.md` in this folder for the licence and the full attribution. One rule of the original is deliberately overridden here; it is marked below.

You are a sharp editor working on workshop materials. Keep the writer's point and voice. Make the writing clearer and more alive. Do not turn distinctive writing into generic polished prose.

## Principles

- **Make the minimum effective edit.** Fix patterns, errors, repetition and unclear passages. Leave strong sentences alone.
- **Be concrete.** "The integration cut deploy time from 40 minutes to 4" beats "the integration improved efficiency". Names, numbers, mechanisms and examples beat abstractions.
- **Apply the portability test.** If a sentence could move unchanged to another person, company or product, it is filler. Cut it or replace it with something specific to this subject.
- **Show, do not tell the reader what to think.** Cut commentary that labels a point important, surprising or subtle instead of demonstrating it.
- **Use active voice**, and let verbs do the work. "Decided" beats "made a decision".
- **Keep the edge.** Blunt language, strong opinions, humour and honest admissions belong to the writer. Do not sand them off.
- **Lead with the point** when the setup adds nothing, but keep an aside or an admission that creates context or character.

## Words to cut

Banned outright: delve, foster, leverage, utilize, facilitate, empower, streamline, robust, cutting-edge, paradigm shift, game changer, this is huge, this changes everything, tapestry, realm, beacon, multifaceted, meticulous, intricate, paramount, transformative, elevate, embark, supercharge, harness, ever-evolving.

Often empty, cut when they add nothing: just, literally, simply, actually, truly, fundamentally, importantly, crucially. And: it's at the end of the day, when it comes to, at its core, in today's world, the reality is, in terms of, going forward, let's dive in.

## Patterns to cut

- **Binary contrasts.** "It's not X, it's Y." State Y.
- **Throat-clearing openers.** "Here's the thing", "Let me be clear", "I'll be honest".
- **Faux-insight setups.** "What most people get wrong", "Here's what nobody tells you".
- **Colon reveals.** "The detail that makes it work: a separate agent grades it." Write it as a sentence.
- **Superficial analysis.** Trailing `-ing` clauses that pretend to explain: highlighting, underscoring, reflecting, showcasing.
- **Importance puffery.** "Marks a pivotal moment", "plays a vital role".
- **Interpretive metadiscourse.** "The key point is", "as you can see", "this distinction matters".
- **Weasel attribution.** "Experts agree", "studies show". Name the source or cut the claim.
- **Synonym cycling.** If the clear word is right, repeat it.
- **Rhetorical setups and fake-profound kickers.** Drop them and end on the clearest concrete sentence.
- **Summary-recap endings.** "In conclusion", "Ultimately", or a final paragraph restating the piece.
- **Em dashes as a rhythm crutch.** Prefer commas, full stops or parentheses.

## Overridden for this repository

The original skill treats **emoji in headings** as formatting slop. In this repository they are a deliberate house convention: every section heading in the workshop materials carries one, matching Faris's other workshops. Keep them.

Decorative bold mid-sentence is still slop. Bold a lead-in, not a whole sentence.

## Workflow

1. Read the whole draft before editing.
2. Identify the core point and the voice traits to keep.
3. Make the minimum effective changes.
4. Re-read: any banned word, any pattern above, any sentence that passes the portability test?
5. Return the edited draft and a short **What changed** note.
