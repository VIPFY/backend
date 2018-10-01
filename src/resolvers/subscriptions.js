import { withFilter } from "graphql-subscriptions";
import { decode } from "jsonwebtoken";
import { NEW_MESSAGE, NEW_NOTIFICATION, pubsub } from "../constants";
import { AuthError } from "../errors";

/**
 * withFilter takes 2 arguments:
 * 1: A function that returns the asyncIterator we're filtering for.
 * 2: A condition that specifies if an event should pass through the filter.
 */

export default {
  newMessage: {
    subscribe: withFilter(
      (parent, args, { token }) => {
        if (!token || token == "null") {
          throw new AuthError();
        }

        return pubsub.asyncIterator(NEW_MESSAGE);
      },
      (payload, args) => {
        if (payload && args) {
          return payload.newMessage.receiver == args.groupid;
        }
        return "";
      }
    )
  },

  newNotification: {
    subscribe: withFilter(
      (parent, args, { token }) => {
        if (!token || token == "null") {
          throw new AuthError();
        }

        return pubsub.asyncIterator(NEW_NOTIFICATION);
      },
      (payload, args, { token }) => {
        const { user } = decode(token);
        return payload.newNotification.receiver == user.unitid;
      }
    )
  }
};
