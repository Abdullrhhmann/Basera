module.exports = {
  apps: [{
    name: 'basira-backend',
    script: 'index.js',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 5001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto-restart configuration
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Restart delay
    restart_delay: 4000,
    
    // Maximum number of restarts within a minute before stopping
    max_restarts: 10,
    min_uptime: '10s',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Environment-specific settings
    instance_var: 'INSTANCE_ID',
    
    // Advanced features
    source_map_support: true,
    
    // Cron restart (optional - restart at 2 AM daily)
    // cron_restart: '0 2 * * *',
    
    // Time zone
    time: true,
    
    // Interpreter
    interpreter: 'node',
    interpreter_args: '--max-old-space-size=2048',
    
    // Error handling
    exp_backoff_restart_delay: 100,
    
    // Monitoring
    pmx: true,
    automation: false
  }]
};

