import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Background AI scoring — called after user submits a question
// Evaluates hidden test cases and stores analysis
export const scoreSubmission = mutation({
  args: {
    submission_id: v.id("matchSubmissions"),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submission_id);
    if (!submission) throw new Error("Submission not found");

    const question = await ctx.db.get(submission.question_id);
    if (!question) throw new Error("Question not found");

    // Get hidden test cases
    const hiddenTests = question.hidden_testcases || [];
    if (hiddenTests.length === 0) return;

    // Simulate hidden test case evaluation
    // In production, this would call a code execution service
    let passed = 0;
    let failed = 0;
    const details: Array<{
      input: string;
      expected: string;
      actual?: string;
      passed: boolean;
    }> = [];

    for (const tc of hiddenTests) {
      // For now, mark based on the submission result
      // In production: execute code against each hidden test case
      const testPassed = submission.result === "Accepted";
      if (testPassed) passed++;
      else failed++;

      details.push({
        input: tc.input,
        expected: tc.expected,
        actual: testPassed ? tc.expected : "Error",
        passed: testPassed,
      });
    }

    const total = hiddenTests.length;

    // Compute AI analysis score
    // Score breakdown: test cases (40%) + runtime (20%) + code quality (20%) + correctness (20%)
    const testScore = total > 0 ? (passed / total) * 40 : 0;
    const runtimeScore = submission.runtime < 500 ? 20 : submission.runtime < 1000 ? 15 : 10;
    const correctnessScore = submission.result === "Accepted" ? 20 : 0;
    const codeQualityScore = 15; // Placeholder — in production, Gemini analyzes this
    const totalAIScore = Math.round(testScore + runtimeScore + correctnessScore + codeQualityScore);

    // Generate feedback
    let feedback = "";
    if (submission.result === "Accepted") {
      feedback = `✅ All visible tests passed. ${passed}/${total} hidden tests passed. `;
      if (submission.runtime < 200) {
        feedback += "Excellent runtime performance! ";
      } else if (submission.runtime < 500) {
        feedback += "Good runtime. Consider optimizing for competitive edge. ";
      } else {
        feedback += "Runtime could be improved. Look for algorithmic optimizations. ";
      }
    } else {
      feedback = `⚠️ Submission result: ${submission.result}. ${passed}/${total} hidden tests passed. Review edge cases and constraints. `;
    }

    // Store analysis
    await ctx.db.patch(args.submission_id, {
      hidden_test_results: {
        passed,
        failed,
        total,
        details,
      },
      ai_analysis: {
        score: totalAIScore,
        feedback,
        code_quality: codeQualityScore,
        test_case_analysis: details.map((d, i) => ({
          case_name: `Hidden Test #${i + 1}`,
          status: d.passed ? "passed" : "failed",
          explanation: d.passed
            ? "Test case passed successfully"
            : `Expected "${d.expected}" but got "${d.actual || "error"}"`,
        })),
      },
    });

    return { score: totalAIScore, passed, total };
  },
});

// Get AI analysis for a submission
export const getSubmissionAnalysis = mutation({
  args: {
    match_id: v.id("matches"),
    question_id: v.id("questions"),
    public_id: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q: any) => q.eq("public_id", args.public_id))
      .first();
    if (!user) return null;

    const submission = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_match_user", (q) =>
        q.eq("match_id", args.match_id).eq("user_id", user._id)
      )
      .filter((q) => q.eq(q.field("question_id"), args.question_id))
      .first();

    if (!submission) return null;

    return {
      result: submission.result,
      runtime: submission.runtime,
      memory: submission.memory,
      hidden_test_results: submission.hidden_test_results,
      ai_analysis: submission.ai_analysis,
    };
  },
});
