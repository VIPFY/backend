module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: "vipfy-backend",
      script: "dist/index.js",
      max_memory_restart: "1024M",
      env: {
        NODE_ENV: "production",
        ENVIRONMENT: "production"
      },
      env_dev: {
        NODE_ENV: "production",
        ENVIRONMENT: "production",
        SSL_KEY: "/etc/letsencrypt/live/dev.vipfy.com/privkey.pem",
        SSL_CERT: "/etc/letsencrypt/live/dev.vipfy.com/cert.pem",
        GCLOUD_TRACE_NEW_CONTEXT: 1,
        USE_SSH: 1,
        USE_VOYAGER: 1,
        WINSTON: "gcp"
      },
      env_production: {
        NODE_ENV: "production",
        ENVIRONMENT: "production",
        SSL_KEY: "/etc/letsencrypt/live/vipfy.com/privkey.pem",
        SSL_CERT: "/etc/letsencrypt/live/vipfy.com/cert.pem",
        USE_SSH: 1,
        GCLOUD_TRACE_NEW_CONTEXT: 1,
        WINSTON: "gcp"
      },
      env_conf: {
        NODE_ENV: "production",
        ENVIRONMENT: "production",
        SSL_KEY: "/etc/letsencrypt/live/conferences.vipfy.store/privkey.pem",
        SSL_CERT: "/etc/letsencrypt/live/conferences.vipfy.store/cert.pem",
        GCLOUD_TRACE_NEW_CONTEXT: 1,
        USE_SSH: 1,
        USE_VOYAGER: 1,
        WINSTON: "gcp"
      },
      env_aws: {
        NODE_ENV: "production",
        ENVIRONMENT: "production",
        PROXY_LEVELS: 1,
        WINSTON: "generic"
      }
    }
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy: {
    production: {
      user: "node",
      host: "35.205.22.68",
      ref: "origin/master",
      repo: "git@bitbucket.org:vipfymarketplace/vipfy-backend.git",
      path: "/var/www/vipfy-backend",
      env: {
        NODE_ENV: "production",
        ENVIRONMENT: "production",
        SSL_KEY: "/etc/letsencrypt/live/vipfy.com/privkey.pem",
        SSL_CERT: "/etc/letsencrypt/live/vipfy.com/cert.pem",
        USE_SSH: 1,
        GCLOUD_TRACE_NEW_CONTEXT: 1,
        WINSTON: "gcp"
      },
      "post-deploy":
        "rm -rf node_modules/@vipfy-private/; npm install && rm -rf dist && node_modules/.bin/babel src -d dist --ignore tests --copy-files && sh insert_profiling.sh && pm2 startOrRestart ecosystem.config.js --env production"
    },
    dev: {
      user: "node",
      host: "35.197.80.2",
      ref: "origin/development",
      repo: "git@bitbucket.org:vipfymarketplace/vipfy-backend.git",
      path: "/var/www/vipfy-backend",
      env: {
        NODE_ENV: "production",
        ENVIRONMENT: "production",
        SSL_KEY: "/etc/letsencrypt/live/dev.vipfy.com/privkey.pem",
        SSL_CERT: "/etc/letsencrypt/live/dev.vipfy.com/cert.pem",
        GCLOUD_TRACE_NEW_CONTEXT: 1,
        USE_SSH: 1,
        USE_VOYAGER: 1,
        WINSTON: "gcp"
      },
      "post-deploy":
        "rm -rf node_modules/@vipfy-private/; npm install && rm -rf dist && node_modules/.bin/babel src -d dist --ignore tests --copy-files && sh insert_profiling.sh && pm2 startOrRestart ecosystem.config.js --env dev"
    },
    conf: {
      user: "node",
      host: "104.155.3.91",
      ref: "origin/development",
      repo: "git@bitbucket.org:vipfymarketplace/vipfy-backend.git",
      path: "/var/www/vipfy-backend",
      env: {
        NODE_ENV: "production",
        ENVIRONMENT: "production",
        SSL_KEY: "/etc/letsencrypt/live/conferences.vipfy.store/privkey.pem",
        SSL_CERT: "/etc/letsencrypt/live/conferences.vipfy.store/cert.pem",
        GCLOUD_TRACE_NEW_CONTEXT: 1,
        USE_SSH: 1,
        USE_VOYAGER: 1,
        WINSTON: "gcp"
      },
      "post-deploy":
        "rm -rf node_modules/@vipfy-private/; npm install && rm -rf dist && node_modules/.bin/babel src -d dist --ignore tests --copy-files && sh insert_profiling.sh && pm2 startOrRestart ecosystem.config.js --env conf"
    },
    aws1: {
      user: "node",
      host: "18.185.19.8",
      ref: "origin/release/0.6",
      repo: "git@bitbucket.org:vipfymarketplace/vipfy-backend.git",
      path: "/var/www/vipfy-backend",
      env: {
        NODE_ENV: "production",
        ENVIRONMENT: "production",
        PROXY_LEVELS: 1,
        WINSTON: "generic"
      },
      "post-deploy":
        "rm -rf node_modules/@vipfy-private/; npm install && rm -rf dist && node_modules/.bin/babel src -d dist --ignore tests --copy-files && sh insert_profiling.sh && pm2 startOrRestart ecosystem.config.js --env aws"
    }
  }
};
