# ⚡ AutoCode Platform

**Hệ sinh thái automation toàn diện** — AI Coding + Anti-DDoS WAF + Tunnel Infrastructure

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-24+-green.svg)](https://nodejs.org)
[![Go](https://img.shields.io/badge/Go-1.24+-blue.svg)](https://go.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│              AutoCode Platform               │
├──────────┬──────────┬───────────┬────────────┤
│ 🤖 AI    │ 🛡️ WAF   │ 🔗 Tunnel │ 🖥️ Dashboard│
│ Agents   │ Shield   │ Platform  │     UI     │
├──────────┴──────────┴───────────┴────────────┤
│  PostgreSQL  │  Redis Queue  │  Docker       │
└──────────────┴──────────────┴────────────────┘
```

## 📦 Packages

| Package | Tech | Description |
|---------|------|-------------|
| `api` | TypeScript/Express | REST API + Web Dashboard |
| `worker` | TypeScript | AI Coding Agents (Planner → Coder → Reviewer) |
| `database` | Prisma/PostgreSQL | Data persistence layer |
| `shared` | TypeScript | Common types & constants |
| `mango-waf` | Go | Anti-DDoS L7 WAF (10-layer defense) |
| `proxvn-tunnel` | Go | Tunnel platform (HTTP/TCP/UDP) |

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/ducvps12/auto-code-platform.git
cd auto-code-platform

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Install & setup
npm install
cp .env.example .env  # Edit with your API keys
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Build & run
npm run build
npm run dev:api       # Terminal 1 — API + Dashboard
npm run dev:worker    # Terminal 2 — AI Worker Engine

# 5. Open http://localhost:3000
```

## 🤖 AI Coding Pipeline

```
Task → Clone Repo → Plan → Code → Test → Review → Push → Create PR
         │           │      │       │       │        │        │
         Git       Gemini  Gemini  Shell  Gemini    Git    GitHub API
```

## 🛡️ Mango WAF — 10-Layer Defense

```
Layer 0: XDP/eBPF Hardware Filtering (10M RPS)
Layer 1: TLS Early Reject
Layer 2: JA3/JA4 Fingerprinting
Layer 3: IP Intelligence & Reputation
Layer 4: WAF (28 OWASP CRS Rules)
Layer 5: JS Proof-of-Work Challenge
Layer 6: AI Behavior Analysis
Layer 7: Adaptive Learning
Layer 8: Smart CDN Caching
Layer 9: Upstream Load Balancing
```

## 🔗 ProxVN Tunnel

- **HTTP/HTTPS** — Auto SSL subdomain
- **TCP** — SSH, RDP, Database forwarding
- **UDP** — Game servers, real-time apps
- **File Sharing** — WebDAV-based secure sharing

## 📋 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/repos` | List repositories |
| POST | `/api/repos` | Register repository |
| GET | `/api/jobs` | List coding jobs |
| POST | `/api/jobs` | Create coding job |
| GET | `/api/approvals/pending` | Pending approvals |
| GET | `/api/runs/:id/logs` | Job execution logs |

## 🛠️ Tech Stack

- **Runtime**: Node.js 24, Go 1.24+
- **API**: Express.js, Zod validation
- **AI**: Google Gemini (`@google/generative-ai`)
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Redis Sorted Set
- **WAF**: Custom Go engine, OWASP CRS
- **Tunnel**: Go, TLS 1.3, JWT auth
- **DevOps**: Docker, Docker Compose

## 📄 License

MIT License — Built for the community 🚀
