import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { userPicFolder } from "../../constants";
import { requiresAuth, requiresRight } from "../../helpers/permissions";
import { deleteFile } from "../../services/gcloud";
import { createTokens } from "../../helpers/auth";
import { NormalError } from "../../errors";
// import { sendRegistrationEmail } from "../../services/mailjet";

export default {
  createCompany: requiresAuth.createResolver(
    async (parent, { name }, { models, token, SECRET, SECRET_TWO }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company: companyExists }
          } = decode(token);

          if (companyExists) {
            throw new NormalError({ message: "This user is already assigned to a company!" });
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
          throw new NormalError({ message: err.message });
        }
      })
  ),

  updateStatisticData: requiresRight(["admin"]).createResolver(
    async (parent, { data }, { models, token }) => {
      try {
        const {
          user: { company: unitid }
        } = decode(token);

        const currentData = await models.DepartmentData.findOne({
          where: { unitid },
          include: ["statisticdata"],
          raw: true
        });

        await models.DepartmentData.update(
          { statisticdata: { ...currentData, ...data } },
          { where: { unitid } }
        );

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  addEmployee: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { unitid, departmentid }, { models }) => {
      try {
        await models.ParentUnit.create({ parentunit: departmentid, childunit: unitid });

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  addCreateEmployee: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { email, departmentid }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          const isEmail = email.indexOf("@");

          if (isEmail < 0) {
            throw new Error("Please enter a valid Email!");
          }

          const firstname = email.slice(0, email.indexOf("@"));
          const emailInUse = await models.Email.findOne({ where: { email } });
          if (emailInUse) throw new Error("Email already in use!");

          const passwordhash = await bcrypt.hash("test", 12);

          const unit = await models.Unit.create({}, { transaction: ta });
          const p1 = models.Human.create(
            { firstname, unitid: unit.id, passwordhash },
            { transaction: ta }
          );
          const p2 = models.Email.create(
            { email, unitid: unit.id, verified: true },
            { transaction: ta }
          );
          const p3 = models.ParentUnit.create(
            { parentunit: departmentid, childunit: unit.id },
            { transaction: ta }
          );
          await Promise.all([p1, p2, p3]);

          // sendRegistrationEmail(email, passwordhash);

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  addSubDepartment: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { departmentid, name }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          const unit = await models.Unit.create({}, { transaction: ta, raw: true });

          const p1 = models.DepartmentData.create(
            { unitid: unit.id, name },
            { transaction: ta, raw: true }
          );
          const p2 = models.ParentUnit.create(
            { parentunit: departmentid, childunit: unit.id },
            { transaction: ta, raw: true }
          );

          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  editDepartmentName: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { departmentid, name }, { models }) => {
      try {
        await models.DepartmentData.update(
          { name },
          { where: { unitid: departmentid }, raw: true }
        );

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  deleteSubDepartment: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { departmentid }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          const options = { transaction: ta, raw: true };
          const updateOptions = { where: { id: departmentid }, ...options };
          const destroyData = {
            where: { unitid: departmentid },
            options
          };

          const p1 = models.Unit.update({ deleted: true }, updateOptions);
          const p2 = models.DepartmentData.update({ name: "Deleted Department" }, updateOptions);
          const p3 = models.Email.destroy(destroyData);
          const p4 = models.Address.destroy(destroyData);
          const p5 = models.Phone.destroy(destroyData);
          const p6 = models.ParentUnit.destroy(
            {
              where: {
                [models.Op.or]: [{ childunit: departmentid }, { parentunit: departmentid }]
              }
            },
            options
          );

          await Promise.all([p1, p2, p3, p4, p5, p6]);

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  removeEmployee: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { unitid, departmentid }, { models }) => {
      try {
        await models.ParentUnit.destroy({
          where: { parentunit: departmentid, childunit: unitid }
        });

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  fireEmployee: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { unitid }, { models }) =>
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

          const p5 = models.ParentUnit.destroy(
            { where: { childunit: unitid } },
            { transaction: ta }
          );

          await Promise.all([p1, p2, p3, p4, p5]);

          if (already.profilepicture) {
            await deleteFile(already.profilepicture, userPicFolder);
          }

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  )
};
