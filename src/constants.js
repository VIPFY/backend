import { duration } from "moment";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

// Subscription which will listen when an user gets send a new message
export const NEW_MESSAGE = "NEW_MESSAGE";
export const NEW_NOTIFICATION = "NEW_NOTIFICATION";

const options = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  db: 0,
  password: process.env.REDIS_PW,
  // reconnect after
  retryStrategy: times => Math.min(times * 50, 2000),
  tls: {},
  showFriendlyErrorStack: true
};

export const REDIS_SESSION_PREFIX = "session:";
export const USER_SESSION_ID_PREFIX = "userID-";
export const IMPERSONATE_PREFIX = "impersonations-";

if (process.env.REDIS_NO_PW == "true" || process.env.REDIS_NO_PW == "TRUE") {
  delete options.password;
}

if (
  process.env.REDIS_NO_SERVER_ID == "true" ||
  process.env.REDIS_NO_SERVER_ID == "TRUE"
) {
  options.tls = {
    checkServerIdentity: () => undefined
  };
}
export const redis = new Redis(options);

redis.on("error", (...args) => console.error("ioredis ERROR", ...args));
redis.on("connect", (...args) => console.log("ioredis connected", ...args));
redis.on("ready", (...args) => console.log("ioredis ready", ...args));
redis.on("close", (...args) => console.log("ioredis close", ...args));
redis.on("reconnecting", (...args) =>
  console.log("ioredis reconnecting", ...args)
);

const subscriber = new Redis(options);
export const pubsub = new RedisPubSub({ publisher: redis, subscriber });

// The location for uploaded files to be saved
export const userPicFolder = "profilepictures";
export const teamPicFolder = "teamlogos";
export const appPicFolder = "logos";
export const appIconFolder = "icons";

export const EMAIL_VERIFICATION_TIME = duration(7, "months");

// A reasonable upper limit on password length to prevent DOS from slow hash function
export const MAX_PASSWORD_LENGTH = 500;
export const MIN_PASSWORD_LENGTH = 10;

// ssh -N -L 6379:master.prod1.n21sml.euc1.cache.amazonaws.com:6379 nv@bastion.internal.vipfy.store
// ssh -N -L 5431:dev1.c1mg5mgfkmoa.eu-central-1.rds.amazonaws.com:5432 nv@bastion.internal.vipfy.store
