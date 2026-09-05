# Learn Agentic Patterns

Workshop examples from the Devscale AI Product Engineering bootcamp, built with the
[@anvia](https://www.npmjs.com/package/@anvia/core) SDK. Each file demonstrates one
core agentic building block on top of an OpenAI-compatible chat API.

## Patterns

| File | Pattern | What it does |
| --- | --- | --- |
| `src/01-article-refiner.ts` | Multi-step pipeline (Draft → Critique → Rewrite) | Self-contained 3-step article refiner. Step 1 drafts an article from a request, step 2 critiques it as a strict senior editor, step 3 rewrites it into publication-ready output. Includes interactive CLI prompts (`@inquirer/prompts`) and Anvia Studio visualization. All schemas, model setup, pipeline, and entry point combined in one file. |
| `src/02-idea-review-board.ts` | Fan-out / Fan-in review board (`.parallel()` -> `.step()`) | Sends one startup pitch to three reviewer branches (`CEO`, `Analyst`, `CTO`) in parallel, then merges the branch verdicts into one final board decision. Uses structured Zod schemas for each branch and a hybrid merge prompt for stronger LLM synthesis. |

Shared helper lives in `src/models.ts` (OpenAI-compatible client factory with env-driven API key, base URL, and model ID).

## Prerequisites

- Node.js with [pnpm](https://pnpm.io) (the project pins pnpm via `devEngines`)
- An OpenAI-compatible API key — works with OpenRouter, official OpenAI, or any `/v1/chat/completions` compatible provider
- (Optional) A [Tavily](https://app.tavily.com) API key — reserved for future grounding/search patterns, not required by the current examples

## Setup

```bash
pnpm install
cp .env.example .env
# fill in at least OPENAI_API_KEY in .env
```

## Run

### 01 — Article Refiner (Draft → Critique → Rewrite pipeline)

Two run modes, selectable via CLI argument:

```bash
# Interactive CLI mode — prompts for topic, brief, audience, tone, language, word count
pnpm tsx src/01-article-refiner.ts

# Anvia Studio mode — visual pipeline inspector in the browser
pnpm tsx src/01-article-refiner.ts studio
```

Pipeline steps inside:

1. **Draft** — Writer LLM produces `{title, summary, content}` matched to the request.
2. **Critique** — Editor LLM returns structured `{strengths[], issues[], rewritePlan[]}`.
3. **Rewrite** — Editor LLM applies the rewrite plan and returns `{title, summary, content, appliedChanges[]}`.

All step inputs/outputs are typed and Zod-validated end-to-end via the `Pipeline`.

### 02 — Idea Review Board (Pitch → parallel reviewers → merged verdict)

Two run modes, selectable via CLI argument:

```bash
# Interactive CLI mode — prompts for a startup pitch
pnpm tsx src/02-idea-review-board.ts

# Anvia Studio mode — inspect the fan-out / fan-in pipeline in the browser
pnpm tsx src/02-idea-review-board.ts studio
```

Pipeline steps inside:

1. **Parallel board review** — the same pitch is sent to three branches: `CEO`, `Analyst`, and `CTO`.
2. **Merge verdicts** — a final merge step synthesizes the three structured reviews into one board-level decision.

Branch outputs are typed with Zod, and the merge step uses a hybrid approach: structured branch results in code, formatted reviewer sections in the final LLM prompt, and structured schema-validated output again at the end.

## Stack

- [`@anvia/core`](https://www.npmjs.com/package/@anvia/core) — completions, pipelines, structured output
- [`@anvia/openai`](https://www.npmjs.com/package/@anvia/openai) — OpenAI-compatible client
- [`@anvia/studio`](https://www.npmjs.com/package/@anvia/studio) — pipeline visualization (Studio mode)
- [`@inquirer/prompts`](https://www.npmjs.com/package/@inquirer/prompts) — interactive CLI prompts
- [`zod`](https://zod.dev) — request/step/output schemas + `z.infer<>` type extraction
- [`@tavily/core`](https://www.npmjs.com/package/@tavily/core) — web search (reserved for upcoming patterns)
- `tsx` + TypeScript (strict, ESM)
