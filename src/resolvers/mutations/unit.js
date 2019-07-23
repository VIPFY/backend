import { decode } from "jsonwebtoken";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import {
  userPicFolder,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH
} from "../../constants";
import { NormalError } from "../../errors";
import {
  createLog,
  companyCheck,
  parentAdminCheck,
  createNotification,
  concatName
} from "../../helpers/functions";
import { uploadUserImage } from "../../services/aws";
import { getNewPasswordData } from "../../helpers/auth";
import { sendEmail } from "../../helpers/email";
/* eslint-disable no-unused-vars, prefer-destructuring */

export default {
  updateProfilePic: requiresAuth.createResolver(
    async (_, { file }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const parsedFile = await file;

          const profilepicture = await uploadUserImage(
            parsedFile,
            userPicFolder
          );

          const user = await models.User.findOne({
            where: { id: unitid },
            raw: true
          });

          const updatedUnit = await models.Unit.update(
            { profilepicture },
            { where: { id: unitid }, returning: true, transaction: ta }
          );

          const notificationBody = {
            receiver: unitid,
            message: "Your profile picture was updated.",
            icon: "user-check",
            link: "profile"
          };

          await createLog(
            ip,
            "updateProfilePic",
            { user, updatedUnit: updatedUnit[1] },
            unitid,
            ta
          );

          return { ...user, profilepicture };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateEmployeePic: requiresRights(["edit-user"]).createResolver(
    async (_, { file, unitid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: adminid }
          } = decode(token);

          const parsedFile = await file;

          const profilepicture = await uploadUserImage(
            parsedFile,
            userPicFolder
          );

          const oldUnit = await models.Unit.findOne({
            where: { id: unitid },
            raw: true
          });

          const updatedUnit = await models.Unit.update(
            { profilepicture },
            { where: { id: unitid }, returning: true, transaction: ta }
          );

          const p1 = createLog(
            ip,
            "updateEmployeePic",
            { oldUnit, updatedUnit: updatedUnit[1] },
            adminid,
            ta
          );

          const p2 = models.User.findOne({ where: { id: unitid }, raw: true });

          const [, user] = await Promise.all([p1, p2]);
          const employee = await parentAdminCheck(user);

          return { ...employee, profilepicture };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateUser: requiresRights(["edit-employees"]).createResolver(
    async (parent, { user }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const { password, statisticdata, ...human } = user;
          let updatedHuman;
          if (password) {
            throw new Error("You can't update the password this way!");
          }

          const oldHuman = await models.Human.findOne({
            where: { unitid },
            raw: true
          });

          if (statisticdata) {
            updatedHuman = await models.Human.update(
              {
                statisticdata: { ...oldHuman.statisticdata, ...statisticdata },
                ...human
              },
              { where: { unitid }, returning: true, transaction: ta }
            );
          } else {
            updatedHuman = await models.Human.update(
              { ...human },
              { where: { unitid }, returning: true, transaction: ta }
            );
          }

          await createLog(
            ip,
            "updateUser",
            { updateArgs: user, oldHuman, updatedHuman: updatedHuman[1] },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateEmployee: requiresRights(["edit-employee"]).createResolver(
    async (_, { user }, { models, token, ip }) => {
      await models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const { id, password, ...userData } = user;

          if (password) {
            throw new Error("You can't update the password this way!");
          }

          await companyCheck(company, unitid, id);

          const toUpdate = {
            Human: {},
            Phone: [],
            Email: [],
            workPhones: []
          };

          Object.keys(userData).forEach(prop => {
            if (prop.includes("phone")) {
              toUpdate.Phone.push({ ...userData[prop] });
            } else if (prop.includes("email")) {
              toUpdate.Email.push({ ...userData[prop] });
            } else if (prop.includes("workPhone")) {
              toUpdate.workPhones.push({ ...userData[prop] });
            } else if (prop == "address") {
              toUpdate.Address = [{ ...userData[prop] }];
            } else {
              toUpdate.Human[prop] = userData[prop];
            }
          });

          const promises = [];

          if (toUpdate.hasOwnProperty("Human")) {
            promises.push(
              models.Human.update(
                { ...toUpdate.Human },
                { where: { unitid: id }, transaction: ta }
              )
            );

            delete toUpdate.Human;
          }

          Object.keys(toUpdate).forEach(itemKey => {
            toUpdate[itemKey].forEach(item => {
              const model = itemKey == "workPhones" ? "Phone" : itemKey;

              if (item.hasOwnProperty("id")) {
                promises.push(
                  models[model].update(
                    { ...item, address: { ...item } },
                    { where: { id: item.id }, transaction: ta }
                  )
                );
              } else {
                item.tags =
                  itemKey == "Phone" || itemKey == "Address"
                    ? ["private"]
                    : ["work"];
                console.log("ITEM KEY", item, itemKey);
                promises.push(
                  models[model].create(
                    { ...item, address: { ...item }, unitid: id },
                    { transaction: ta }
                  )
                );
              }
            });
          });

          await Promise.all(promises);

          await createLog(
            ip,
            "updateEmployee",
            { updateArgs: user },
            unitid,
            ta
          );

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      });

      return models.User.findOne({ where: { id: user.id } });
    }
  ),

  updateEmployeePassword: requiresRights(["edit-employee"]).createResolver(
    async (_, { unitid, password, logOut }, { models, token }) => {
      try {
        const {
          user: { unitid: id, company }
        } = decode(token);

        if (password.length < MIN_PASSWORD_LENGTH) {
          throw new Error("Password not long enough!");
        }

        if (password.length > MAX_PASSWORD_LENGTH) {
          throw new Error("Password too long!");
        }

        const p1 = models.User.findOne({
          where: { id, isadmin: true },
          raw: true
        });

        const p2 = models.User.findOne({ where: { id: unitid }, raw: true });
        const [isAdmin, employee] = await Promise.all([p1, p2]);

        await companyCheck(company, id, unitid);

        if (!isAdmin) {
          throw new Error("You don't have the necessary rights!");
        }

        // An admin should be able to update his own password
        if (employee.isadmin && employee.id != isAdmin.id) {
          throw new Error("You can't change another admins password!");
        }

        const pw = await getNewPasswordData(password);

        if (pw.passwordStrength < 2) {
          throw new Error("Password too weak!");
        }

        await models.Human.update(
          { password: pw.passwordhash },
          { where: { unitid } }
        );

        const employeeName = concatName(employee);
        const adminName = concatName(isAdmin);

        await sendEmail({
          templateId: "d-9beb3ea901d64894a8227c295aa8548e",
          personalizations: [
            {
              to: [{ email: employee.emails[0] }],
              dynamic_template_data: { employeeName, adminName, password }
            }
          ],
          fromName: "VIPFY GmbH"
        });

        if (logOut) {
          // TODO: [VIP-409] Invalidate the Token when Sessions are implemented
        }

        return {
          id: unitid,
          passwordlength: pw.passwordlength,
          passwordstrength: pw.passwordstrength
        };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  setConsent: requiresAuth.createResolver(
    async (parent, { consent }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid }
        } = decode(token);

        try {
          await models.Human.update(
            { consent },
            { where: { unitid }, transaction: ta }
          );

          const p1 = createLog(ip, "setConsent", { consent }, unitid, ta);
          const p2 = models.User.findOne({
            where: { id: unitid },
            transaction: ta,
            raw: true
          });

          const [, user] = await Promise.all([p1, p2]);

          return { ...user, consent };
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Saving consent failed",
              icon: "bug",
              link: "profile"
            },
            ta
          );

          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  )
};
