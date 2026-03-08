// ecosystem.config.js — PM2 / aaPanel Config
// Deploy: Node Project on aaPanel (163.61.110.181)
module.exports = {
  apps: [{
    name: 'autocode-platform',
    script: 'packages/api/dist/server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      API_PORT: 4001,
      DATABASE_URL: 'postgresql://autocode:autocode@localhost:5432/autocode?schema=public',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'CHANGE_THIS_IN_PRODUCTION',
      CORS_ORIGINS: 'https://nemarkdigital.com,https://www.nemarkdigital.com',
      ENCRYPTION_KEY: 'CHANGE_THIS_32_CHAR_KEY_PROD_ENV!',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/app.log',
    max_memory_restart: '512M',
    watch: false,
  }]
};
