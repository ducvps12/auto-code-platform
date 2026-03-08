import { prisma } from '@auto-code/database';
import { isValidTransition, RISK_AUTO_MERGE, AUTO_MERGE_SAFETY_THRESHOLD } from '@auto-code/shared';
import type { JobStatus, StepPhase } from '@auto-code/shared';
import { cloneAndBranch, commitAndPush, getDiff, cleanupWorkspace, type GitContext } from './tools/git.js';
import { createPlan, type PlanResult } from './agents/planner.js';
import { executeCode, fixCode } from './agents/coder.js';
import { reviewDiff, type ReviewResult } from './agents/reviewer.js';
import { runCommand, detectTestCommand } from './tools/shell.js';
import { createPullRequest, formatPRBody } from './tools/github.js';
import { estimateCost } from './llm/gemini.js';

// ============ TYPES ============

export interface ExecutionResult {
  success: boolean;
  finalStatus: JobStatus;
  prUrl?: string;
  safetyScore?: number;
  diffSummary?: string;
  tokensUsed: number;
  costUsd: number;
  error?: string;
}

// ============ MAIN EXECUTOR ============

/**
 * Execute a single job end-to-end.
 * This is the core of the entire system.
 */
export async function executeJob(jobId: string): Promise<ExecutionResult> {
  let totalTokens = 0;
  let gitCtx: GitContext | null = null;

  try {
    // 1. Load job + repo data
    const job = await prisma.job.findUniqueOrThrow({
      where: { id: jobId },
      include: { repo: true },
    });

    // Update job status
    await updateJobStatus(jobId, 'PLANNING');

    // 2. Create a Run record
    const existingRuns = await prisma.run.count({ where: { jobId } });
    const run = await prisma.run.create({
      data: {
        jobId,
        attempt: existingRuns + 1,
      },
    });

    const log = createLogger(run.id);

    // Generate work branch name
    const workBranch = `autocode/${job.id.slice(0, 8)}`;

    // ================================================================
    // STEP 1: CLONE
    // ================================================================
    await createStep(run.id, 'CLONE', 1);
    await log('INFO', `Cloning ${job.repo.cloneUrl} (branch: ${job.targetBranch || job.repo.defaultBranch})`);

    gitCtx = await cloneAndBranch({
      cloneUrl: job.repo.cloneUrl,
      targetBranch: job.targetBranch || job.repo.defaultBranch,
      workBranch,
      accessToken: job.repo.accessToken || undefined,
      jobId: job.id,
    });

    await completeStep(run.id, 'CLONE');
    await log('INFO', '✅ Repository cloned and work branch created');

    // ================================================================
    // STEP 2: PLAN
    // ================================================================
    await updateJobStatus(jobId, 'PLANNING');
    await createStep(run.id, 'PLAN', 2);
    await log('INFO', 'Planning changes...');

    const plan = await createPlan(job.title, job.description, gitCtx);
    totalTokens += plan.tokensUsed;

    await completeStep(run.id, 'PLAN', { output: plan });
    await log('INFO', `📋 Plan created: ${plan.summary}`);
    await log('INFO', `   Files to modify: ${plan.filesToModify.map(f => f.path).join(', ')}`);
    await log('INFO', `   Files to create: ${plan.filesToCreate.map(f => f.path).join(', ')}`);
    await log('INFO', `   Estimated risk: ${plan.estimatedRisk}`);

    // Update risk level if agent detected higher risk
    if (plan.estimatedRisk === 'HIGH' || plan.estimatedRisk === 'CRITICAL') {
      await prisma.job.update({
        where: { id: jobId },
        data: { riskLevel: plan.estimatedRisk },
      });
    }

    // ================================================================
    // STEP 3: CODE
    // ================================================================
    await updateJobStatus(jobId, 'CODING');
    await createStep(run.id, 'CODE', 3);
    await log('INFO', 'Coding changes...');

    const codeResult = await executeCode(plan, gitCtx.workDir);
    totalTokens += codeResult.totalTokensUsed;

    if (codeResult.errors.length > 0) {
      await log('WARN', `⚠️ Some errors during coding: ${codeResult.errors.join('; ')}`);
    }

    await completeStep(run.id, 'CODE', {
      output: {
        filesModified: codeResult.filesModified,
        filesCreated: codeResult.filesCreated,
        filesDeleted: codeResult.filesDeleted,
      },
    });
    await log('INFO', `✅ Code changes applied: ${codeResult.filesModified.length} modified, ${codeResult.filesCreated.length} created`);

    // ================================================================
    // STEP 4: TEST
    // ================================================================
    await updateJobStatus(jobId, 'TESTING');
    await createStep(run.id, 'TEST', 4);

    const testCommand = await detectTestCommand(gitCtx.workDir);
    let testOutput = '';

    if (testCommand) {
      await log('INFO', `Running tests: ${testCommand}`);

      let testPassed = false;
      let testAttempts = 0;
      const maxTestFixes = 3;

      while (!testPassed && testAttempts < maxTestFixes) {
        const testResult = await runCommand(testCommand, gitCtx.workDir, 120_000);
        testOutput = `${testResult.stdout}\n${testResult.stderr}`;

        if (testResult.exitCode === 0) {
          testPassed = true;
          await log('INFO', '✅ All tests passed');
        } else {
          testAttempts++;
          await log('WARN', `❌ Tests failed (attempt ${testAttempts}/${maxTestFixes})`);

          if (testAttempts < maxTestFixes) {
            await log('INFO', 'Attempting to fix...');
            // Try to fix the most recently modified file
            const targetFile = codeResult.filesModified[0] || codeResult.filesCreated[0];
            if (targetFile) {
              const fixResult = await fixCode(gitCtx.workDir, targetFile, testOutput);
              totalTokens += fixResult.tokensUsed;
            }
          }
        }
      }

      if (!testPassed) {
        await failStep(run.id, 'TEST', 'Tests failed after max retry attempts');
        await log('ERROR', '❌ Tests failed. Could not auto-fix.');
        // Continue anyway — let reviewer decide
      } else {
        await completeStep(run.id, 'TEST');
      }
    } else {
      await log('INFO', 'No test framework detected, skipping tests');
      await completeStep(run.id, 'TEST', { output: { skipped: true } });
    }

    // ================================================================
    // STEP 5: REVIEW
    // ================================================================
    await updateJobStatus(jobId, 'REVIEWING');
    await createStep(run.id, 'REVIEW', 5);
    await log('INFO', 'Reviewing changes...');

    const targetBranch = job.targetBranch || job.repo.defaultBranch;
    const diff = await getDiff(gitCtx, targetBranch);
    const review = await reviewDiff(diff, job.title, job.description);
    totalTokens += review.tokensUsed;

    await completeStep(run.id, 'REVIEW', {
      output: {
        safetyScore: review.safetyScore,
        summary: review.summary,
        concerns: review.concerns,
      },
    });
    await log('INFO', `🔍 Review complete: safety score ${(review.safetyScore * 100).toFixed(0)}%`);

    if (review.concerns.length > 0) {
      await log('WARN', `Concerns: ${review.concerns.join('; ')}`);
    }

    // ================================================================
    // STEP 6: PUSH + CREATE PR
    // ================================================================
    await createStep(run.id, 'PUSH', 6);
    await log('INFO', 'Pushing changes...');

    const commitHash = await commitAndPush(gitCtx, `autocode: ${job.title}`);

    if (commitHash === 'no-changes') {
      await log('WARN', 'No changes to commit');
      await failStep(run.id, 'PUSH', 'No changes detected');
      throw new Error('No changes were made by the coder agent');
    }

    await completeStep(run.id, 'PUSH');
    await log('INFO', `✅ Pushed commit ${commitHash}`);

    // Create PR
    await createStep(run.id, 'CREATE_PR', 7);
    await log('INFO', 'Creating Pull Request...');

    const prBody = formatPRBody({
      taskTitle: job.title,
      taskDescription: job.description,
      planSummary: plan.summary,
      diffSummary: review.summary,
      safetyScore: review.safetyScore,
      concerns: review.concerns,
      testResults: testOutput || undefined,
    });

    const pr = await createPullRequest({
      cloneUrl: job.repo.cloneUrl,
      headBranch: workBranch,
      baseBranch: targetBranch,
      title: `[AutoCode] ${job.title}`,
      body: prBody,
      accessToken: job.repo.accessToken || undefined,
    });

    await completeStep(run.id, 'CREATE_PR', { output: { prUrl: pr.url, prNumber: pr.number } });
    await log('INFO', `✅ PR created: ${pr.url}`);

    // ================================================================
    // DETERMINE FINAL STATUS
    // ================================================================
    const riskLevel = (await prisma.job.findUnique({ where: { id: jobId } }))?.riskLevel || 'MEDIUM';
    const canAutoMerge = RISK_AUTO_MERGE[riskLevel as keyof typeof RISK_AUTO_MERGE]
      && review.safetyScore >= AUTO_MERGE_SAFETY_THRESHOLD;

    let finalStatus: JobStatus;

    if (canAutoMerge) {
      finalStatus = 'COMPLETED';
      await log('INFO', '🟢 Auto-merge eligible — job completed');
    } else {
      finalStatus = 'AWAITING_APPROVAL';
      await log('INFO', '🟡 Awaiting human approval before merge');

      // Create approval request
      await prisma.approval.create({
        data: {
          jobId,
          userId: job.userId,
        },
      });
    }

    // Update job with results
    const costUsd = estimateCost(totalTokens);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        prUrl: pr.url,
        workBranch,
        diffSummary: review.summary,
        safetyScore: review.safetyScore,
        tokensUsed: totalTokens,
        costUsd,
        completedAt: finalStatus === 'COMPLETED' ? new Date() : undefined,
      },
    });

    // Mark run as succeeded
    await prisma.run.update({
      where: { id: run.id },
      data: { status: 'SUCCEEDED', endedAt: new Date() },
    });

    return {
      success: true,
      finalStatus,
      prUrl: pr.url,
      safetyScore: review.safetyScore,
      diffSummary: review.summary,
      tokensUsed: totalTokens,
      costUsd,
    };

  } catch (error) {
    const err = error as Error;
    console.error(`❌ Job ${jobId} failed:`, err.message);

    // Update job to FAILED
    const costUsd = estimateCost(totalTokens);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        tokensUsed: totalTokens,
        costUsd,
      },
    }).catch(() => {}); // ignore errors during error handling

    return {
      success: false,
      finalStatus: 'FAILED',
      tokensUsed: totalTokens,
      costUsd,
      error: err.message,
    };

  } finally {
    // Cleanup workspace
    if (gitCtx) {
      await cleanupWorkspace(gitCtx.workDir.split('/').pop() || '');
    }
  }
}

// ============ HELPERS ============

async function updateJobStatus(jobId: string, status: JobStatus) {
  const current = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } });
  if (current && isValidTransition(current.status as JobStatus, status)) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        ...(status === 'PLANNING' && !current.status ? { startedAt: new Date() } : {}),
      },
    });
  }
}

async function createStep(runId: string, phase: StepPhase, order: number) {
  await prisma.step.create({
    data: { runId, phase, status: 'RUNNING', order, startedAt: new Date() },
  });
}

async function completeStep(runId: string, phase: StepPhase, extra?: { output?: any }) {
  const step = await prisma.step.findFirst({
    where: { runId, phase },
    orderBy: { order: 'desc' },
  });
  if (step) {
    await prisma.step.update({
      where: { id: step.id },
      data: { status: 'SUCCEEDED', endedAt: new Date(), output: extra?.output || undefined },
    });
  }
}

async function failStep(runId: string, phase: StepPhase, error: string) {
  const step = await prisma.step.findFirst({
    where: { runId, phase },
    orderBy: { order: 'desc' },
  });
  if (step) {
    await prisma.step.update({
      where: { id: step.id },
      data: { status: 'FAILED', endedAt: new Date(), error },
    });
  }
}

function createLogger(runId: string) {
  return async (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string) => {
    console.log(`[${level}] ${message}`);
    await prisma.log.create({
      data: { runId, level, message },
    }).catch(() => {}); // non-critical
  };
}
