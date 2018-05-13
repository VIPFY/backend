import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { requiresAuth, requiresAdmin } from "../../helpers/permissions";
import { createPassword } from "../../helpers/functions";
import { sendEmail } from "../../services/mailjet";
import { uploadFile, deleteFile } from "../../services/gcloud";
import { userPicFolder } from "../../constants";
/* eslint-disable no-unused-vars, max-len */

export default {
  createUser: requiresAdmin.createResolver(async (parent, { user, file }, { models }) => {
    const { position, email, ...userData } = user;
    const unitData = { position };
    if (file) {
      const profilepicture = await uploadFile(file, userPicFolder);
      unitData.profilepicture = profilepicture;
    }

    return models.sequelize.transaction(async ta => {
      try {
        const passwordhash = await createPassword(email);
        const unit = await models.Unit.create({ ...unitData }, { transaction: ta });
        const p1 = models.Human.create(
          { unitid: unit.id, ...userData, passwordhash },
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

  updateProfilePic: requiresAuth.createResolver(async (parent, { file }, { models, token }) => {
    try {
      const profilepicture = await uploadFile(file, userPicFolder);
      const { user: { unitid } } = decode(token);
      await models.Unit.update({ profilepicture }, { where: { id: unitid } });

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  adminUpdateUser: requiresAdmin.createResolver(
    async (parent, { unitid, user = {}, file }, { models }) => {
      const { password, position, verified, email, banned } = user;

      try {
        if (file) {
          const profilepicture = await uploadFile(file, userPicFolder);
          await models.Unit.update({ profilepicture }, { where: { id: unitid } });
        } else if (password) {
          const passwordhash = await bcrypt.hash(password, 12);
          await models.Human.update({ passwordhash }, { where: { unitid } });
        } else if (position) {
          await models.Unit.update({ ...user }, { where: { id: unitid } });
        } else if (verified != null) {
          await models.Email.update({ verified }, { where: { email } });
        } else if (banned != null) {
          await models.Unit.update({ banned }, { where: { id: unitid } });
        } else {
          await models.Human.update({ ...user }, { where: { unitid } });
        }

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  deleteUser: requiresAdmin.createResolver(async (parent, { unitid }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const already = await models.Unit.findById(unitid);
        if (already.deleted) throw new Error("User already deleted!");
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
        if (already.profilepicture) {
          await deleteFile(already.profilepicture, userPicFolder);
        }

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    })
  ),

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
