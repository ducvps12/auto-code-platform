import { callLLM } from '../llm/gemini.js';
import { readFile, writeFile, fileExists } from '../tools/fileOps.js';
import type { PlanResult, FileChange } from './planner.js';

// ============ TYPES ============

export interface CodeResult {
  filesModified: string[];
  filesCreated: string[];
  filesDeleted: string[];
  totalTokensUsed: number;
  errors: string[];
}

// ============ CODER AGENT ============

const CODER_SYSTEM = `You are an expert software developer. Your job is to edit code files precisely according to instructions.

Rules:
1. Return ONLY the complete new file content, nothing else
2. Do not wrap in markdown code blocks
3. Do not add explanations before or after the code
4. Preserve existing code style, indentation, and conventions
5. Make minimal changes to complete the task
6. Ensure the output is syntactically correct
7. If adding imports, place them with existing imports
8. Do NOT add comments like "// Added by AutoCode" unless the codebase style uses such comments`;

/**
 * Coder Agent: takes a plan and execute file changes
 */
export async function executeCode(
  plan: PlanResult,
  workDir: string,
): Promise<CodeResult> {
  const result: CodeResult = {
    filesModified: [],
    filesCreated: [],
    filesDeleted: [],
    totalTokensUsed: 0,
    errors: [],
  };

  // 1. Modify existing files
  for (const change of plan.filesToModify) {
    try {
      const modified = await modifyFile(workDir, change);
      result.totalTokensUsed += modified.tokensUsed;
      result.filesModified.push(change.path);
    } catch (err) {
      result.errors.push(`Failed to modify ${change.path}: ${(err as Error).message}`);
    }
  }

  // 2. Create new files
  for (const change of plan.filesToCreate) {
    try {
      const created = await createFile(workDir, change);
      result.totalTokensUsed += created.tokensUsed;
      result.filesCreated.push(change.path);
    } catch (err) {
      result.errors.push(`Failed to create ${change.path}: ${(err as Error).message}`);
    }
  }

  // 3. Delete files (mark as deleted, let git handle)
  for (const filePath of plan.filesToDelete) {
    try {
      const exists = await fileExists(workDir, filePath);
      if (exists) {
        const fs = await import('fs/promises');
        const path = await import('path');
        await fs.unlink(path.join(workDir, filePath));
        result.filesDeleted.push(filePath);
      }
    } catch (err) {
      result.errors.push(`Failed to delete ${filePath}: ${(err as Error).message}`);
    }
  }

  return result;
}

/**
 * Modify an existing file using LLM.
 */
async function modifyFile(
  workDir: string,
  change: FileChange,
): Promise<{ tokensUsed: number }> {
  const currentContent = await readFile(workDir, change.path);

  const prompt = `
CURRENT FILE: ${change.path}
\`\`\`
${currentContent}
\`\`\`

INSTRUCTION: ${change.description}

Return the complete updated file content. Only make changes described in the instruction. Keep everything else exactly the same.`;

  const response = await callLLM(prompt, CODER_SYSTEM);
  let newContent = response.text;

  // Strip markdown code blocks if LLM wrapped it
  const codeBlockMatch = newContent.match(/^```[\w]*\n([\s\S]*)\n```$/);
  if (codeBlockMatch) {
    newContent = codeBlockMatch[1];
  }

  await writeFile(workDir, change.path, newContent);
  return { tokensUsed: response.tokensUsed };
}

/**
 * Create a new file using LLM.
 */
async function createFile(
  workDir: string,
  change: FileChange,
): Promise<{ tokensUsed: number }> {
  const prompt = `
CREATE NEW FILE: ${change.path}
DESCRIPTION: ${change.description}

Generate the complete file content for this new file. Follow standard best practices for this file type.`;

  const response = await callLLM(prompt, CODER_SYSTEM);
  let content = response.text;

  // Strip markdown code blocks if LLM wrapped it
  const codeBlockMatch = content.match(/^```[\w]*\n([\s\S]*)\n```$/);
  if (codeBlockMatch) {
    content = codeBlockMatch[1];
  }

  await writeFile(workDir, change.path, content);
  return { tokensUsed: response.tokensUsed };
}

/**
 * Attempt to fix code based on error output.
 */
export async function fixCode(
  workDir: string,
  filePath: string,
  errorOutput: string,
): Promise<{ tokensUsed: number }> {
  const currentContent = await readFile(workDir, filePath);

  const prompt = `
FILE: ${filePath}
\`\`\`
${currentContent}
\`\`\`

ERROR OUTPUT:
\`\`\`
${errorOutput.slice(0, 3000)}
\`\`\`

Fix the code to resolve this error. Return the complete corrected file content.`;

  const response = await callLLM(prompt, CODER_SYSTEM);
  let fixed = response.text;

  const codeBlockMatch = fixed.match(/^```[\w]*\n([\s\S]*)\n```$/);
  if (codeBlockMatch) {
    fixed = codeBlockMatch[1];
  }

  await writeFile(workDir, filePath, fixed);
  return { tokensUsed: response.tokensUsed };
}
