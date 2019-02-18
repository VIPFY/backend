// can't live in index.js because it has to be inserted in front of babel's code

/* begin profiling code */
const l_AWSXRay = require("aws-xray-sdk");

l_AWSXRay.config([
  l_AWSXRay.plugins.EC2Plugin,
  l_AWSXRay.plugins.ElasticBeanstalkPlugin
]);
l_AWSXRay.capturePromise();
l_AWSXRay.captureHTTPsGlobal(require("https"));
l_AWSXRay.captureHTTPsGlobal(require("http"));
/* end profiling code */
