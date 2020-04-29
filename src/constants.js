import { duration } from "moment";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";
import Bull from "bull";

const NOTIFICATION_CHANNEL = process.env.NOTIFICATION_CHANNEL
  ? `${process.env.NOTIFICATION_CHANNEL}.`
  : "";

// Subscription which will listen when an user gets send a new message
export const NEW_MESSAGE = `${NOTIFICATION_CHANNEL}NEW_MESSAGE`;
export const NEW_NOTIFICATION = `${NOTIFICATION_CHANNEL}NEW_NOTIFICATION`;
export const TO_WEBSITEWORKER = `${NOTIFICATION_CHANNEL}TO_WEBSITEWORKER`;

const options = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  db: 0,
  password: process.env.REDIS_PW,
  // reconnect after
  retryStrategy: (times) => Math.min(times * 50, 2000),
  tls: {},
  showFriendlyErrorStack: true,
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
    checkServerIdentity: () => undefined,
  };
}
export const redis = new Redis(options);

redis.on("error", (error) => console.error("ioredis ERROR", error || ""));
redis.on("connect", (args) => console.log("ioredis connected", args || ""));
redis.on("ready", (args) => console.log("ioredis ready", args || ""));
redis.on("close", (args) => console.log("ioredis close", args || ""));
redis.on("reconnecting", (args) =>
  console.log("ioredis reconnecting", args || "")
);

const subscriber = new Redis(options);
subscriber.on("error", (error) =>
  console.error("ioredis Subscriptions ERROR", error || "")
);
subscriber.on("connect", (args) =>
  console.log("ioredis Subscriptions connected", args || "")
);
subscriber.on("ready", (args) =>
  console.log("ioredis Subscriptions ready", args || "")
);
subscriber.on("close", (args) =>
  console.log("ioredis Subscriptions close", args || "")
);
subscriber.on("reconnecting", (args) =>
  console.log("ioredis Subscriptions reconnecting", args || "")
);

export const pubsub = new RedisPubSub({ publisher: redis, subscriber });

export const jobQueue = new Bull("vipfy-websiteworkers", { redis: options });

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

export const VIPFY_MANAGEMENT = [
  "f876804e-efd0-48b4-a5b2-807cbf66315f", // Pascal
  "98cdb502-51fc-4c0d-a5c7-ee274b6bb7b5", // Markus
  "96d65748-7d36-459a-97d0-7f52a7a4bbf0", // Nils
  "91bd25cb-65cc-4dca-b0c8-285dbf5919f3", // Jannis
];

export const EU_COUNTRIES = [
  { value: "AT", name: "Austria" },
  { value: "BE", name: "Belgium" },
  { value: "BG", name: "Bulgaria" },
  { value: "HR", name: "Croatia" },
  { value: "CY", name: "Cyprus" },
  { value: "CZ", name: "Czech Republic" },
  { value: "DK", name: "Denmark" },
  { value: "EE", name: "Estonia" },
  { value: "FI", name: "Finland" },
  { value: "FR", name: "France" },
  { value: "DE", name: "Germany" },
  { value: "GR", name: "Greece" },
  { value: "HU", name: "Hungary" },
  { value: "IE", name: "Ireland" },
  { value: "IT", name: "Italy" },
  { value: "LV", name: "Latvia" },
  { value: "LT", name: "Lithuania" },
  { value: "LU", name: "Luxembourg" },
  { value: "MT", name: "Malta" },
  { value: "NL", name: "Netherlands" },
  { value: "PL", name: "Poland" },
  { value: "PT", name: "Portugal" },
  { value: "RO", name: "Romania" },
  { value: "SK", name: "Slovakia" },
  { value: "SI", name: "Slovenia" },
  { value: "ES", name: "Spain" },
  { value: "SE", name: "Sweden" }
];
