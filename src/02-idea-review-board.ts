import { generateCompletion } from "@anvia/core";
import { Pipeline } from "@anvia/core/pipeline";
import { Studio } from "@anvia/studio";
import { input } from "@inquirer/prompts";
import z from "zod";
import { model } from "./models.js";

const REVIEW_VERDICTS = [
  "strong_yes",
  "yes_with_conditions",
  "needs_iteration",
  "pass",
] as const;

const IdeaPitchSchema = z.object({
  pitch: z.string().trim().min(20),
});

const ReviewerAssessmentSchema = z.object({
  verdict: z.enum(REVIEW_VERDICTS),
  summary: z.string().min(1),
  strengths: z.array(z.string()).min(2).max(5),
  concerns: z.array(z.string()).min(2).max(5),
  nextQuestions: z.array(z.string()).min(1).max(3),
});

const BoardMergeSchema = z.object({
  finalVerdict: z.enum(REVIEW_VERDICTS),
  boardSummary: z.string().min(1),
  consensus: z.array(z.string()).min(1).max(5),
  disagreements: z.array(z.string()).max(5),
  nextActions: z.array(z.string()).min(3).max(5),
});

type ReviewerName = "CEO" | "Analyst" | "CTO";

type ReviewerAssessment = z.infer<typeof ReviewerAssessmentSchema> & {
  reviewer: ReviewerName;
};

type ParallelBoardReviews = {
  ceo: ReviewerAssessment;
  analyst: ReviewerAssessment;
  cto: ReviewerAssessment;
};

const CEO_REVIEW_INSTRUCTIONS = `
You are a startup CEO reviewing a new startup pitch.
Focus on business clarity, founder-market fit, monetization potential, and whether this idea is worth pursuing now.
Be direct, practical, and decisive.
Return structured output only.
`;

const ANALYST_REVIEW_INSTRUCTIONS = `
You are a startup analyst reviewing a new startup pitch.
Focus on target market clarity, demand signals, competition, positioning, defensibility, and GTM assumptions.
Be analytical, specific, and evidence-oriented even when the pitch is early-stage.
Return structured output only.
`;

const CTO_REVIEW_INSTRUCTIONS = `
You are a CTO reviewing a new startup pitch.
Focus on technical feasibility, product scope, implementation complexity, data dependencies, scalability, and delivery risk.
Be practical and highlight what could break or slow execution.
Return structured output only.
`;

const MERGE_BOARD_INSTRUCTIONS = `
You are the chair of an idea review board.
You receive three reviews of the same startup pitch from a CEO, an Analyst, and a CTO.
Merge them into one final board verdict.

Rules:
- Balance ambition with realism.
- Summarize where the reviewers agree.
- Call out meaningful disagreements if they exist.
- Recommend concrete next actions for the founder.
- Return structured output only.
`;

function formatReviewerSection(
  label: ReviewerName,
  review: ReviewerAssessment,
) {
  const tag = label.toLowerCase();

  return `
Result from ${label}:
<${tag}-review>
Verdict: ${review.verdict}
Summary: ${review.summary}

Strengths:
${review.strengths.map((item) => `- ${item}`).join("\n")}

Concerns:
${review.concerns.map((item) => `- ${item}`).join("\n")}

Next questions:
${review.nextQuestions.map((item) => `- ${item}`).join("\n")}
</${tag}-review>
`.trim();
}

function createReviewerBranch(
  id: string,
  reviewer: ReviewerName,
  instructions: string,
) {
  return new Pipeline({
    id,
    name: `${reviewer} Branch`,
    description: `${reviewer} reviews the startup pitch from their own perspective.`,
    inputSchema: IdeaPitchSchema,
  }).step({
    id: `${id}-review`,
    name: `${reviewer} review`,
    run: async ({ input }) => {
      const result = await generateCompletion({
        model,
        instructions,
        prompt: `Startup pitch:\n${input.pitch}`,
        outputSchema: ReviewerAssessmentSchema,
      });

      return {
        reviewer,
        ...result.output,
      } satisfies ReviewerAssessment;
    },
  });
}

const ceoBranch = createReviewerBranch(
  "ceo-review-branch",
  "CEO",
  CEO_REVIEW_INSTRUCTIONS,
);

const analystBranch = createReviewerBranch(
  "analyst-review-branch",
  "Analyst",
  ANALYST_REVIEW_INSTRUCTIONS,
);

const ctoBranch = createReviewerBranch(
  "cto-review-branch",
  "CTO",
  CTO_REVIEW_INSTRUCTIONS,
);

export const ideaReviewBoard = new Pipeline({
  id: "idea-review-board",
  name: "Idea Review Board",
  description:
    "Fan one startup pitch to CEO, Analyst, and CTO branches, then merge the verdicts.",
  inputSchema: IdeaPitchSchema,
})
  .parallel({
    id: "parallel-board-review",
    name: "Parallel board review",
    description: "Send the same pitch to the CEO, Analyst, and CTO branches.",
    branches: {
      ceo: ceoBranch,
      analyst: analystBranch,
      cto: ctoBranch,
    },
  })
  .step({
    id: "merge-verdicts",
    name: "Merge verdicts",
    run: async ({ input }) => {
      const branchReviews = input as ParallelBoardReviews;
			console.log("input merge-verdict: ", branchReviews);
      const boardReviewsPrompt = [
        formatReviewerSection("CEO", branchReviews.ceo),
        formatReviewerSection("Analyst", branchReviews.analyst),
        formatReviewerSection("CTO", branchReviews.cto),
      ].join("\n\n");

			console.log("boardReviewsPrompt: ", boardReviewsPrompt);

      const result = await generateCompletion({
        model,
        instructions: MERGE_BOARD_INSTRUCTIONS,
        prompt: boardReviewsPrompt,
        outputSchema: BoardMergeSchema,
      });

      return {
        branchReviews,
        ...result.output,
      };
    },
  });

export type IdeaPitchInput = z.infer<typeof IdeaPitchSchema>;

async function runIdeaReviewBoard(pitch: string) {
  const result = await ideaReviewBoard.run({
    input: { pitch },
  });

  return result.output;
}

async function runCli() {
  const pitch = await input({
    message: "Startup pitch:",
    validate: (value) =>
      value.trim().length >= 20 ||
      "Masukkan pitch minimal 20 karakter agar reviewer punya konteks yang cukup.",
  });

  console.log("\nRunning Idea Review Board: Pitch -> CEO/Analyst/CTO -> Merge...\n");

  const reviewBoardResult = await runIdeaReviewBoard(pitch);

  console.log("=== Individual Reviews ===\n");

  for (const review of Object.values(reviewBoardResult.branchReviews)) {
    console.log(`${review.reviewer}`);
    console.log(`Verdict: ${review.verdict}`);
    console.log(`Summary: ${review.summary}`);
    console.log("Strengths:");
    for (const strength of review.strengths) {
      console.log(`- ${strength}`);
    }
    console.log("Concerns:");
    for (const concern of review.concerns) {
      console.log(`- ${concern}`);
    }
    console.log("Next questions:");
    for (const question of review.nextQuestions) {
      console.log(`- ${question}`);
    }
    console.log("");
  }

  console.log("=== Merged Board Verdict ===\n");
  console.log(`Final verdict: ${reviewBoardResult.finalVerdict}`);
  console.log(`Summary: ${reviewBoardResult.boardSummary}`);
  console.log("Consensus:");
  for (const item of reviewBoardResult.consensus) {
    console.log(`- ${item}`);
  }

  if (reviewBoardResult.disagreements.length > 0) {
    console.log("Disagreements:");
    for (const item of reviewBoardResult.disagreements) {
      console.log(`- ${item}`);
    }
  }

  console.log("Next actions:");
  for (const action of reviewBoardResult.nextActions) {
    console.log(`- ${action}`);
  }
}

async function runStudio() {
  console.log("Starting Anvia Studio for Idea Review Board at http://localhost:4021/ui/playground");
  await new Studio([ideaReviewBoard]).serve({
    port: 4021,
  });
}

if (process.argv[2] === "studio") {
  await runStudio();
} else {
  await runCli();
}
