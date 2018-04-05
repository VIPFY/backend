import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
/* eslint-disable no-unused-vars */

export default {
  updateProfilePic: requiresAuth.createResolver(
    async (parent, { profilepicture }, { models, token }) => {
      try {
        const { user: { unitid } } = decode(token);
        await models.Unit.update({ profilepicture }, { where: { unitid } });
        return {
          ok: true
        };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  deleteUser: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    const { user: { unitid } } = decode(token);

    await models.Human.destroy({ where: { unitid } });
    return "User was deleted";
  }),

  freezeAccount: requiresAuth.createResolver(async (parent, { unitid }, { models }) => {
    const accountExists = await models.Unit.findById(unitid);

    if (!accountExists) {
      throw new Error("User not found!");
    }

    try {
      await models.Unit.update({ suspended: !accountExists.suspended }, { where: { id: unitid } });
      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
