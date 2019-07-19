import { duration } from "moment";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

// Subscription which will listen when an user gets send a new message
export const NEW_MESSAGE = "NEW_MESSAGE";
export const NEW_NOTIFICATION = "NEW_NOTIFICATION";

const options = {
  host: "127.0.0.1",
  port: 6379,
  //  password: "FrxPxFCN96Cu6CCtt98WMrsn",
  db: 0,
  // reconnect after
  retryStrategy: times => Math.min(times * 50, 2000)
};

export const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options)
});

// The location for uploaded files to be saved
export const userPicFolder = "profilepictures";
export const teamPicFolder = "teamlogos";
export const appPicFolder = "logos";
export const appIconFolder = "icons";

export const EMAIL_VERIFICATION_TIME = duration(7, "months");

// A reasonable upper limit on password length to prevent DOS from slow hash function
export const MAX_PASSWORD_LENGTH = 500;
export const MIN_PASSWORD_LENGTH = 10;
