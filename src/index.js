/*
 * This is the main component which has the server. It imports all models,
 * resolvers, creates the schema with them, uses middleware for the app and
 * establishes the connection to the database before starting the server
 */

import cors from "cors";
import express from "express";
import fs from "fs";
import https from "https";
import http from "http";
import jwt from "jsonwebtoken";

// To create the GraphQl functions
import { ApolloServer, makeExecutableSchema } from "apollo-server-express";
import { execute, subscribe } from "graphql";
import { SubscriptionServer } from "subscriptions-transport-ws";
import depthLimit from "graphql-depth-limit";
import { createContext } from "dataloader-sequelize";
import models from "@vipfy-private/sequelize-setup";
import * as Services from "@vipfy-private/services";
import { express as voyagerMiddleware } from "graphql-voyager/middleware";
import typeDefs from "./schemas/schema";
import resolvers from "./resolvers/resolvers";
import { authMiddleware, loggingMiddleWare } from "./middleware";
import logger from "./loggers";
import { formatError, AuthError } from "./errors";
import { attachmentLink } from "./services/gcloud";

const RateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const Redis = require("ioredis");

Services.setLogger(logger);

const app = express();
const {
  ENVIRONMENT,
  TOKEN_SET,
  SSL_KEY,
  SSL_CERT,
  SECRET,
  TOKEN_DEVELOPMENT,
  USE_VOYAGER,
  USE_SSH,
  PROXY_LEVELS
} = process.env;

const secure = ENVIRONMENT == "production" ? "s" : "";
const PORT = process.env.PORT || 4000;
const USE_XRAY =
  !!process.env.USE_XRAY &&
  process.env.USE_XRAY != "false" &&
  process.env.USE_XRAY != "FALSE";

const trustProxy = PROXY_LEVELS === undefined ? false : PROXY_LEVELS;
let server;

if (!SECRET) {
  throw new Error("No secret set!");
}

const AWSXRay = USE_XRAY ? require("aws-xray-sdk") : null;

if (USE_XRAY) {
  AWSXRay.setLogger(logger);
  AWSXRay.middleware.enableDynamicNaming("*.vipfy.store");
}

// We don't need certificates and https for development
if (USE_SSH) {
  const httpsOptions = {
    key: fs.readFileSync(
      SSL_KEY || "/etc/letsencrypt/live/vipfy.com/privkey.pem"
    ),
    cert: fs.readFileSync(
      SSL_CERT || "/etc/letsencrypt/live/vipfy.com/cert.pem"
    )
  };

  server = https.createServer(httpsOptions, app);
} else {
  server = http.createServer(app);
}

app.set(
  "trust proxy",
  "loopback, 172.31.0.0/20, 172.31.16.0/20, 172.31.32.0/20, 2a05:d014:e3c:9001::/64, 2a05:d014:e3c:9002::/64, 2a05:d014:e3c:9003::/64"
);

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

// console.log(limiter);

// // apply rate limit to all requests
// app.use(limiter);

// eslint-disable-next-line
export const schema = makeExecutableSchema({ typeDefs, resolvers });

if (USE_XRAY) {
  const traceResolvers = require("@lifeomic/graphql-resolvers-xray-tracing");
  traceResolvers(schema);
}

// Enable our Frontend running on localhost:3000 to access the Backend
const corsOptions = {
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
          "https://aws.vipfy.store"
        ]
      : "http://localhost:3000",
  credentials: true // <-- REQUIRED backend setting
};

app.use(authMiddleware);
app.use(cors(corsOptions));
app.use(loggingMiddleWare);

if (USE_XRAY) {
  app.use(AWSXRay.express.openSegment("backend"));
}

let engine = undefined;
if (ENVIRONMENT == "production") {
  engine = {
    privateVariables: ["pw", "password"] // TODO
  };
}

const gqlserver = new ApolloServer({
  schema,
  formatError,
  context: ({ req }) => ({
    models,
    token: TOKEN_SET ? TOKEN_DEVELOPMENT : req.headers["x-token"],
    logger,
    SECRET,
    ip: req.ip,
    segment: req.segment
  }),
  debug: ENVIRONMENT == "development",
  validationRules: [depthLimit(10)],
  introspection: true,
  tracing: true
});

gqlserver.applyMiddleware({ app, path: "/graphql" });

if (USE_VOYAGER) {
  app.use("/voyager", voyagerMiddleware({ endpointUrl: "/graphql" }));
}

// The home route is currently empty
app.get("/", (req, res) =>
  res.send(`Go to http${secure}://localhost:${PORT}/graphiql for the Interface`)
);

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

SubscriptionServer.create(
  {
    execute,
    subscribe,
    schema,
    onConnect: async ({ token }) => {
      if (token && token != "null") {
        try {
          jwt.verify(token, SECRET);

          return { models, token };
        } catch (err) {
          throw new AuthError({
            message: err.message,
            internalData: { error: "Subscription Error" }
          });
        }
      }
      return {};
    }
  },
  {
    server,
    path: "/subscriptions"
  }
);

if (USE_XRAY) {
  // Required at the end of your routes / first in error handling routes
  app.use(AWSXRay.express.closeSegment());
}

if (ENVIRONMENT != "testing") {
  server.listen(PORT, "0.0.0.0", () => {
    if (process.env.LOGGING) {
      console.log(`Server running on port ${PORT}`);
    }
  });
}
