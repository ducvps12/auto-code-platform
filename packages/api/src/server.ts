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
import { authRouter } from './routes/auth.js';
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
    version: '0.2.0',
    timestamp: new Date().toISOString(),
  });
});

// ============ AUTH ROUTES (no auth required) ============
app.use('/api/auth', authRouter);

// ============ PROTECTED ROUTES ============
app.use('/api', authMiddleware);
app.use('/api/jobs', jobsRouter);
app.use('/api/repos', reposRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/runs', runsRouter);

// ============ WAF PROXY API ============
app.get('/api/waf/stats', async (_req, res) => {
  try {
    const resp = await fetch('http://127.0.0.1:9090/api/stats');
    res.json(await resp.json());
  } catch { res.json({ error: 'WAF not reachable', online: false }); }
});

app.get('/api/waf/threats', async (_req, res) => {
  try {
    const resp = await fetch('http://127.0.0.1:9090/api/threats');
    res.json(await resp.json());
  } catch { res.json({ threats: [], online: false }); }
});

// ============ PAGE ROUTES ============
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'landing.html'));
});

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/waf', (_req, res) => {
  res.sendFile(path.join(publicDir, 'waf.html'));
});

app.get('/tunnel', (_req, res) => {
  res.sendFile(path.join(publicDir, 'tunnel.html'));
});

// ============ SPA FALLBACK ============
app.get('*', (req, res) => {
  // Academy has its own index
  if (req.path.startsWith('/academy')) {
    return res.sendFile(path.join(publicDir, 'academy', 'index.html'));
  }
  res.sendFile(path.join(publicDir, 'landing.html'));
});

// ============ ERROR HANDLER ============
app.use(errorHandler);

// ============ START ============
const server = app.listen(PORT, () => {
  console.log(`\n⚡ AutoCode Platform v0.3.0`);
  console.log(`   Nemark Digital Solutions — MST: 0111278699\n`);
  console.log(`   🏠 Landing:    http://localhost:${PORT}`);
  console.log(`   📊 Dashboard:  http://localhost:${PORT}/dashboard`);
  console.log(`   🎓 Academy:    http://localhost:${PORT}/academy/`);
  console.log(`   🛡️ WAF:        http://localhost:${PORT}/waf`);
  console.log(`   🔗 Tunnel:     http://localhost:${PORT}/tunnel`);
  console.log(`   📋 Health:     http://localhost:${PORT}/health`);
  console.log(`   🔑 API:        http://localhost:${PORT}/api\n`);
});

export default app;
