import { callLLMJson } from '../llm/gemini.js';

// ============ TYPES ============

export interface ReviewResult {
  safetyScore: number;     // 0.0 to 1.0
  summary: string;
  concerns: string[];
  suggestions: string[];
  shouldAutoMerge: boolean;
  tokensUsed: number;
}

// ============ REVIEWER AGENT ============

const REVIEWER_SYSTEM = `You are an expert code reviewer focused on safety and quality. Your job is to review a diff and assess whether it's safe to merge automatically.

Scoring guide:
- 0.9-1.0: Perfect, trivial change, safe to auto-merge
- 0.7-0.89: Good quality, minor issues, acceptable with review
- 0.5-0.69: Concerning, needs human review before merge
- 0.3-0.49: Risky, significant issues found
- 0.0-0.29: Dangerous, do not merge

Focus on:
1. Security issues (SQL injection, XSS, auth bypass, secret exposure)
2. Data loss risk (destructive operations, missing backups)
3. Breaking changes (API changes, schema changes)
4. Code quality (error handling, edge cases)
5. Test coverage (are new paths tested?)

Your response must be valid JSON only.`;

/**
 * Reviewer Agent: reviews a diff and scores safety
 */
export async function reviewDiff(
  diff: string,
  taskTitle: string,
  taskDescription: string,
): Promise<ReviewResult> {
  const prompt = `
TASK: ${taskTitle}
DESCRIPTION: ${taskDescription}

DIFF TO REVIEW:
\`\`\`diff
${diff.slice(0, 15000)}
\`\`\`

Review this diff and respond with JSON:

{
  "safetyScore": 0.85,
  "summary": "One paragraph summary of what changed and whether it's safe",
  "concerns": ["List of specific concerns, if any"],
  "suggestions": ["List of improvement suggestions, if any"],
  "shouldAutoMerge": false
}

Be honest and specific. Don't inflate the safety score.`;

  const { data, tokensUsed } = await callLLMJson<Omit<ReviewResult, 'tokensUsed'>>(prompt, REVIEWER_SYSTEM);

  return {
    ...data,
    safetyScore: Math.max(0, Math.min(1, data.safetyScore)), // clamp 0-1
    tokensUsed,
  };
}
