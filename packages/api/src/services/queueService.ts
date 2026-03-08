import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL);

export const JOB_QUEUE_KEY = 'autocode:job:queue';
export const JOB_CHANNEL = 'autocode:job:events';

/**
 * Push a job ID onto the queue for workers to pick up
 */
export async function enqueueJob(jobId: string, priority: number = 0) {
  // Use sorted set for priority queue (lower score = higher priority)
  await redis.zadd(JOB_QUEUE_KEY, -priority, jobId);
  // Notify workers
  await redis.publish(JOB_CHANNEL, JSON.stringify({ type: 'JOB_QUEUED', jobId }));
}

/**
 * Pop the highest priority job from the queue
 */
export async function dequeueJob(): Promise<string | null> {
  // Pop the member with the lowest score (highest priority)
  const result = await redis.zpopmin(JOB_QUEUE_KEY);
  if (result && result.length >= 2) {
    return result[0]; // the job ID
  }
  return null;
}

/**
 * Publish a job event
 */
export async function publishJobEvent(event: {
  type: string;
  jobId: string;
  data?: Record<string, unknown>;
}) {
  await redis.publish(JOB_CHANNEL, JSON.stringify(event));
}
