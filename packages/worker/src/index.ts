import Redis from 'ioredis';
import { executeJob } from './executor.js';

// ============ CONFIG ============

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JOB_QUEUE_KEY = 'autocode:job:queue';
const JOB_CHANNEL = 'autocode:job:events';
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2');
const POLL_INTERVAL_MS = 5000; // poll every 5 seconds

// ============ WORKER ENTRY POINT ============

let isShuttingDown = false;
let activeJobs = 0;

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  🤖 AutoCode Worker Engine v0.1.0');
  console.log('══════════════════════════════════════════════');
  console.log(`  Queue:       ${JOB_QUEUE_KEY}`);
  console.log(`  Concurrency: ${WORKER_CONCURRENCY}`);
  console.log(`  Poll:        ${POLL_INTERVAL_MS}ms`);
  console.log('══════════════════════════════════════════════');

  const redis = new Redis(REDIS_URL);

  // Subscribe to job events for real-time notification
  const subscriber = new Redis(REDIS_URL);
  subscriber.subscribe(JOB_CHANNEL);
  subscriber.on('message', (channel, message) => {
    try {
      const event = JSON.parse(message);
      if (event.type === 'JOB_QUEUED') {
        console.log(`📥 New job queued: ${event.jobId}`);
        // Will be picked up by poll loop
      }
    } catch { /* ignore parse errors */ }
  });

  // Graceful shutdown
  process.on('SIGINT', () => gracefulShutdown(redis, subscriber));
  process.on('SIGTERM', () => gracefulShutdown(redis, subscriber));

  // Main poll loop
  console.log('🔄 Waiting for jobs...\n');

  while (!isShuttingDown) {
    try {
      // Check if we can take more jobs
      if (activeJobs >= WORKER_CONCURRENCY) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Try to dequeue a job
      const result = await redis.zpopmin(JOB_QUEUE_KEY);
      if (!result || result.length < 2) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const jobId = result[0];
      console.log(`\n🚀 Starting job: ${jobId}`);
      activeJobs++;

      // Execute in background (don't await — allow concurrency)
      executeJob(jobId)
        .then(result => {
          if (result.success) {
            console.log(`✅ Job ${jobId} completed: ${result.finalStatus}`);
            if (result.prUrl) {
              console.log(`   PR: ${result.prUrl}`);
            }
            console.log(`   Tokens: ${result.tokensUsed} | Cost: $${result.costUsd.toFixed(4)}`);
          } else {
            console.log(`❌ Job ${jobId} failed: ${result.error}`);
          }
        })
        .catch(err => {
          console.error(`💥 Job ${jobId} crashed:`, err);
        })
        .finally(() => {
          activeJobs--;
        });

    } catch (err) {
      console.error('Worker loop error:', err);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function gracefulShutdown(redis: Redis, subscriber: Redis) {
  console.log('\n🛑 Shutting down worker...');
  isShuttingDown = true;

  // Wait for active jobs to finish (max 60 seconds)
  let waited = 0;
  while (activeJobs > 0 && waited < 60_000) {
    console.log(`   Waiting for ${activeJobs} active job(s)...`);
    await sleep(2000);
    waited += 2000;
  }

  await subscriber.unsubscribe();
  await subscriber.quit();
  await redis.quit();

  console.log('👋 Worker stopped');
  process.exit(0);
}

// ============ START ============

main().catch(err => {
  console.error('💥 Worker fatal error:', err);
  process.exit(1);
});
