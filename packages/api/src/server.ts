import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

// Resolve public dir: CWD is packages/api/ when run via npm workspace
const publicDir = path.resolve(process.cwd(), 'public');
import { jobsRouter } from './routes/jobs.js';
import { reposRouter } from './routes/repos.js';
import { approvalsRouter } from './routes/approvals.js';
import { runsRouter } from './routes/runs.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.API_PORT || 3000;

// ============ MIDDLEWARE ============
app.use(helmet({
  contentSecurityPolicy: false, // allow dashboard scripts
}));
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '10mb' }));

// ============ STATIC DASHBOARD ============
app.use(express.static(publicDir));

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'auto-code-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// ============ ROUTES (auth required) ============
app.use('/api', authMiddleware);
app.use('/api/jobs', jobsRouter);
app.use('/api/repos', reposRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/runs', runsRouter);

// ============ DASHBOARD FALLBACK ============
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ============ ERROR HANDLER ============
app.use(errorHandler);

// ============ START ============
app.listen(PORT, () => {
  console.log(`🚀 Auto-Code API running on port ${PORT}`);
  console.log(`📋 Health:     http://localhost:${PORT}/health`);
  console.log(`🔑 API:        http://localhost:${PORT}/api`);
  console.log(`🖥️  Dashboard:  http://localhost:${PORT}`);
});

export default app;
