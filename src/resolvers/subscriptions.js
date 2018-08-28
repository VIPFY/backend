import { withFilter } from "graphql-subscriptions";
import { decode } from "jsonwebtoken";
import { NEW_MESSAGE, NEW_NOTIFICATION, pubsub } from "../constants";
import { AuthError } from "../errors";

export default {
  newMessage: {
    subscribe: withFilter(
      (parent, args, { token }) => {
        const { user } = decode(token);
        if (!user || !user.unitid) {
          throw new AuthError();
        }
        return pubsub.asyncIterator(NEW_MESSAGE);
      },
      (payload, args, { token }) => {
        if (payload) {
          const {
            user: { unitid }
          } = decode(token);

          return payload.userId === unitid;
        }
        return "";
      }
    )
  },

  newNotification: {
    subscribe: withFilter(
      (parent, args, { token }) => {
        const {
          user: { unitid }
        } = decode(token);

        if (!unitid) {
          throw new AuthError();
        }
        return pubsub.asyncIterator(NEW_NOTIFICATION);
      },
      (payload, args, { token }) => {
        if (payload) {
          const { user: unitid } = decode(token);

          return payload.userId == unitid;
        }
        return "";
      }
    )
  }
};
