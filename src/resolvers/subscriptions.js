import { withFilter } from "graphql-subscriptions";
import { NEW_MESSAGE, pubsub } from "../constants";

export default {
  newMessage: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(NEW_MESSAGE),
      (payload, args) => payload.userId === args.toUser
    )
  }
};
