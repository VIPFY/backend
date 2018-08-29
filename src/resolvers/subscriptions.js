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
        console.log("Ich kann nciht funktionieren", args, token);
        // const { user } = decode(token);
        // if (!token || token == "null" || !user || !user.unitid) {
        //   throw new AuthError();
        // }
        return pubsub.asyncIterator(NEW_MESSAGE);
      },
      (payload, variables) => {
        if (payload && variables) {
          return payload.receiver == variables.groupid;
        }
        return "";
      }
    )
  },

  newNotification: {
    subscribe: withFilter(
      (parent, args, { token }) => {
        console.log("ja, das hier klappt wirklich", parent, args, token);
        const {
          user: { unitid }
        } = decode(token);

        if (!unitid) {
          throw new AuthError();
        }
        return pubsub.asyncIterator(NEW_NOTIFICATION);
      },
      (payload, variables) => {
        if (payload && variables) {
          console.log("in der payload", payload, variables);
          console.log(payload.receiver == variables.receiver);
          if (payload.receiver == variables.receiver) {
            return { haifa: "Es klappt" };
          }
        }
        return "";
      }
    )
  }
};
