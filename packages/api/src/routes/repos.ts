import { Router } from 'express';
import { prisma } from '@auto-code/database';
import { z } from 'zod';

export const reposRouter = Router();

const createRepoSchema = z.object({
  name: z.string().min(1).max(200),
  cloneUrl: z.string().url(),
  provider: z.enum(['GITHUB', 'GITLAB', 'BITBUCKET']).optional(),
  defaultBranch: z.string().optional(),
  accessToken: z.string().optional(),
});

// ============ POST /api/repos — Register a repository ============

reposRouter.post('/', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const data = createRepoSchema.parse(req.body);

    const repo = await prisma.repository.create({
      data: {
        name: data.name,
        cloneUrl: data.cloneUrl,
        provider: data.provider || 'GITHUB',
        defaultBranch: data.defaultBranch || 'main',
        accessToken: data.accessToken,
        userId: user.id,
      },
    });

    res.status(201).json({ success: true, repo });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// ============ GET /api/repos — List repositories ============

reposRouter.get('/', async (req, res, next) => {
  try {
    const user = (req as any).user;

    const repos = await prisma.repository.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        cloneUrl: true,
        provider: true,
        defaultBranch: true,
        createdAt: true,
        _count: { select: { jobs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ repos });
  } catch (err) {
    next(err);
  }
});

// ============ GET /api/repos/:id — Get repo detail ============

reposRouter.get('/:id', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const repo = await prisma.repository.findFirst({
      where: { id, userId: user.id },
      include: {
        jobs: {
          select: { id: true, title: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    res.json(repo);
  } catch (err) {
    next(err);
  }
});

// ============ DELETE /api/repos/:id — Remove repository ============

reposRouter.delete('/:id', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const repo = await prisma.repository.findFirst({
      where: { id, userId: user.id },
    });

    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    // Check for active jobs
    const activeJobs = await prisma.job.count({
      where: {
        repoId: id,
        status: { in: ['QUEUED', 'PLANNING', 'CODING', 'TESTING', 'REVIEWING', 'AWAITING_APPROVAL'] },
      },
    });

    if (activeJobs > 0) {
      res.status(400).json({ error: `Cannot delete: ${activeJobs} active job(s)` });
      return;
    }

    await prisma.repository.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
