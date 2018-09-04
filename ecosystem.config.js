module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [
    {
      name      : 'vipfy-backend',
      script    : 'dist/index.js',
      max_memory_restart: '1024M',
      env: {
        NODE_ENV: 'production',
        ENVIRONMENT: 'production',
        SSL_KEY: '/etc/letsencrypt/live/dev.vipfy.com/privkey.pem',
        SSL_CERT: '/etc/letsencrypt/live/dev.vipfy.com/cert.pem',
        GCLOUD_TRACE_NEW_CONTEXT: 1,
        USE_VOYAGER: 1
      },
      env_production : {
        NODE_ENV: 'production',
        ENVIRONMENT: 'production',
        SSL_KEY: '/etc/letsencrypt/live/vipfy.com/privkey.pem',
        SSL_CERT: '/etc/letsencrypt/live/vipfy.com/cert.pem',
        GCLOUD_TRACE_NEW_CONTEXT: 1
      }
    }
  ],
 
  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy : {
    production : {
      user : 'node',
      host : '35.205.22.68',
      ref  : 'origin/master',
      repo : 'git@bitbucket.org:vipfymarketplace/vipfy-backend.git',
      path : '/var/www/vipfy-backend',
      env: {
        NODE_ENV: 'production',
        ENVIRONMENT: 'production',
        SSL_KEY: '/etc/letsencrypt/live/vipfy.com/privkey.pem',
        SSL_CERT: '/etc/letsencrypt/live/vipfy.com/cert.pem',
        GCLOUD_TRACE_NEW_CONTEXT: 1
      },
      'post-deploy' : 'npm install && rm -rf dist && node_modules/.bin/babel src -d dist --ignore tests --copy-files && sh insert_profiling.sh && pm2 startOrRestart ecosystem.config.js --env production'
    },
    dev : {
      user : 'node',
      host : '35.197.80.2',
      ref  : 'origin/development',
      repo : 'git@bitbucket.org:vipfymarketplace/vipfy-backend.git',
      path : '/var/www/vipfy-backend',
      env: {
        NODE_ENV: 'production',
        ENVIRONMENT: 'production',
        SSL_KEY: '/etc/letsencrypt/live/dev.vipfy.com/privkey.pem',
        SSL_CERT: '/etc/letsencrypt/live/dev.vipfy.com/cert.pem',
        GCLOUD_TRACE_NEW_CONTEXT: 1,
        USE_VOYAGER: 1
      },
      'post-deploy' : 'npm install && rm -rf dist && node_modules/.bin/babel src -d dist --ignore tests --copy-files && sh insert_profiling.sh && pm2 startOrRestart ecosystem.config.js'
    }
  }
};