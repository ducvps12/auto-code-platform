import { Router } from 'express';
import { prisma } from '@auto-code/database';
import { z } from 'zod';
import { isValidTransition } from '@auto-code/shared';
import { publishJobEvent } from '../services/queueService.js';

export const approvalsRouter = Router();

const decideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REQUEST_CHANGES']),
  comment: z.string().max(5000).optional(),
});

// ============ GET /api/approvals/pending — List pending approvals ============

approvalsRouter.get('/pending', async (req, res, next) => {
  try {
    const user = (req as any).user;

    const approvals = await prisma.approval.findMany({
      where: {
        userId: user.id,
        decision: null,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            riskLevel: true,
            diffSummary: true,
            safetyScore: true,
            repo: { select: { name: true, provider: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ approvals });
  } catch (err) {
    next(err);
  }
});

// ============ POST /api/approvals/:id/decide — Approve/Reject/Request Changes ============

approvalsRouter.post('/:id/decide', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const data = decideSchema.parse(req.body);

    // Find the approval
    const approval = await prisma.approval.findFirst({
      where: { id, userId: user.id, decision: null },
      include: { job: true },
    });

    if (!approval) {
      res.status(404).json({ error: 'Approval not found or already decided' });
      return;
    }

    // Update approval
    const updated = await prisma.approval.update({
      where: { id },
      data: {
        decision: data.decision,
        comment: data.comment,
        decidedAt: new Date(),
      },
    });

    // Update job status based on decision
    let newJobStatus: string;
    if (data.decision === 'APPROVED') {
      newJobStatus = 'APPROVED';
    } else if (data.decision === 'REQUEST_CHANGES') {
      newJobStatus = 'CODING'; // go back to coding
    } else {
      newJobStatus = 'CANCELLED';
    }

    if (isValidTransition(approval.job.status as any, newJobStatus as any)) {
      await prisma.job.update({
        where: { id: approval.jobId },
        data: { status: newJobStatus as any },
      });

      await publishJobEvent({
        type: 'APPROVAL_DECIDED',
        jobId: approval.jobId,
        data: { decision: data.decision, newStatus: newJobStatus },
      });
    }

    res.json({ success: true, approval: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});
