import { withFilter } from "graphql-subscriptions";
import { NEW_MESSAGE, pubsub } from "../constants";

export default {
  newMessage: {
    subscribe: withFilter(
      () => { 
        return pubsub.asyncIterator(NEW_MESSAGE);
      },
      (payload, args) => {
        if (payload) {
          return payload.userId === args.toUser;
        }
      }
    )
  }
};
