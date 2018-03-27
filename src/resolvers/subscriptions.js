import { withFilter } from "graphql-subscriptions";
import { decode } from "jsonwebtoken";
import { NEW_MESSAGE, pubsub } from "../constants";

export default {
  newMessage: {
    subscribe: withFilter(
      (parent, args, { token }) => {
        const { user } = decode(token);
        if (!user || !user.unitid) {
          throw new Error("Not authenticated!");
        }
        return pubsub.asyncIterator(NEW_MESSAGE);
      },
      (payload, args, { token }) => {
        if (payload) {
          const { user: { unitid } } = decode(token);

          return payload.userId === unitid;
        }
        return "";
      }
    )
  }
};
