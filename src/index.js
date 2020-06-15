/*
 * This is the main component which has the server. It imports all models,
 * resolvers, creates the schema with them, uses middleware for the app and
 * establishes the connection to the database before starting the server
 */

import express from "express";
import fs from "fs";
import https from "https";
import http from "http";
import { performance } from "perf_hooks";

// To create the GraphQl functions
import { ApolloServer, makeExecutableSchema } from "apollo-server-express";
import depthLimit from "graphql-depth-limit";
import { createContext } from "dataloader-sequelize";
import models from "@vipfy-private/sequelize-setup";
import * as Services from "@vipfy-private/services";
import { express as voyagerMiddleware } from "graphql-voyager/middleware";
import typeDefs from "./schemas/schema";
import resolvers from "./resolvers/resolvers";
import { loggingMiddleWare, sessionMiddleware } from "./middleware";
import logger from "./loggers";
import { formatError } from "./errors";
import { attachmentLink } from "./services/gcloud";
import { redis, jobQueue } from "./constants";
import { version as serverVersion } from "../package.json";
import { updateNotification } from "./helpers/functions";

// const RateLimit = require("express-rate-limit");
// const RedisStore = require("rate-limit-redis");

Services.setLogger(logger);

const app = express();
const {
  ENVIRONMENT = "development",
  PORT = 4000,
  SSL_KEY,
  SSL_CERT,
  SECRET,
  USE_VOYAGER,
  USE_SSH,
  PROXY_LEVELS,
} = process.env;

/* const USE_XRAY =
  !!process.env.USE_XRAY &&
  process.env.USE_XRAY != "false" &&
  process.env.USE_XRAY != "FALSE";
*/
const trustProxy = PROXY_LEVELS === undefined ? false : PROXY_LEVELS;
let server;

if (!SECRET) {
  throw new Error("No secret set!");
}

// const AWSXRay = USE_XRAY ? require("aws-xray-sdk") : null;

/* if (USE_XRAY) {
  AWSXRay.setLogger(logger);
  AWSXRay.middleware.enableDynamicNaming("*.vipfy.store");
} */

// We don't need certificates and https for development
if (USE_SSH) {
  const httpsOptions = {
    key: fs.readFileSync(
      SSL_KEY || "/etc/letsencrypt/live/vipfy.com/privkey.pem"
    ),
    cert: fs.readFileSync(
      SSL_CERT || "/etc/letsencrypt/live/vipfy.com/cert.pem"
    ),
  };

  server = https.createServer(httpsOptions, app);
} else {
  server = http.createServer(app);
}

app.set("trust proxy", [
  "loopback",
  "172.31.0.0/20",
  "172.31.16.0/20",
  "172.31.32.0/20",
  "2a05:d014:e3c:9001::/64",
  "2a05:d014:e3c:9002::/64",
  "2a05:d014:e3c:9003::/64",
]);

// TODO: we really want rate limiting with different limits per endpoint
// but we have to build that ourselves, no such packet exists for graphql
// const limiter = RateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 100, // limit each IP to 100 requests per windowMs
//   store: new RedisStore({
//     expiry: 60, // set to equivalent of windowMs, but in seconds
//     client: new Redis({
//       port: 5379,
//       host: "a.redis.vipfy.store",
//       password: "FrxPxFCN96Cu6CCtt98WMrsn",
//       db: 0
//     })
//   })
// });

// // apply rate limit to all requests
// app.use(limiter);

// eslint-disable-next-line
export const schema = makeExecutableSchema({ typeDefs, resolvers });

/* if (USE_XRAY) {
  const traceResolvers = require("@lifeomic/graphql-resolvers-xray-tracing");
  traceResolvers(schema);
} */

app.use((req, res, next) => {
  let tries = 3;
  // Recursive Function to retry on a lost connection to Redis
  const lookupSession = error => {
    if (error) {
      return next(error);
    }

    tries--;

    if (req.session !== undefined) {
      return next();
    }

    if (tries < 0) {
      return next(new Error("Could not get session"));
    }

    return sessionMiddleware(req, res, lookupSession);
  };

  lookupSession();
});

app.use(loggingMiddleWare);
/* if (USE_XRAY) {
  app.use(AWSXRay.express.openSegment("backend"));
} */
// eslint-disable-next-line
let engine = undefined;
if (ENVIRONMENT == "production") {
  engine = {
    privateVariables: ["pw", "password"], // TODO
  };
}

const gqlserver = new ApolloServer({
  schema,
  formatError,
  context: ({ req }) => ({
    models,
    redis,
    userData: {
      browser: req.headers["user-agent"],
      language: req.headers["accept-language"],
      host: req.headers["x-user-host"],
    },
    session: req.session,
    sessionID: req.sessionID,
    deviceId: req.headers["x-device"],
    logger,
    SECRET,
    ip: req.ip,
    segment: req.segment,
  }),
  debug: ENVIRONMENT == "development",
  playground: ENVIRONMENT == "development",
  validationRules: [depthLimit(10)],
  upload: {
    // Max allowed non-file multipart form field size in bytes; enough for your queries (default: 1 MB).
    // maxFieldSize: 5,
    // Max allowed file size in bytes (default: Infinity).
    maxFileSize: 20000000,
    // Max allowed number of files (default: Infinity).
    maxFiles: 5,
  },
  introspection: true,
  tracing: true,
});

gqlserver.applyMiddleware({
  app,
  cors: {
    origin:
      ENVIRONMENT == "production"
        ? [
            "https://vipfy.com",
            "https://www.vipfy.com",
            "https://dev.vipfy.com",
            "https://vipfy.store",
            "https://www.vipfy.store",
            "https://dev.vipfy.store",
            "http://localhost:3000",
            "https://aws.vipfy.store",
            "https://aws2.vipfy.store",
          ]
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://aws2.vipfy.store",
            "http://localhost:9000",
          ],
    credentials: true, // <-- REQUIRED backend setting for sessions
  },
});

if (USE_VOYAGER) {
  app.use("/voyager", voyagerMiddleware({ endpointUrl: "/graphql" }));
}

// The home route is currently empty
app.get("/", (_req, res) =>
  res.send(`Go to http://localhost:${PORT}/graphiql for the Interface`)
);

// Is this still needed?
app.post("/download", async (req, res) => {
  try {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(403).send({ error: "Not Authenticated!" });
    }

    const idHasFile = await attachmentLink(req.body.id, res);
    if (!idHasFile) {
      return res.status(404).send("This message has no attachment");
    }

    return res.status(200);
  } catch (err) {
    logger.error(err);
    return res.status(500).send({ error: err });
  }
});

app.get("/health_ujgz1pra68", async (_req, res) => {
  const t0 = performance.now();
  res.set("Cache-Control", "no-cache");
  const result = {
    postgres: false,
    redis: false,
    time: 0,
    version: serverVersion,
  };
  const seq = await models.sequelize.query("SELECT 1 as one;", {
    type: models.sequelize.QueryTypes.SELECT,
  });
  result.postgres = seq[0].one == 1;

  const testId = `healthcheck-${Math.random().toString(36).substring(7)}`;
  const testValue = Math.random().toString(36).substring(7);
  const r1 = await redis.set(testId, testValue);
  const r2 = await redis.get(testId);
  const r3 = await redis.del(testId);
  result.redis = r1 == "OK" && r2 == testValue && r3 == 1;

  result.time = performance.now() - t0;

  if (!result.postgres || !result.redis || result.time > 30000) {
    res.status(503);
    console.error("health check error", { result, seq, r1, r2, r3 });
  }

  res.json(result);
});

jobQueue.on("global:failed", async (jobid, err) => {
  const job = await jobQueue.getJob(jobid);
  await updateNotification(
    {
      receiver: job.data.unitid,
      message: `Job ${job.data.jobtitle} failed`,
      options: {
        failed: true,
      },
    },
    null,
    false,
    job.data.notification
  );
});

jobQueue.on("global:stalled", async (jobid, err) => {
  const job = await jobQueue.getJob(jobid);
  await updateNotification(
    {
      receiver: job.data.unitid,
      message: `Job ${job.data.jobtitle} stalled`,
      options: {
        failed: true,
      },
    },
    null,
    false,
    job.data.notification
  );
});

/* if (USE_XRAY) {
  // Required at the end of your routes / first in error handling routes
  app.use(AWSXRay.express.closeSegment());
} */

// error handling, must be last
app.use(function (error, req, res, next) {
  console.error(error);
  res.status(503);
  res.json({ errors: [error.message] });
});

if (ENVIRONMENT != "testing") {
  server.listen(PORT, "0.0.0.0", () => {
    if (process.env.LOGGING) {
      console.log(`Server running on port ${PORT} 🚀`);
    }
  });
}
