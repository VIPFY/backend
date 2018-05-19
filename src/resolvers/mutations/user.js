import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { requiresAuth, requiresAdmin, requiresVipfyAdmin } from "../../helpers/permissions";
import { createPassword } from "../../helpers/functions";
import { sendRegistrationEmail } from "../../services/mailjet";
import { uploadFile, deleteFile } from "../../services/gcloud";
import { userPicFolder } from "../../constants";
import { createTokens } from "../../helpers/auth";
/* eslint-disable no-unused-vars, max-len */

export default {
  createUser: requiresVipfyAdmin.createResolver(async (parent, { user, file }, { models }) => {
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

  adminUpdateUser: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, user = {}, file }, { models }) => {
      const { password, position, verified, email, oldemail, banned } = user;

      try {
        if (file) {
          const profilepicture = await uploadFile(file, userPicFolder);
          await models.Unit.update({ profilepicture }, { where: { id: unitid } });
        } else if (password) {
          const passwordhash = await bcrypt.hash(password, 12);
          await models.Human.update({ passwordhash }, { where: { unitid } });
        } else if (position) {
          await models.Unit.update({ ...user }, { where: { id: unitid } });
        } else if (verified != null && email) {
          await models.Email.update({ verified }, { where: { email } });
        } else if (oldemail && email) {
          const emailExists = await models.Email.findOne({ where: { email } });

          if (emailExists) {
            throw new Error("This email is already in our database!");
          }

          await models.Email.update({ email, verified: false }, { where: { email: oldemail } });
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

  deleteUser: requiresVipfyAdmin.createResolver(async (parent, { unitid }, { models, token }) =>
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

  freezeAccount: requiresVipfyAdmin.createResolver(async (parent, { unitid }, { models }) => {
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
    async (parent, { name }, { models, token, SECRET, SECRET_TWO }) =>
      models.sequelize.transaction(async ta => {
        try {
          const { user: { unitid, company: companyExists } } = decode(token);

          if (companyExists) {
            throw new Error("This user is already assigned to a company!");
          }

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

          const user = await models.Login.findOne({ where: { unitid } }, { transaction: ta });
          user.company = company.id;
          const refreshTokenSecret = user.passwordhash + SECRET_TWO;
          const [newToken, refreshToken] = await createTokens(user, SECRET, refreshTokenSecret);

          return { ok: true, token: newToken, refreshToken };
        } catch (err) {
          throw new Error(err.message);
        }
      })
  ),

  updateStatisticData: requiresAdmin.createResolver(async (parent, { data }, { models, token }) => {
    try {
      const { user: { company } } = decode(token);

      await models.DepartmentData.update(
        { statisticdata: { ...data } },
        { where: { unitid: company } }
      );

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  addEmployee: requiresAdmin.createResolver(async (parent, { email }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const { user: { company } } = decode(token);
        const emailInUse = await models.Email.findOne({ where: { email } });
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
