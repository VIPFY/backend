import { decode } from "jsonwebtoken";
import * as messaging from "@vipfy-private/messaging";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  /**
   * Return all messages the current user can see from the messagegroup "groupid"
   * (i.e. all messages between visibletimestart and visibletimeend of all group memberships
   * of the user for that group), sorted by sendtime.
   */
  fetchDialog: requiresAuth.createResolver(async (parent, { groupid }, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      return await messaging.fetchDialog(models, unitid, groupid);
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { error: err } });
    }
  }),

  fetchGroups: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      return await messaging.fetchGroups(models, unitid);
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchPublicUser: requiresAuth.createResolver(async (parent, { userid }, { models }) => {
    try {
      const user = await models.User.findById(userid);

      return user;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  })
};
