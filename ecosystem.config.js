module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [
    {
      name      : 'vipfy-backend',
      script    : 'dist/index.js',
      max_memory_restart: '200M',
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production : {
        NODE_ENV: 'production',
        ENVIRONMENT: 'production'
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
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && rm -rf dist && babel src -d dist --ignore tests && pm2 startOrRestart ecosystem.config.js --env production'
    },
    dev : {
      user : 'node',
      host : '35.197.80.2',
      ref  : 'origin/development',
      repo : 'git@bitbucket.org:vipfymarketplace/vipfy-backend.git',
      path : '/var/www/vipfy-backend',
      key : 'ci-dev-deploy',
      env: {
        NODE_ENV: 'production',
        ENVIRONMENT: 'production',
        SSL_KEY: '/etc/letsencrypt/live/dev.vipfy.com/privkey.pem',
        SSL_CERT: '/etc/letsencrypt/live/dev.vipfy.com/cert.pem'
      },
      'post-deploy' : 'npm install && rm -rf dist && node_modules/.bin/babel src -d dist --ignore tests && pm2 startOrRestart ecosystem.config.js --env production'
    }
  }
};