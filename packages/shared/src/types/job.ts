// ============ JOB & RUN ============

export type TaskType = 'GENERAL' | 'BUGFIX' | 'FEATURE' | 'REFACTOR' | 'TEST' | 'CRUD' | 'DOCS';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type JobStatus =
  | 'QUEUED'
  | 'PLANNING'
  | 'CODING'
  | 'TESTING'
  | 'REVIEWING'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'MERGING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'ROLLED_BACK';

export type RunStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export type StepPhase =
  | 'CLONE'
  | 'INDEX_REPO'
  | 'PLAN'
  | 'CODE'
  | 'LINT'
  | 'TEST'
  | 'BUILD'
  | 'REVIEW'
  | 'PUSH'
  | 'CREATE_PR';

export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface Job {
  id: string;
  title: string;
  description: string;
  taskType: TaskType;
  riskLevel: RiskLevel;
  status: JobStatus;
  priority: number;

  // Config
  targetBranch?: string;
  workBranch?: string;
  maxRetries: number;
  timeoutMs: number;
  maxTokens: number;

  // Results
  prUrl?: string;
  diffSummary?: string;
  safetyScore?: number;
  tokensUsed: number;
  costUsd: number;

  // Relations
  userId: string;
  repoId: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Run {
  id: string;
  jobId: string;
  attempt: number;
  status: RunStatus;
  startedAt: Date;
  endedAt?: Date;
}

export interface Step {
  id: string;
  runId: string;
  phase: StepPhase;
  status: StepStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  endedAt?: Date;
  order: number;
}

export interface LogEntry {
  id: string;
  runId: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ============ API DTOs ============

export interface CreateJobRequest {
  title: string;
  description: string;
  repoId: string;
  taskType?: TaskType;
  targetBranch?: string;
  priority?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface JobListQuery {
  status?: JobStatus;
  repoId?: string;
  page?: number;
  limit?: number;
}

export interface JobDetail extends Job {
  repo: { name: string; cloneUrl: string; provider: string };
  runs: RunWithSteps[];
}

export interface RunWithSteps extends Run {
  steps: Step[];
}
