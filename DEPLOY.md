# 🚀 AutoCode Platform — Deploy to aaPanel

## 1. Trên VPS (SSH vào 163.61.110.181)

```bash
# Clone repo
cd /www/wwwroot/
git clone https://github.com/ducvps12/auto-code-platform.git
cd auto-code-platform

# Install dependencies
npm install

# Setup database
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma db push --schema=packages/database/prisma/schema.prisma

# Build production
npm run build -w packages/shared
npm run build -w packages/api

# Test run
NODE_ENV=production API_PORT=4001 node packages/api/dist/server.js
```

## 2. aaPanel Node Project Config

| Field | Value |
|-------|-------|
| Path | `/www/wwwroot/auto-code-platform` |
| Name | autocode-platform |
| Run opt | `node packages/api/dist/server.js` |
| Port | `4001` |
| User | `www` |
| Node | `v24.11.1` |
| Boot | ✅ Follow the system |

## 3. Environment Variables (.env)

```env
NODE_ENV=production
API_PORT=4001
DATABASE_URL=postgresql://autocode:STRONG_PASS@localhost:5432/autocode
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-change-this
CORS_ORIGINS=https://nemarkdigital.com
ENCRYPTION_KEY=your-32-char-encryption-key-here!
```

## 4. Nginx (aaPanel auto-config qua Domain Manager)

Map domain `nemarkdigital.com` → proxy_pass `http://127.0.0.1:4001`

## 5. URLs

| Page | URL |
|------|-----|
| 🏠 Landing | https://nemarkdigital.com |
| 📊 Dashboard | https://nemarkdigital.com/dashboard |
| 🎓 Academy | https://nemarkdigital.com/academy/ |
| 🛡️ WAF | https://nemarkdigital.com/waf |
| 🔗 Tunnel | https://nemarkdigital.com/tunnel |
| 📋 Health | https://nemarkdigital.com/health |
| 🔑 API | https://nemarkdigital.com/api |
