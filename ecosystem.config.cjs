/**
 * PM2 Process Manager Configuration for VPS
 *
 * Runs both the Next.js web application and the Bree background job scheduler.
 * Usage on VPS:
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs
 *   pm2 restart all
 */

module.exports = {
  apps: [
    {
      name: "dental-discovery-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "dental-discovery-worker",
      script: "jobs/index.mjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
