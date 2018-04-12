import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { createPassword } from "../../helpers/functions";
import { sendEmail } from "../../services/mailjet";
/* eslint-disable no-unused-vars */

export default {
  createUser: requiresAuth.createResolver(async (parent, { user }, { models }) => {
    const { profilepicture, position, email } = user;

    return models.sequelize.transaction(async ta => {
      try {
        const passwordhash = await createPassword(email);
        const unit = await models.Unit.create({ profilepicture, position }, { transaction: ta });
        const p1 = models.Human.create(
          { unitid: unit.id, ...user, passwordhash },
          { transaction: ta }
        );
        const p2 = models.Email.create({ unitid: unit.id, email }, { transaction: ta });
        await Promise.all([p1, p2]);

        // Don't send emails when testing the database!
        if (process.env.ENVIRONMENT == "testing") {
          sendEmail(email, passwordhash);
        }

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    });
  }),

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

  updateUser: requiresAuth.createResolver(async (parent, { unitid, user }, { models, token }) => {
    try {
      if (user.position) {
        await models.Unit.update({ ...user }, { where: { id: unitid } });

        return { ok: true };
      }
      await models.Human.update({ ...user }, { where: { unitid } });

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

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
