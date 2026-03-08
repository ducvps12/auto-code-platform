import type { JobStatus, RiskLevel } from '../types/job.js';

/**
 * Job State Machine — defines valid transitions
 * Key = current status, Value = array of allowed next statuses
 */
export const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  QUEUED:             ['PLANNING', 'CANCELLED'],
  PLANNING:           ['CODING', 'FAILED', 'CANCELLED'],
  CODING:             ['TESTING', 'PLANNING', 'FAILED', 'CANCELLED'],
  TESTING:            ['REVIEWING', 'CODING', 'FAILED', 'CANCELLED'],
  REVIEWING:          ['AWAITING_APPROVAL', 'MERGING', 'CODING', 'FAILED', 'CANCELLED'],
  AWAITING_APPROVAL:  ['APPROVED', 'CODING', 'CANCELLED'],
  APPROVED:           ['MERGING', 'FAILED'],
  MERGING:            ['COMPLETED', 'FAILED'],
  COMPLETED:          [],
  FAILED:             ['QUEUED', 'ROLLED_BACK'],
  CANCELLED:          [],
  ROLLED_BACK:        [],
};

/**
 * Check if a job status transition is valid
 */
export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return JOB_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Step execution order in a normal run
 */
export const STEP_ORDER = [
  'CLONE',
  'INDEX_REPO',
  'PLAN',
  'CODE',
  'LINT',
  'TEST',
  'BUILD',
  'REVIEW',
  'PUSH',
  'CREATE_PR',
] as const;

/**
 * Risk level thresholds for auto-merge
 */
export const RISK_AUTO_MERGE: Record<RiskLevel, boolean> = {
  LOW: true,       // auto-merge if safety score >= 0.8
  MEDIUM: false,   // requires human approval
  HIGH: false,     // requires human approval
  CRITICAL: false, // blocked from auto
};

/**
 * Default safety score threshold for auto-merge
 */
export const AUTO_MERGE_SAFETY_THRESHOLD = 0.8;

/**
 * Default timeout per step (ms)
 */
export const DEFAULT_STEP_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Max retry attempts for failed steps within a run
 */
export const MAX_STEP_RETRIES = 3;
