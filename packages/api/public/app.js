// ============ AutoCode Dashboard v2 — Premium UI ============

const API_BASE = '';
let API_KEY = localStorage.getItem('autocode_api_key') || '';
let currentPage = 'dashboard';
let refreshInterval = null;

// ============ API ============
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}) };
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (res.status === 401) { showToast('API Key invalid or expired', 'err'); showApiKeyModal(); throw new Error('Unauthorized'); }
    if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || res.statusText); }
    return res.json();
  } catch (err) {
    if (err.message !== 'Unauthorized' && err.message === 'Failed to fetch') showToast('Cannot connect to API', 'err');
    throw err;
  }
}

// ============ Toast ============
function showToast(msg, type = 'ok') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'ok' ? '✓' : '✕'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ============ Navigation ============
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn[data-page]').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  const info = {
    dashboard: ['Dashboard', 'System overview & recent activity'],
    repos: ['Repositories', 'Manage your code repositories'],
    jobs: ['Jobs', 'Create and monitor AI coding jobs'],
    approvals: ['Approvals', 'Review pending pull requests'],
    logs: ['Logs', 'Real-time job execution logs'],
  };
  const [title, sub] = info[page] || [page, ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = sub;
  loadPageData(page);
}

async function loadPageData(page) {
  if (!API_KEY) return;
  try {
    switch(page) {
      case 'dashboard': await loadDashboard(); break;
      case 'repos': await loadRepos(); break;
      case 'jobs': await loadJobs(); break;
      case 'approvals': await loadApprovals(); break;
      case 'logs': await loadLogs(); break;
    }
  } catch (e) { console.error('Load error:', e); }
}

// ============ Dashboard ============
async function loadDashboard() {
  try {
    const [jobsData, reposData, approvalsData, health] = await Promise.all([
      api('/api/jobs?limit=5'), api('/api/repos'), api('/api/approvals/pending'),
      fetch('/health').then(r => r.json()),
    ]);

    document.getElementById('stat-total-jobs').textContent = jobsData.pagination?.total || 0;
    document.getElementById('stat-repos').textContent = reposData.repos?.length || 0;
    document.getElementById('stat-pending').textContent = approvalsData.approvals?.length || 0;
    document.getElementById('stat-completed').textContent = (jobsData.jobs || []).filter(j => j.status === 'COMPLETED').length;

    document.getElementById('system-status').innerHTML = `
      <div class="sys-row"><span>API Server</span><span class="pill pill-green">Online</span></div>
      <div class="sys-row"><span>Version</span><span class="pill pill-purple">${health.version}</span></div>
      <div class="sys-row"><span>Worker</span><span class="pill pill-green">Polling</span></div>
      <div class="sys-row"><span>Database</span><span class="pill pill-green">Connected</span></div>
    `;

    const jobs = jobsData.jobs || [];
    document.getElementById('recent-jobs-body').innerHTML = jobs.length
      ? jobs.map(j => `<tr onclick="viewJob('${j.id}')"><td>${esc(j.title)}</td><td><span class="pill ${statusPill(j.status)}">${fmtStatus(j.status)}</span></td><td style="color:var(--text-3)">${j.repo?.name || '—'}</td><td style="color:var(--text-4)">${ago(j.createdAt)}</td></tr>`).join('')
      : `<tr><td colspan="4" class="empty" style="padding:32px"><p>No jobs yet</p></td></tr>`;
  } catch (e) { console.error(e); }
}

// ============ Repos ============
async function loadRepos() {
  try {
    const data = await api('/api/repos');
    const repos = data.repos || [];
    document.getElementById('repos-table-body').innerHTML = repos.length
      ? repos.map(r => `<tr>
          <td><strong>${esc(r.name)}</strong><div style="font-size:11px;color:var(--text-4);margin-top:2px">${esc(r.cloneUrl)}</div></td>
          <td><span class="pill pill-purple">${r.provider}</span></td>
          <td><code style="font-family:var(--mono);font-size:12px;color:var(--purple-light)">${r.defaultBranch}</code></td>
          <td>${r._count?.jobs || 0}</td>
          <td style="color:var(--text-4)">${ago(r.createdAt)}</td>
          <td><button class="btn btn-ghost btn-xs btn-danger" onclick="event.stopPropagation();deleteRepo('${r.id}','${esc(r.name)}')">Delete</button></td>
        </tr>`).join('')
      : `<tr><td colspan="6" class="empty"><div class="ico">📁</div><h3>No repositories</h3><p>Add your first repo to start</p></td></tr>`;
  } catch (e) { console.error(e); }
}

async function addRepo(e) {
  e.preventDefault();
  const f = e.target;
  try {
    await api('/api/repos', { method: 'POST', body: JSON.stringify({ name: f.name.value, cloneUrl: f.cloneUrl.value, provider: f.provider.value, defaultBranch: f.defaultBranch.value || 'main', accessToken: f.accessToken.value || undefined }) });
    showToast('Repository added!'); closeModal('add-repo-modal'); f.reset(); loadRepos();
  } catch (e) { showToast(e.message, 'err'); }
}

async function deleteRepo(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try { await api(`/api/repos/${id}`, { method: 'DELETE' }); showToast('Deleted'); loadRepos(); }
  catch (e) { showToast(e.message, 'err'); }
}

// ============ Jobs ============
async function loadJobs() {
  try {
    const data = await api('/api/jobs?limit=50');
    const jobs = data.jobs || [];
    document.getElementById('jobs-table-body').innerHTML = jobs.length
      ? jobs.map(j => `<tr onclick="viewJob('${j.id}')">
          <td>${esc(j.title)}<div style="font-size:10px;color:var(--text-4);margin-top:2px;font-family:var(--mono)">${j.id.slice(0,12)}</div></td>
          <td><span class="pill ${statusPill(j.status)}">${fmtStatus(j.status)}</span></td>
          <td><span class="pill pill-${riskPill(j.riskLevel)}">${j.riskLevel}</span></td>
          <td style="color:var(--text-3)">${j.repo?.name || '—'}</td>
          <td style="font-family:var(--mono);font-size:12px">${j.tokensUsed > 0 ? j.tokensUsed.toLocaleString() : '—'}</td>
          <td style="font-family:var(--mono);font-size:12px">${j.costUsd > 0 ? '$' + j.costUsd.toFixed(4) : '—'}</td>
          <td style="color:var(--text-4)">${ago(j.createdAt)}</td>
        </tr>`).join('')
      : `<tr><td colspan="7" class="empty"><div class="ico">🤖</div><h3>No jobs</h3><p>Create your first AI coding job</p></td></tr>`;
  } catch (e) { console.error(e); }
}

async function createJob(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const r = await api('/api/jobs', { method: 'POST', body: JSON.stringify({
      title: f.title.value, description: f.description.value,
      repoId: f.repoId.value, taskType: f.taskType.value,
      priority: parseInt(f.priority.value) || 0
    })});
    showToast(`Job "${r.job.title}" created!`); closeModal('create-job-modal'); f.reset(); loadJobs();
  } catch (e) { showToast(e.message, 'err'); }
}

async function viewJob(id) {
  try {
    const j = await api(`/api/jobs/${id}`);
    let pipeline = '';
    if (j.runs?.length) {
      const steps = j.runs[0].steps || [];
      pipeline = `<div style="margin-top:16px"><div style="font-size:11px;color:var(--text-4);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Pipeline — Run #${j.runs[0].attempt}</div><div class="pipeline-track">${steps.map((s, i) => `${i > 0 ? '<div class="pipe-line' + (s.status === 'SUCCEEDED' ? ' done' : '') + '"></div>' : ''}<div class="pipe-step ${s.status === 'RUNNING' ? 'active' : s.status === 'SUCCEEDED' ? 'done' : s.status === 'FAILED' ? 'fail' : ''}"><span class="dot"></span>${s.phase}</div>`).join('')}</div></div>`;
    }

    document.getElementById('job-detail-title').textContent = j.title;
    document.getElementById('job-detail-content').innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <span class="pill ${statusPill(j.status)}">${fmtStatus(j.status)}</span>
        <span class="pill pill-${riskPill(j.riskLevel)}">${j.riskLevel} Risk</span>
        ${j.prUrl ? `<a href="${j.prUrl}" target="_blank" style="color:var(--purple-light);font-size:12px;text-decoration:none">↗ View PR</a>` : ''}
      </div>
      <p style="font-size:13px;color:var(--text-2);line-height:1.7;margin-bottom:16px">${esc(j.description)}</p>
      ${pipeline}
      <div style="display:flex;gap:16px;margin-top:20px;font-size:12px;color:var(--text-4);font-family:var(--mono)">
        <span>${j.tokensUsed.toLocaleString()} tokens</span>
        <span>$${j.costUsd.toFixed(4)}</span>
        <span>${j.repo?.name || '—'}</span>
        <span>${ago(j.createdAt)}</span>
      </div>
    `;
    
    let acts = '';
    if (['QUEUED','PLANNING','CODING','TESTING','REVIEWING','AWAITING_APPROVAL'].includes(j.status))
      acts += `<button class="btn btn-ghost btn-danger" onclick="cancelJob('${j.id}')">Cancel</button>`;
    if (j.status === 'FAILED')
      acts += `<button class="btn btn-primary" onclick="retryJob('${j.id}')">Retry</button>`;
    document.getElementById('job-detail-actions').innerHTML = acts;
    openModal('job-detail-modal');
  } catch (e) { showToast(e.message, 'err'); }
}

async function cancelJob(id) {
  if (!confirm('Cancel this job?')) return;
  try { await api(`/api/jobs/${id}/cancel`, { method: 'PATCH' }); showToast('Cancelled'); closeModal('job-detail-modal'); loadJobs(); }
  catch (e) { showToast(e.message, 'err'); }
}

async function retryJob(id) {
  try { await api(`/api/jobs/${id}/retry`, { method: 'POST' }); showToast('Retrying...'); closeModal('job-detail-modal'); loadJobs(); }
  catch (e) { showToast(e.message, 'err'); }
}

// ============ Approvals ============
async function loadApprovals() {
  try {
    const data = await api('/api/approvals/pending');
    const list = data.approvals || [];
    document.getElementById('pending-count').textContent = list.length;
    document.getElementById('approvals-list').innerHTML = list.length
      ? list.map(a => `<div class="card" style="margin-bottom:12px"><div class="card-body padded">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div><strong style="font-size:15px">${esc(a.job.title)}</strong><div style="font-size:12px;color:var(--text-4);margin-top:2px">${a.job.repo?.name} · ${a.job.riskLevel}</div></div>
            <span class="pill pill-${riskPill(a.job.riskLevel)}">${a.job.riskLevel}</span>
          </div>
          ${a.job.diffSummary ? `<p style="font-size:13px;color:var(--text-2);margin-bottom:12px">${esc(a.job.diffSummary)}</p>` : ''}
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" onclick="decideApproval('${a.id}','APPROVED')">Approve</button>
            <button class="btn btn-ghost btn-sm" onclick="decideApproval('${a.id}','REQUEST_CHANGES')">Request Changes</button>
            <button class="btn btn-ghost btn-sm btn-danger" onclick="decideApproval('${a.id}','REJECTED')">Reject</button>
          </div>
        </div></div>`).join('')
      : `<div class="empty"><div class="ico">✓</div><h3>All clear</h3><p>No pending approvals</p></div>`;
  } catch (e) { console.error(e); }
}

async function decideApproval(id, decision) {
  const comment = decision === 'REQUEST_CHANGES' ? prompt('Enter change request:') : null;
  if (decision === 'REQUEST_CHANGES' && !comment) return;
  try {
    await api(`/api/approvals/${id}/decide`, { method: 'POST', body: JSON.stringify({ decision, comment: comment || undefined }) });
    showToast(`${decision}`); loadApprovals(); loadDashboard();
  } catch (e) { showToast(e.message, 'err'); }
}

// ============ Logs ============
async function loadLogs() {
  document.getElementById('logs-content').innerHTML = `<div class="empty"><div class="ico">📋</div><h3>Select a job</h3></div>`;
  try {
    const data = await api('/api/jobs?limit=10');
    document.getElementById('logs-job-list').innerHTML = (data.jobs || []).map(j => `
      <button class="nav-btn" onclick="loadJobLogs('${j.id}')" style="width:100%;margin-bottom:2px">
        <span class="ico" style="font-size:14px">${statusEmoji(j.status)}</span>
        <span style="text-align:left"><div style="font-size:12px;color:var(--text-1)">${esc(j.title).slice(0,25)}</div><div style="font-size:10px;color:var(--text-4)">${j.status}</div></span>
      </button>
    `).join('') || '<p style="color:var(--text-4);font-size:12px;padding:8px">No jobs</p>';
  } catch (e) { console.error(e); }
}

async function loadJobLogs(jobId) {
  try {
    const j = await api(`/api/jobs/${jobId}`);
    if (!j.runs?.length) { document.getElementById('logs-content').innerHTML = `<div class="empty"><h3>No runs</h3></div>`; return; }
    const logs = (await api(`/api/runs/${j.runs[0].id}/logs`)).logs || [];
    document.getElementById('logs-content').innerHTML = logs.length
      ? `<div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text-1)">${esc(j.title)} — Run #${j.runs[0].attempt}</div><div class="log-view">${logs.map(l => `<div class="log-entry"><span class="log-time">${new Date(l.timestamp).toLocaleTimeString()}</span><span class="log-lvl ${l.level[0].toLowerCase()}">${l.level}</span><span class="log-msg">${esc(l.message)}</span></div>`).join('')}</div>`
      : `<div class="empty"><h3>No logs</h3></div>`;
  } catch (e) { showToast(e.message, 'err'); }
}

// ============ Settings ============
function showApiKeyModal() { document.getElementById('api-key-input').value = API_KEY; openModal('api-key-modal'); }
function saveApiKey() {
  const k = document.getElementById('api-key-input').value.trim();
  if (!k) { showToast('Key required', 'err'); return; }
  API_KEY = k; localStorage.setItem('autocode_api_key', k);
  closeModal('api-key-modal'); showToast('Saved!'); navigateTo(currentPage);
}

async function loadRepoSelect() {
  try {
    const data = await api('/api/repos');
    document.getElementById('job-repo-select').innerHTML = (data.repos || []).map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  } catch (e) { /* */ }
}

// ============ Modal ============
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ============ Util ============
function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function ago(d) { const m = Math.floor((Date.now() - new Date(d)) / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m/60); if (h < 24) return `${h}h`; return `${Math.floor(h/24)}d`; }
function fmtStatus(s) { return s.replace(/_/g, ' '); }

function statusPill(s) {
  if (['COMPLETED','APPROVED'].includes(s)) return 'pill-green';
  if (['QUEUED'].includes(s)) return 'pill-blue';
  if (['PLANNING','CODING','TESTING','REVIEWING'].includes(s)) return 'pill-purple';
  if (['AWAITING_APPROVAL'].includes(s)) return 'pill-amber';
  if (['FAILED','CANCELLED'].includes(s)) return 'pill-red';
  return 'pill-muted';
}

function riskPill(r) { return { LOW:'green', MEDIUM:'blue', HIGH:'amber', CRITICAL:'red' }[r] || 'muted'; }

function statusEmoji(s) {
  return { QUEUED:'⏳', PLANNING:'📋', CODING:'💻', TESTING:'🧪', REVIEWING:'🔍', AWAITING_APPROVAL:'🟡', COMPLETED:'✓', FAILED:'✕', CANCELLED:'⊘' }[s] || '·';
}

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn[data-page]').forEach(el => el.addEventListener('click', () => navigateTo(el.dataset.page)));
  if (!API_KEY) showApiKeyModal(); else navigateTo('dashboard');
  refreshInterval = setInterval(() => { if (API_KEY) loadPageData(currentPage); }, 10000);
});
