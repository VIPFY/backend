// this enables tracing and profiling
// only applied by pm2 on deploys
// can't live in index.js because it has to be inserted in front of babel's code
require("@google-cloud/trace-agent").start({
  samplingRate: 500,
  enhancedDatabaseReporting: true,
  projectId: "vipfy-148316"
});

require("@google-cloud/profiler").start({
  serviceContext: {
    service: "vipfy-backend",
    version: "1.0.0"
  }
});
