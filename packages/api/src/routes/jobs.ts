import { Router } from 'express';
import { prisma } from '@auto-code/database';
import { z } from 'zod';
import { enqueueJob } from '../services/queueService.js';

export const jobsRouter = Router();

// ============ Validation Schemas ============

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  repoId: z.string(),
  taskType: z.enum(['GENERAL', 'BUGFIX', 'FEATURE', 'REFACTOR', 'TEST', 'CRUD', 'DOCS']).optional(),
  targetBranch: z.string().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  timeoutMs: z.number().int().min(30000).max(3600000).optional(),
});

// ============ POST /api/jobs — Create a new job ============

jobsRouter.post('/', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const data = createJobSchema.parse(req.body);

    // Verify repo belongs to user
    const repo = await prisma.repository.findFirst({
      where: { id: data.repoId, userId: user.id },
    });

    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    // Create job
    const job = await prisma.job.create({
      data: {
        title: data.title,
        description: data.description,
        taskType: data.taskType || 'GENERAL',
        targetBranch: data.targetBranch || repo.defaultBranch,
        priority: data.priority || 0,
        maxRetries: data.maxRetries || 3,
        timeoutMs: data.timeoutMs || 600000,
        userId: user.id,
        repoId: data.repoId,
      },
      include: {
        repo: { select: { name: true, cloneUrl: true, provider: true } },
      },
    });

    // Enqueue for worker
    await enqueueJob(job.id, job.priority);

    res.status(201).json({
      success: true,
      job,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// ============ GET /api/jobs — List jobs ============

jobsRouter.get('/', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { status, repoId, page = '1', limit = '20' } = req.query;

    const where: any = { userId: user.id };
    if (status) where.status = status;
    if (repoId) where.repoId = repoId;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          repo: { select: { name: true, provider: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============ GET /api/jobs/:id — Get job detail ============

jobsRouter.get('/:id', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
      include: {
        repo: { select: { name: true, cloneUrl: true, provider: true } },
        runs: {
          include: {
            steps: { orderBy: { order: 'asc' } },
          },
          orderBy: { attempt: 'desc' },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
});

// ============ PATCH /api/jobs/:id/cancel — Cancel a job ============

jobsRouter.patch('/:id/cancel', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const cancelable = ['QUEUED', 'PLANNING', 'CODING', 'TESTING', 'REVIEWING', 'AWAITING_APPROVAL'];
    if (!cancelable.includes(job.status)) {
      res.status(400).json({ error: `Cannot cancel job in ${job.status} status` });
      return;
    }

    const updated = await prisma.job.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, job: updated });
  } catch (err) {
    next(err);
  }
});

// ============ POST /api/jobs/:id/retry — Retry failed job ============

jobsRouter.post('/:id/retry', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'FAILED') {
      res.status(400).json({ error: 'Only FAILED jobs can be retried' });
      return;
    }

    const updated = await prisma.job.update({
      where: { id },
      data: { status: 'QUEUED' },
    });

    await enqueueJob(updated.id, updated.priority);

    res.json({ success: true, job: updated });
  } catch (err) {
    next(err);
  }
});
