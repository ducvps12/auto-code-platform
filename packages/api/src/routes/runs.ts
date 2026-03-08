import { Router } from 'express';
import { prisma } from '@auto-code/database';

export const runsRouter = Router();

// ============ GET /api/runs/:id — Get run detail with steps ============

runsRouter.get('/:id', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const run = await prisma.run.findFirst({
      where: {
        id,
        job: { userId: user.id },
      },
      include: {
        steps: { orderBy: { order: 'asc' } },
        job: { select: { id: true, title: true, status: true } },
      },
    });

    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    res.json(run);
  } catch (err) {
    next(err);
  }
});

// ============ GET /api/runs/:id/logs — Get run logs ============

runsRouter.get('/:id/logs', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { level, since } = req.query;

    // Verify access
    const run = await prisma.run.findFirst({
      where: { id, job: { userId: user.id } },
    });

    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    const where: any = { runId: id };
    if (level) where.level = level;
    if (since) where.timestamp = { gte: new Date(since as string) };

    const logs = await prisma.log.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: 500,
    });

    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// ============ GET /api/runs/:id/logs/stream — SSE log stream ============

runsRouter.get('/:id/logs/stream', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Verify access
    const run = await prisma.run.findFirst({
      where: { id, job: { userId: user.id } },
    });

    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let lastTimestamp = new Date(0);

    const interval = setInterval(async () => {
      try {
        const newLogs = await prisma.log.findMany({
          where: {
            runId: id,
            timestamp: { gt: lastTimestamp },
          },
          orderBy: { timestamp: 'asc' },
          take: 50,
        });

        for (const log of newLogs) {
          res.write(`data: ${JSON.stringify(log)}\n\n`);
          lastTimestamp = log.timestamp;
        }

        // Check if run is done
        const currentRun = await prisma.run.findUnique({ where: { id } });
        if (currentRun && currentRun.status !== 'RUNNING') {
          res.write(`event: done\ndata: ${JSON.stringify({ status: currentRun.status })}\n\n`);
          clearInterval(interval);
          res.end();
        }
      } catch {
        clearInterval(interval);
        res.end();
      }
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
    });
  } catch (err) {
    next(err);
  }
});
