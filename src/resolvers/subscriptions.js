import { withFilter } from "graphql-subscriptions";
import { NEW_MESSAGE, pubsub } from "../constants";

export default {
  newMessage: {
    subscribe: withFilter(
      (parent, args, { modell, user }, data) => {
        if (!user || !user.id) {
          throw new Error("Not authenticated!");
        }
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
