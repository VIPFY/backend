import { PubSub } from "graphql-subscriptions";

// Create an instance to pass it into the subscriptionobject
export const pubsub = new PubSub();

export const NEW_MESSAGE = "NEW_MESSAGE";
