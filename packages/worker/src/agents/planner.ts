import { callLLMJson, type LLMResponse } from '../llm/gemini.js';
import { getFileTree, readFiles } from '../tools/fileOps.js';
import { getRecentLog, type GitContext } from '../tools/git.js';

// ============ TYPES ============

export interface PlanResult {
  summary: string;
  approach: string;
  filesToModify: FileChange[];
  filesToCreate: FileChange[];
  filesToDelete: string[];
  testStrategy: string;
  estimatedRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tokensUsed: number;
}

export interface FileChange {
  path: string;
  description: string;
}

// ============ PLANNER AGENT ============

const PLANNER_SYSTEM = `You are an expert software planner. Your job is to analyze a codebase and a task, then create a precise execution plan.

Rules:
1. Only propose changes that are necessary to complete the task
2. Minimize the number of files to modify
3. Prefer editing existing files over creating new ones
4. Consider existing patterns and conventions in the codebase
5. Assess risk level honestly based on what files are being touched
6. Your response must be valid JSON only, no markdown or explanations outside the JSON`;

/**
 * Planner Agent: reads task + repo context → creates execution plan
 */
export async function createPlan(
  taskTitle: string,
  taskDescription: string,
  gitCtx: GitContext,
): Promise<PlanResult> {
  // Gather context
  const fileTree = await getFileTree(gitCtx.workDir, 150);
  const recentLog = await getRecentLog(gitCtx, 10);

  // Try to read key files for context
  const keyFiles = identifyKeyFiles(fileTree);
  const fileContents = await readFiles(gitCtx.workDir, keyFiles.slice(0, 5));

  const fileContentStr = Object.entries(fileContents)
    .map(([fp, content]) => `--- ${fp} ---\n${content.slice(0, 2000)}`)
    .join('\n\n');

  const prompt = `
TASK: ${taskTitle}
DESCRIPTION: ${taskDescription}

FILE TREE:
${fileTree}

RECENT GIT LOG:
${recentLog}

KEY FILE CONTENTS:
${fileContentStr}

Analyze this codebase and task. Create an execution plan as JSON:

{
  "summary": "One-line summary of what needs to be done",
  "approach": "Detailed explanation of how you'll implement this",
  "filesToModify": [
    { "path": "relative/path/to/file.ts", "description": "What to change in this file" }
  ],
  "filesToCreate": [
    { "path": "relative/path/to/newfile.ts", "description": "What this new file does" }
  ],
  "filesToDelete": ["relative/path/to/deprecated.ts"],
  "testStrategy": "How to verify the changes work",
  "estimatedRisk": "LOW|MEDIUM|HIGH|CRITICAL"
}

Be precise. Only include files that actually need changes.`;

  const { data, tokensUsed } = await callLLMJson<PlanResult>(prompt, PLANNER_SYSTEM);

  return {
    ...data,
    tokensUsed,
  };
}

/**
 * Identify key files from a file tree for context building.
 */
function identifyKeyFiles(fileTree: string): string[] {
  const files = fileTree.split('\n').filter(f => f.trim().length > 0);
  const priority: string[] = [];
  const secondary: string[] = [];

  for (const file of files) {
    const f = file.trim();
    // High priority: config, entry points, READMEs
    if (/^(package\.json|tsconfig\.json|readme\.md|\.env\.example|main\.(ts|js)|app\.(ts|js)|index\.(ts|js))$/i.test(f.split('/').pop() || '')) {
      priority.push(f);
    }
    // Medium: source files at root src
    else if (/^src\/[^/]+\.(ts|js|py|go|php)$/.test(f)) {
      secondary.push(f);
    }
  }

  return [...priority.slice(0, 5), ...secondary.slice(0, 5)];
}
