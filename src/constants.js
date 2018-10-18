import { PubSub } from "graphql-subscriptions";
import { duration } from "moment";

// Create an instance to pass it into the subscriptionobject
export const pubsub = new PubSub();

// Subscription which will listen when an user gets send a new message
export const NEW_MESSAGE = "NEW_MESSAGE";
export const NEW_NOTIFICATION = "NEW_NOTIFICATION";

// The location for uploaded files to be saved
export const userPicFolder = "unit_profilepicture";
export const appPicFolder = "logos";

export const EMAIL_VERIFICATION_TIME = duration(7, "months");

// A reasonable upper limit on password length to prevent DOS from slow hash function
export const MAX_PASSWORD_LENGTH = 500;
