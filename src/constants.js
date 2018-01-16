import { PubSub } from "graphql-subscriptions";

// Create an instance to pass it into the subscriptionobject
export const pubsub = new PubSub();

// Subscription which will listen when an user gets send a new message
export const NEW_MESSAGE = "NEW_MESSAGE";

export const PORT = process.env.PORT || 4000;

