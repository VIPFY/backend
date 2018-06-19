import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { requiresAuth, requiresRight } from "../../helpers/permissions";
// import { sendRegistrationEmail } from "../../services/mailjet";
import { uploadFile } from "../../services/gcloud";
import { userPicFolder } from "../../constants";
import { createTokens } from "../../helpers/auth";
/* eslint-disable no-unused-vars, max-len */

export default {
  updateProfilePic: requiresAuth.createResolver(async (parent, { file }, { models, token }) => {
    try {
      const profilepicture = await uploadFile(file, userPicFolder);
      const {
        user: { unitid }
      } = decode(token);
      await models.Unit.update({ profilepicture }, { where: { id: unitid } });

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  updateUser: requiresAuth.createResolver(async (parent, { user }, { models, token }) => {
    try {
      const { position, password, ...human } = user;
      const {
        user: { unitid }
      } = decode(token);

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

  createCompany: requiresAuth.createResolver(
    async (parent, { name }, { models, token, SECRET, SECRET_TWO }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company: companyExists }
          } = decode(token);

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

  updateStatisticData: requiresRight("A").createResolver(
    async (parent, { data }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        await models.DepartmentData.update(
          { statisticdata: { ...data } },
          { where: { unitid: company } }
        );

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  addEmployee: requiresRight("A").createResolver(async (parent, { email }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { company }
        } = decode(token);
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
