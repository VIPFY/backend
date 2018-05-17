import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { requiresAuth, requiresAdmin } from "../../helpers/permissions";
import { createPassword, parentAdminCheck } from "../../helpers/functions";
import { sendRegistrationEmail } from "../../services/mailjet";
import { uploadFile, deleteFile } from "../../services/gcloud";
import { userPicFolder } from "../../constants";
import { createTokens } from "../../helpers/auth";
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
        // sendRegistrationEmail(email, passwordhash);

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

  updateUser: requiresAuth.createResolver(async (parent, { user }, { models, token }) => {
    try {
      const { position, password, ...human } = user;
      const { user: { unitid } } = decode(token);

      if (password) {
        throw new Error("You can't update the password this way!");
      }

      if (position) {
        await models.Unit.update({ position }, { where: { id: unitid } });
      }

      await models.Human.update({ ...human }, { where: { unitid } });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
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
  }),

  createCompany: requiresAuth.createResolver(
    async (parent, { name }, { models, token, SECRET, SECRETTWO }) =>
      models.sequelize.transaction(async ta => {
        try {
          const { user: { unitid } } = decode(token);
          const company = await models.Unit.create({}, { transaction: ta });

          const p1 = models.Right.create(
            { holder: unitid, forunit: company.id, type: "admin" },
            { transaction: ta }
          );

          const p2 = models.DepartmentData.create(
            { unitid: company.id, name },
            { transaction: ta }
          );

          const p3 = models.ParentUnit.create(
            { parentunit: company.id, childunit: unitid },
            { transaction: ta }
          );

          await Promise.all([p1, p2, p3]);
          const p4 = models.User.findById(unitid, { transaction: ta });
          const p5 = models.Login.findOne({ where: { unitid } }, { transaction: ta });

          const [basicUser, user] = await Promise.all([p4, p5]);
          const refreshTokenSecret = user.passwordhash + SECRETTWO;
          const getCompany = await parentAdminCheck(models, basicUser);
          user.company = getCompany.company;

          const [newToken, refreshToken] = await createTokens(user, SECRET, refreshTokenSecret);

          return { ok: true, token: newToken, refreshToken };
        } catch (err) {
          throw new Error(err.message);
        }
      })
  ),

  updateStatisticData: requiresAuth.createResolver(async (parent, { data }, { models, token }) => {
    try {
      const { user: { unitid, company } } = decode(token);
      const isAdmin = await models.Right.findOne({
        where: { holder: unitid, forunit: company, type: "admin" }
      });

      if (!isAdmin) {
        throw new Error("User has not the right to add this companies data!");
      }

      await models.DepartmentData.update({ ...data }, { where: { unitid: company } });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  addEmployee: requiresAuth.createResolver(async (parent, { email }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const { user: { unitid, company } } = decode(token);
        const p1 = models.Right.findOne({ where: { holder: unitid } });
        const p2 = models.Email.findOne({ where: { email } });
        const [isAdmin, emailInUse] = Promise.all([p1, p2]);

        if (!isAdmin) throw new Error("User has not the right to add an employee!");
        if (emailInUse) throw new Error("Email already in use!");

        const passwordhash = await bcrypt.hash("test", 12);

        const unit = await models.Unit.create({}, { transaction: ta });
        const p3 = models.Human.create({ unitid: unit.id, passwordhash }, { transaction: ta });
        const p4 = models.Email.create({ email, unitid: unit.id }, { transaction: ta });
        const [user, emailAddress] = await Promise.all([p3, p4]);

        // sendRegistrationEmail(email, passwordhash);

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    })
  )
};
