import simpleGit, { type SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';

const WORKSPACE_DIR = process.env.WORKER_WORKSPACE_DIR || '/tmp/autocode-workspaces';

export interface GitContext {
  git: SimpleGit;
  workDir: string;
  workBranch: string;
}

/**
 * Clone a repository and create a work branch.
 */
export async function cloneAndBranch(opts: {
  cloneUrl: string;
  targetBranch: string;
  workBranch: string;
  accessToken?: string;
  jobId: string;
}): Promise<GitContext> {
  const workDir = path.join(WORKSPACE_DIR, opts.jobId);

  // Ensure workspace dir exists
  await fs.mkdir(workDir, { recursive: true });

  // Inject token into URL if provided
  let cloneUrl = opts.cloneUrl;
  if (opts.accessToken) {
    // https://github.com/user/repo.git → https://<token>@github.com/user/repo.git
    cloneUrl = cloneUrl.replace('https://', `https://${opts.accessToken}@`);
  }

  // Clone
  const git = simpleGit();
  await git.clone(cloneUrl, workDir, ['--branch', opts.targetBranch, '--single-branch', '--depth', '50']);

  // Init git in work dir
  const repoGit = simpleGit(workDir);

  // Create work branch
  await repoGit.checkoutLocalBranch(opts.workBranch);

  return {
    git: repoGit,
    workDir,
    workBranch: opts.workBranch,
  };
}

/**
 * Stage all changes, commit, and push.
 */
export async function commitAndPush(ctx: GitContext, message: string): Promise<string> {
  await ctx.git.add('.');

  // Check if there are changes
  const status = await ctx.git.status();
  if (status.files.length === 0) {
    return 'no-changes';
  }

  // Configure git identity
  await ctx.git.addConfig('user.email', 'autocode-agent@autocode.dev');
  await ctx.git.addConfig('user.name', 'AutoCode Agent');

  await ctx.git.commit(message);
  await ctx.git.push('origin', ctx.workBranch, ['--set-upstream']);

  const log = await ctx.git.log({ maxCount: 1 });
  return log.latest?.hash || 'unknown';
}

/**
 * Get the diff of all changes in the work branch vs target branch.
 */
export async function getDiff(ctx: GitContext, targetBranch: string): Promise<string> {
  try {
    const diff = await ctx.git.diff([`origin/${targetBranch}...${ctx.workBranch}`]);
    return diff || '(no changes)';
  } catch {
    // Fallback: diff against HEAD
    const diff = await ctx.git.diff(['HEAD']);
    return diff || '(no changes)';
  }
}

/**
 * Get recent git log entries (for context building).
 */
export async function getRecentLog(ctx: GitContext, count: number = 10): Promise<string> {
  const log = await ctx.git.log({ maxCount: count });
  return log.all
    .map(c => `${c.hash.slice(0, 7)} ${c.date} ${c.message}`)
    .join('\n');
}

/**
 * Clean up workspace directory after job completes.
 */
export async function cleanupWorkspace(jobId: string): Promise<void> {
  const workDir = path.join(WORKSPACE_DIR, jobId);
  try {
    await fs.rm(workDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}
