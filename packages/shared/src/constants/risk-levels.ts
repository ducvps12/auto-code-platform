import type { RiskLevel, TaskType } from '../types/job.js';

/**
 * Default risk level by task type
 * Can be overridden by user or by reviewer analysis
 */
export const DEFAULT_RISK_BY_TASK: Record<TaskType, RiskLevel> = {
  GENERAL:  'MEDIUM',
  BUGFIX:   'MEDIUM',
  FEATURE:  'HIGH',
  REFACTOR: 'MEDIUM',
  TEST:     'LOW',
  CRUD:     'LOW',
  DOCS:     'LOW',
};

/**
 * File path patterns that auto-elevate risk level
 */
export const HIGH_RISK_PATHS = [
  /auth/i,
  /payment/i,
  /billing/i,
  /migration/i,
  /\.env/,
  /secret/i,
  /password/i,
  /docker-compose/i,
  /Dockerfile/i,
  /\.github\/workflows/i,
  /deploy/i,
  /production/i,
];

/**
 * File extensions considered safe for auto-merge
 */
export const SAFE_EXTENSIONS = [
  '.md', '.txt', '.json', '.yml', '.yaml',
  '.test.ts', '.test.js', '.spec.ts', '.spec.js',
  '.test.tsx', '.test.jsx',
];

/**
 * Risk level descriptions for human review
 */
export const RISK_DESCRIPTIONS: Record<RiskLevel, string> = {
  LOW:      'Minor changes — safe for auto-merge (docs, tests, CRUD)',
  MEDIUM:   'Standard changes — requires review before merge',
  HIGH:     'Sensitive changes — requires approval (auth, business logic)',
  CRITICAL: 'Dangerous changes — blocked from automation (production, billing)',
};
