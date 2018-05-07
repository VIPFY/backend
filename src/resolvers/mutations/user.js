import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { requiresAuth, requiresAdmin } from "../../helpers/permissions";
import { createPassword } from "../../helpers/functions";
import { sendEmail } from "../../services/mailjet";
import { uploadFile } from "../../services/gcloud";
/* eslint-disable no-unused-vars */

export default {
  createUser: requiresAdmin.createResolver(async (parent, { user }, { models }) => {
    const { profilepicture, encodedpic, position, email } = user;
    if (profilepicture) {
      console.log(encodedpic);
      const test = await uploadFile(encodedpic, profilepicture);
      console.log(test);
    }

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
        if (process.env.ENVIRONMENT != "testing") {
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

  adminUpdateUser: requiresAdmin.createResolver(
    async (parent, { unitid, user }, { models, token }) => {
      try {
        if (user.password) {
          const passwordhash = await bcrypt.hash(user.password, 12);
          await models.Human.update({ passwordhash }, { where: { unitid } });

          return { ok: true };
        }

        if (user.position) {
          await models.Unit.update({ ...user }, { where: { id: unitid } });
          return { ok: true };
        }
        await models.Human.update({ ...user }, { where: { unitid } });

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  deleteUser: requiresAuth.createResolver(async (parent, { unitid }, { models, token }) => {
    const alreadyDeleted = await models.Unit.findById(unitid);
    if (alreadyDeleted.deleted) throw new Error("User already deleted!");

    return models.sequelize.transaction(async ta => {
      try {
        const p1 = models.Unit.update(
          { deleted: true, profilepicture: "" },
          { where: { id: unitid } },
          { transaction: ta }
        );
        const p2 = models.Human.update(
          { firstname: "Deleted", middlename: "", lastname: "User" },
          { where: { unitid } },
          { transaction: ta }
        );
        const p3 = models.Email.destroy({ where: { unitid } }, { transaction: ta });
        const p4 = models.Address.update(
          { address: { city: "deleted" }, description: "deleted" },
          { where: { unitid } },
          { transaction: ta }
        );
        const p5 = models.ParentUnit.destroy({ where: { childunit: unitid } }, { transaction: ta });
        await Promise.all([p1, p2, p3, p4, p5]);

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    });
  }),

  freezeAccount: requiresAdmin.createResolver(async (parent, { unitid }, { models }) => {
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
