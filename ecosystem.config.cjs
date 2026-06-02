"use strict";
module.exports = {
  apps: [
    {
      name: "aeondial",
      cwd: "/home/aeondial",
      script: "npm",
      args: "start",
      autorestart: true,
      min_uptime: "20s",
      max_restarts: 50,
      restart_delay: 5000,
      max_memory_restart: "800M",
      env: { NODE_ENV: "production", PORT: "3000" },
    },
  ],
};
