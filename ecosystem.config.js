// PM2 Ecosystem Config — DokaGen API
// Jalankan: pm2 start ecosystem.config.js --env production
// Auto-start saat reboot: pm2 startup && pm2 save

module.exports = {
  apps: [
    {
      name: 'dokagen-api',
      script: 'dist/index.js',
      cwd: '/var/www/dokagen-api',

      // Mode cluster — manfaatkan semua CPU core
      instances: 'max',
      exec_mode: 'cluster',

      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Log
      out_file: '/var/log/dokagen/out.log',
      error_file: '/var/log/dokagen/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Auto restart
      watch: false,
      max_memory_restart: '700M',
      restart_delay: 3000,
      max_restarts: 10,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
