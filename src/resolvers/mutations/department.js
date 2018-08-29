import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { userPicFolder } from "../../constants";
import { requiresAuth, requiresRight } from "../../helpers/permissions";
import { deleteFile } from "../../services/gcloud";
import { createTokens } from "../../helpers/auth";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";

// import { sendRegistrationEmail } from "../../services/mailjet";

export default {
  createCompany: requiresAuth.createResolver(
    async (parent, { name }, { models, token, SECRET, SECRET_TWO, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company: companyExists }
          } = decode(token);

          if (companyExists) {
            throw new Error("This user is already assigned to a company!");
          }

          let company = await models.Unit.create({}, { transaction: ta });
          company = company.get();

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

          let [rights, department, parentUnit] = await Promise.all([p1, p2, p3]);
          rights = rights();
          department = department();
          parentUnit = parentUnit();

          const p4 = createLog(
            ip,
            "createCompany",
            {
              company,
              rights,
              department,
              parentUnit
            },
            unitid,
            ta
          );

          const p5 = await models.Login.findOne({ where: { unitid } }, { transaction: ta });

          const [user] = await Promise.all([p5, p4]);

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
    (parent, { data }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: id, company: unitid }
          } = decode(token);

          const currentData = await models.DepartmentData.findOne({
            where: { unitid },
            attributes: ["statisticdata"],
            raw: true,
            transaction: ta
          });

          const newData = await models.DepartmentData.update(
            { statisticdata: { ...currentData.statisticdata, ...data } },
            { where: { unitid }, transaction: ta, returning: true }
          );

          await createLog(ip, "updateStatisticData", { currentData, newData: newData[1] }, id, ta);

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  addEmployee: requiresRight(["admin", "manageemployees"]).createResolver(
    (parent, { unitid, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: adder }
          } = decode(token);

          let parentUnit = await models.ParentUnit.create(
            { parentunit: departmentid, childunit: unitid },
            { transaction: ta }
          );

          parentUnit = parentUnit();

          await createLog(ip, "addEmployee", { unitid, departmentid, parentUnit }, adder, ta);

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  addCreateEmployee: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { email, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const isEmail = email.indexOf("@");

          if (isEmail < 0) {
            throw new Error("Please enter a valid Email!");
          }

          const firstname = email.slice(0, email.indexOf("@"));
          const emailInUse = await models.Email.findOne({ where: { email } });
          if (emailInUse) throw new Error("Email already in use!");

          const passwordhash = await bcrypt.hash("test", 12);

          let unit = await models.Unit.create({}, { transaction: ta });
          unit = unit();

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

          let [human, newEmail, parentUnit] = await Promise.all([p1, p2, p3]);
          human = human();
          newEmail = newEmail();
          parentUnit = parentUnit();

          await createLog(
            ip,
            "addCreateEmployee",
            { unit, human, newEmail, parentUnit },
            unitid,
            ta
          );

          // sendRegistrationEmail(email, passwordhash);

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  addSubDepartment: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { departmentid, name }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          let unit = await models.Unit.create({}, { transaction: ta });
          unit = unit();

          const p1 = models.DepartmentData.create({ unitid: unit.id, name }, { transaction: ta });

          const p2 = models.ParentUnit.create(
            { parentunit: departmentid, childunit: unit.id },
            { transaction: ta }
          );

          let [department, parentUnit] = await Promise.all([p1, p2]);
          department = department();
          parentUnit = parentUnit();

          await createLog(ip, "addSubDepartment", { unit, department, parentUnit }, unitid, ta);

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  editDepartmentName: requiresRight(["admin", "manageemployees"]).createResolver(
    (parent, { departmentid, name }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const updatedDepartment = await models.DepartmentData.update(
            { name },
            { where: { unitid: departmentid }, returning: true, transaction: ta }
          );

          await createLog(
            ip,
            "editDepartmentName",
            { updatedDepartment: updatedDepartment[1] },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  deleteSubDepartment: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const options = { transaction: ta, raw: true };
          const updateOptions = { where: { id: departmentid }, returning: true, ...options };
          const destroyData = {
            where: { unitid: departmentid },
            options
          };

          const p1 = models.Unit.findOne(updateOptions);
          const p2 = models.DepartmentData.findOne(updateOptions);
          const p3 = models.Email.findOne(destroyData);
          const p4 = models.Address.findOne(destroyData);
          const p5 = models.Phone.findOne(destroyData);
          const p6 = models.ParentUnit.findOne(
            {
              where: {
                [models.Op.or]: [{ childunit: departmentid }, { parentunit: departmentid }]
              }
            },
            options
          );

          const p7 = models.Unit.update({ deleted: true }, updateOptions);
          const p8 = models.DepartmentData.update({ name: "Deleted Department" }, updateOptions);
          const p9 = models.Email.destroy(destroyData);
          const p10 = models.Address.destroy(destroyData);
          const p11 = models.Phone.destroy(destroyData);
          const p12 = models.ParentUnit.destroy(
            {
              where: {
                [models.Op.or]: [{ childunit: departmentid }, { parentunit: departmentid }]
              }
            },
            options
          );

          const [
            oldUnit,
            oldDepartment,
            oldEmail,
            oldAddress,
            oldPhone,
            oldParentUnit
          ] = await Promise.all([p1, p2, p3, p4, p5, p6]);
          await Promise.all([p7, p8, p9, p10, p11, p12]);

          await createLog(
            ip,
            "deleteSubDepartment",
            {
              oldUnit,
              oldDepartment,
              oldEmail,
              oldAddress,
              oldPhone,
              oldParentUnit
            },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  removeEmployee: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { unitid, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: id }
          } = decode(token);

          const oldParentUnit = await models.ParentUnit.findOne({
            where: { parentunit: departmentid, childunit: unitid }
          });

          await models.ParentUnit.destroy({
            where: { parentunit: departmentid, childunit: unitid, transaction: ta }
          });

          await createLog(
            ip,
            "removeEmployee",
            {
              oldParentUnit
            },
            id,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  fireEmployee: requiresRight(["admin", "manageemployees"]).createResolver(
    async (parent, { unitid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: id }
          } = decode(token);

          const p1 = await models.Unit.findById(unitid);
          const p2 = models.Human.findOne({ where: { unitid }, transaction: ta, raw: true });
          const p3 = models.Email.findOne({ where: { unitid }, raw: true, transaction: ta });
          const p4 = models.Address.findOne({ where: { unitid }, raw: true, transaction: ta });
          const p5 = models.ParentUnit.destroy({
            where: { childunit: unitid },
            raw: true,
            transaction: ta
          });

          const [oldUnit, oldHuman, oldEmail, oldAddress, oldParentUnit] = await Promise.all([
            p1,
            p2,
            p3,
            p4,
            p5
          ]);

          if (oldUnit.deleted) throw new Error("User already deleted!");

          const p6 = models.Unit.update(
            { deleted: true, profilepicture: "" },
            { where: { id: unitid } },
            { transaction: ta, returning: true }
          );

          const p7 = models.Human.update(
            { firstname: "Deleted", middlename: "", lastname: "User" },
            { where: { unitid } },
            { transaction: ta, returning: true }
          );

          const p8 = models.Email.destroy({ where: { unitid } }, { transaction: ta });

          const p9 = models.Address.update(
            { address: { city: "deleted" }, description: "deleted" },
            { where: { unitid } },
            { transaction: ta, returning: true }
          );

          const p10 = models.ParentUnit.destroy(
            { where: { childunit: unitid } },
            { transaction: ta }
          );

          await Promise.all([p6, p7, p8, p9, p10]);

          if (oldUnit.profilepicture) {
            await deleteFile(oldUnit.profilepicture, userPicFolder);
          }

          await createLog(
            ip,
            "fireEmployee",
            {
              oldUnit,
              oldHuman,
              oldEmail,
              oldAddress,
              oldParentUnit
            },
            id,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  )
};
