import { decode } from "jsonwebtoken";
import { parseName } from "humanparser";
import {
  userPicFolder,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH
} from "../../constants";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { getNewPasswordData } from "../../helpers/auth";
import { NormalError } from "../../errors";
import {
  createLog,
  createNotification,
  formatHumanName,
  selectCredit,
  checkPlanValidity
} from "../../helpers/functions";
import { resetCompanyMembershipCache } from "../../helpers/companyMembership";
import { sendEmail } from "../../helpers/email";
import { uploadUserImage, deleteUserImage } from "../../services/aws";

export default {
  /**
   * Updates the statistics of a company like industry and sets the vatid.
   *
   * @param {object} data contains various data
   *
   * @returns {object}
   */
  updateStatisticData: requiresRights(["edit-departments"]).createResolver(
    (parent, { data }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: id, company: unitid }
          } = decode(token);

          const currentData = await models.Department.findOne({
            where: { unitid },
            attributes: ["statisticdata", "payingoptions"],
            raw: true,
            transaction: ta
          });

          const newData = await models.DepartmentData.update(
            {
              statisticdata: { ...currentData.statisticdata, ...data }
            },
            { where: { unitid }, transaction: ta, returning: true }
          );

          await createLog(
            ip,
            "updateStatisticData",
            { currentData, newData: newData[1] },
            id,
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

  addEmployee: requiresRights(["create-employees"]).createResolver(
    (parent, { unitid, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: adder, company }
          } = decode(token);

          let parentUnit = await models.ParentUnit.create(
            { parentunit: departmentid, childunit: unitid },
            { transaction: ta }
          );

          parentUnit = parentUnit.get();

          await createLog(
            ip,
            "addEmployee",
            { unitid, departmentid, parentUnit },
            adder,
            ta
          );

          // just in case. This mutation shouldn't change actual company membership
          resetCompanyMembershipCache(departmentid, unitid);
          resetCompanyMembershipCache(company, unitid);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  addCreateEmployee: requiresRights(["create-employees"]).createResolver(
    async (_, { email, password, name, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const isEmail = email.indexOf("@");

          if (isEmail < 0) {
            throw new Error("Please enter a valid Email!");
          }

          const emailInUse = await models.Email.findOne({ where: { email } });
          if (emailInUse) throw new Error("Email already in use!");
          if (password.length > MAX_PASSWORD_LENGTH) {
            throw new Error("Password too long");
          }

          if (password.length < MIN_PASSWORD_LENGTH) {
            throw new Error(
              `Password must be at least ${MIN_PASSWORD_LENGTH} characters long!`
            );
          }

          const pwData = await getNewPasswordData(password);

          let unit = await models.Unit.create({}, { transaction: ta });
          unit = unit.get();

          const p1 = models.Human.create(
            {
              firstname: name.firstname,
              middlename: name.middlename,
              lastname: name.lastname,
              title: name.title,
              suffix: name.suffix,
              unitid: unit.id,
              needspasswordchange: true,
              firstlogin: true,
              ...pwData
            },
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

          const p4 = models.Human.findOne({ where: { unitid } });

          const p5 = models.DepartmentData.findOne({
            where: { unitid: company }
          });

          const p6 = models.Right.create(
            {
              holder: unit.id,
              forunit: company,
              type: "view-apps"
            },
            { transaction: ta }
          );

          const [
            human,
            newEmail,
            parentUnit,
            requester,
            companyObj,
            rights
          ] = await Promise.all([p1, p2, p3, p4, p5, p6]);
          const humanData = human.get();
          const newEmailData = newEmail.get();
          const parentUnitData = parentUnit.get();

          await createLog(
            ip,
            "addCreateEmployee",
            { unit, humanData, newEmailData, parentUnitData, rights },
            unitid,
            ta
          );

          // brand new person, but better to be too careful
          resetCompanyMembershipCache(departmentid, unit.id);
          resetCompanyMembershipCache(company, unit.id);

          await sendEmail({
            templateId: "d-e049cce50d20428d81f011e521605d4c",
            fromName: "VIPFY",
            personalizations: [
              {
                to: [{ email, name: formatHumanName(name) }],
                dynamic_template_data: {
                  name: formatHumanName(name),
                  creator: formatHumanName(requester),
                  companyname: companyObj.name,
                  email,
                  password
                }
              }
            ]
          });

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  createEmployee09: requiresRights(["create-employees"]).createResolver(
    async (
      _,
      {
        name,
        emails,
        password,
        needpasswordchange,
        file,
        birthday,
        hiredate,
        address,
        position,
        phones
      },
      { models, token, ip }
    ) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          let noemail = true;
          for await (const email of emails) {
            if (email.email != "") {
              noemail = false;
              const isEmail = email.email.indexOf("@");

              if (isEmail < 0) {
                throw new Error("Please enter a valid Email!");
              }

              const emailInUse = await models.Email.findOne({
                where: { email: email.email }
              });
              if (emailInUse) throw new Error("Email already in use!");
            }
          }
          if (noemail) {
            throw new Error("You need at least one Email!");
          }

          if (password.length > MAX_PASSWORD_LENGTH) {
            throw new Error("Password too long");
          }

          if (password.length < MIN_PASSWORD_LENGTH) {
            throw new Error(
              `Password must be at least ${MIN_PASSWORD_LENGTH} characters long!`
            );
          }

          const data = {};

          if (file) {
            const parsedFile = await file;
            const profilepicture = await uploadUserImage(
              parsedFile,
              userPicFolder
            );
            data.profilepicture = profilepicture;
          }

          const pwData = await getNewPasswordData(password);

          let unit = await models.Unit.create(data, { transaction: ta });
          unit = unit.get();

          const humanpromises = [];

          humanpromises.push(
            models.Human.create(
              {
                firstname: name.firstname,
                middlename: name.middlename,
                lastname: name.lastname,
                title: name.title,
                suffix: name.suffix,
                unitid: unit.id,
                needspasswordchange:
                  needpasswordchange === false ? false : true,
                firstlogin: true,
                ...pwData,
                position,
                hiredate: hiredate != "" ? hiredate : null,
                birthday: birthday != "" ? birthday : null
              },
              { transaction: ta }
            )
          );

          //Create Emails
          emails.forEach(
            (email, index) =>
              email &&
              email.email &&
              email.email != "" &&
              humanpromises.push(
                models.Email.create(
                  {
                    email: email.email,
                    unitid: unit.id,
                    verified: true,
                    priority: index
                  },
                  { transaction: ta }
                )
              )
          );

          //Create Adress

          if (address) {
            const { zip, street, city, ...normalData } = address;
            const addressData = { street, zip, city };
            humanpromises.push(
              models.Address.create(
                { ...normalData, address: addressData, unitid: unit.id },
                { transaction: ta }
              )
            );
          }

          // Create Phones
          if (phones) {
            phones.forEach(
              phoneData =>
                phoneData &&
                phoneData.number &&
                phoneData.number != "" &&
                humanpromises.push(
                  models.Phone.create(
                    { ...phoneData, unitid: unit.id },
                    { transaction: ta }
                  )
                )
            );
          }

          humanpromises.push(
            models.ParentUnit.create(
              { parentunit: company, childunit: unit.id },
              { transaction: ta }
            )
          );

          humanpromises.push(
            models.Right.create(
              {
                holder: unit.id,
                forunit: company,
                type: "view-apps"
              },
              { transaction: ta }
            )
          );

          await Promise.all(humanpromises);

          const p4 = models.Human.findOne({ where: { unitid } });

          const p5 = models.DepartmentData.findOne({
            where: { unitid: company }
          });

          const [requester, companyObj] = await Promise.all([p4, p5]);

          await createLog(ip, "addCreateEmployee", { unit }, unitid, ta);

          // brand new person, but better to be too careful
          resetCompanyMembershipCache(company, unit.id);

          await sendEmail({
            templateId: "d-e049cce50d20428d81f011e521605d4c",
            fromName: "VIPFY",
            personalizations: [
              {
                to: [{ email: emails[0].email, name: formatHumanName(name) }],
                dynamic_template_data: {
                  name: formatHumanName(name),
                  creator: formatHumanName(requester),
                  companyname: companyObj.name,
                  email: emails[0].email,
                  password
                }
              }
            ]
          });

          return unit.id;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  addSubDepartment: requiresRights(["create-department"]).createResolver(
    async (parent, { departmentid, name }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          let unit = await models.Unit.create({}, { transaction: ta });
          unit = unit();

          const p1 = models.DepartmentData.create(
            { unitid: unit.id, name },
            { transaction: ta }
          );

          const p2 = models.ParentUnit.create(
            { parentunit: departmentid, childunit: unit.id },
            { transaction: ta }
          );

          let [department, parentUnit] = await Promise.all([p1, p2]);
          department = department.get();
          parentUnit = parentUnit.get();

          await createLog(
            ip,
            "addSubDepartment",
            { unit, department, parentUnit },
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

  editDepartmentName: requiresRights(["edit-department"]).createResolver(
    (parent, { departmentid, name }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const updatedDepartment = await models.DepartmentData.update(
            { name },
            {
              where: { unitid: departmentid },
              returning: true,
              transaction: ta
            }
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
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  deleteSubDepartment: requiresRights(["delete-department"]).createResolver(
    async (parent, { departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const options = { transaction: ta, raw: true };
          const updateOptions = {
            where: { id: departmentid },
            returning: true,
            ...options
          };
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
                [models.Op.or]: [
                  { childunit: departmentid },
                  { parentunit: departmentid }
                ]
              }
            },
            options
          );

          const p7 = models.Unit.update({ deleted: true }, updateOptions);
          const p8 = models.DepartmentData.update(
            { name: "Deleted Department" },
            updateOptions
          );
          const p9 = models.Email.destroy(destroyData);
          const p10 = models.Address.destroy(destroyData);
          const p11 = models.Phone.destroy(destroyData);
          const p12 = models.ParentUnit.destroy(
            {
              where: {
                [models.Op.or]: [
                  { childunit: departmentid },
                  { parentunit: departmentid }
                ]
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
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  removeEmployee: requiresRights(["delete-employees"]).createResolver(
    async (parent, { unitid, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: id, company }
          } = decode(token);

          const oldParentUnit = await models.ParentUnit.findOne({
            where: { parentunit: departmentid, childunit: unitid }
          });

          await models.ParentUnit.destroy({
            where: { parentunit: departmentid, childunit: unitid },
            transaction: ta
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

          resetCompanyMembershipCache(departmentid, unitid);
          resetCompanyMembershipCache(company, unitid);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  fireEmployee: requiresRights(["delete-employees"]).createResolver(
    async (parent, { unitid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: id, company }
          } = decode(token);

          const p1 = await models.Unit.findById(unitid);
          const p2 = models.Human.findOne({
            where: { unitid },
            transaction: ta,
            raw: true
          });

          const p3 = models.Email.findOne({
            where: { unitid },
            raw: true,
            transaction: ta
          });

          const p4 = models.Address.findOne({
            where: { unitid },
            raw: true,
            transaction: ta
          });

          const p5 = models.ParentUnit.destroy({
            where: { childunit: unitid },
            raw: true,
            transaction: ta
          });

          const [
            oldUnit,
            oldHuman,
            oldEmail,
            oldAddress,
            oldParentUnit
          ] = await Promise.all([p1, p2, p3, p4, p5]);

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

          const p8 = models.Email.destroy(
            { where: { unitid } },
            { transaction: ta }
          );

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
            await deleteUserImage(oldUnit.profilepicture, userPicFolder);
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

          resetCompanyMembershipCache(company, unitid);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  banEmployee: requiresRights(["edit-employees"]).createResolver(
    async (_, { userid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);
        try {
          const p1 = await models.DepartmentEmployee.findOne({
            where: { id: company, employee: userid },
            raw: true
          });

          const p2 = models.User.findOne(
            { where: { id: unitid } },
            { raw: true }
          );

          const p3 = models.Human.findOne({
            where: { unitid: userid },
            raw: true
          });

          const [inCompany, admin, user] = await Promise.all([p1, p2, p3]);

          if (!inCompany) {
            throw new Error("This user doesn't belong to this company!");
          }

          const bannedUser = await models.Human.update(
            { companyban: true },
            { where: { unitid: userid }, returning: true, transaction: ta }
          );

          const p4 = createNotification({
            receiver: unitid,
            message: `You banned ${user.firstname} ${
              user.lastname
            } from the company`,
            icon: "user-slash",
            link: "team",
            changed: ["human"]
          });

          const p5 = createLog(
            ip,
            "banEmployee",
            { bannedUser, admin },
            unitid,
            ta
          );

          await Promise.all([p4, p5]);

          return { ok: true };
        } catch (err) {
          await createNotification({
            receiver: unitid,
            message: `You couldn't ban the user. Please retry`,
            icon: "bug",
            link: "team",
            changed: [""]
          });

          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  unbanEmployee: requiresRights(["edit-employees"]).createResolver(
    async (parent, { userid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);
        try {
          const p1 = await models.DepartmentEmployee.findOne({
            where: { id: company, employee: userid },
            raw: true
          });

          const p2 = models.User.findOne(
            { where: { id: unitid } },
            { raw: true }
          );

          const p3 = models.Human.findOne({
            where: { unitid: userid },
            raw: true
          });

          const [inCompany, admin, user] = await Promise.all([p1, p2, p3]);

          if (!inCompany) {
            throw new Error("This user doesn't belong to this company!");
          }

          const unbannedUser = await models.Human.update(
            { companyban: false },
            { where: { unitid: userid }, returning: true, transaction: ta }
          );

          const p4 = createNotification({
            receiver: unitid,
            message: `You unbanned ${user.firstname} ${
              user.lastname
            } from the company`,
            icon: "user-check",
            link: "team",
            changed: ["human"]
          });

          const p5 = createLog(
            ip,
            "banEmployee",
            { unbannedUser, admin },
            unitid,
            ta
          );

          await Promise.all([p4, p5]);

          return { ok: true };
        } catch (err) {
          await createNotification({
            receiver: unitid,
            message: `You couldn't unban the user. Please retry`,
            icon: "bug",
            link: "team",
            changed: [""]
          });

          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateCompanyPic: requiresRights(["edit-departments"]).createResolver(
    async (parent, { file }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const parsedFile = await file;
          const profilepicture = await uploadUserImage(
            parsedFile,
            userPicFolder
          );
          const {
            user: { company: id }
          } = decode(token);

          const oldUnit = await models.Unit.findOne({
            where: { id },
            raw: true
          });

          const updatedUnit = await models.Unit.update(
            { profilepicture },
            { where: { id }, returning: true, transaction: ta }
          );

          await createLog(
            ip,
            "updateCompanyPic",
            { oldUnit, updatedUnit: updatedUnit[1] },
            id,
            ta
          );

          return profilepicture;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  /**
   * Save the data collected by the Google Places API to our database
   *
   * @param {object} data Contains address, phone, website, company and icon
   */
  saveProposalData: async (_, { data }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { company }
        } = decode(token);

        const promises = [];

        if (data.website) {
          const p2 = models.Website.create(
            {
              website: data.website,
              verified: true,
              autogenerated: false,
              unitid: company
            },
            { transaction: ta }
          );

          promises.push(p2);
        }

        if (data.international_phone_number) {
          const p3 = models.Phone.create(
            {
              unitid: company,
              number: data.international_phone_number,
              verified: true,
              tags: ["main"],
              autogenerated: false
            },
            { transaction: ta }
          );

          promises.push(p3);
        }

        await Promise.all(promises);

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }),

  changeAdminStatus: requiresRights(["edit-rights"]).createResolver(
    async (_, { unitid, admin }, { models, token, ip }) =>
      models.sequelize.transaction(async transaction => {
        try {
          const {
            user: { unitid: requester, company }
          } = decode(token);

          const data = {
            holder: unitid,
            forunit: company,
            type: "admin"
          };

          if (admin) {
            const p1 = await models.Right.create(data, { transaction });
            const p2 = await createLog(
              ip,
              "adminAdd",
              {},
              requester,
              transaction
            );

            await Promise.all([p1, p2]);
          } else {
            const allAdmins = await models.sequelize.query(
              `
              SELECT DISTINCT ON (dev.employee) uv.*
              FROM users_view uv
                LEFT OUTER JOIN department_employee_view dev ON dev.employee = uv.id
              WHERE dev.id = :company AND uv.isadmin = true;
              `,
              {
                replacements: { company },
                type: models.sequelize.QueryTypes.SELECT
              }
            );

            if (allAdmins.length < 2) {
              throw new Error("You can't take the last admins privileges");
            }

            const p1 = models.Right.destroy({ where: data, transaction });
            const p2 = createLog(ip, "adminRemove", {}, requester, transaction);

            await Promise.all([p1, p2]);
          }

          await createNotification(
            {
              receiver: unitid,
              message: admin
                ? "You received admin privileges"
                : "Your admin privileges were revoked",
              icon: admin ? "user-tie" : "user-minus",
              link: "profile",
              changed: ["me"]
            },
            transaction
          );

          return { id: unitid, status: admin };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  /**
   * Adds a promocode to the customers account.
   * As this is on
   */
  addPromocode: requiresAuth.createResolver(
    async (_, { promocode }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const valid = await models.PromocodePlan.findOne({
            where: { code: promocode },
            raw: true,
            transaction: ta
          });

          if (!valid) {
            throw new Error(`The code ${promocode} is not valid`);
          }

          const p1 = models.sequelize.query(
            `SELECT bd.*, pd.name
            FROM boughtplan_data bd
                     LEFT JOIN plan_data pd on bd.planid = pd.id
                     LEFT JOIN app_data ad on pd.appid = ad.id
            WHERE appid = 66
              AND buytime < now()
              AND (endtime > now() OR endtime isnull)
              AND bd.payer = :company;
          `,
            {
              replacements: { company },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta
            }
          );

          const p2 = models.Plan.findOne({
            where: { id: valid.planid, appid: 66 },
            raw: true,
            transaction: ta
          });

          const p3 = models.DepartmentData.update(
            { promocode },
            { where: { unitid: company }, returning: true, transaction: ta }
          );

          const [currentPlan, promoPlan, dep] = await Promise.all([p1, p2, p3]);

          await models.BoughtPlan.create(
            {
              planid: promoPlan.id,
              buyer: unitid,
              payer: company,
              predecessor: currentPlan[0].id,
              alias: promoPlan.name,
              disabled: false,
              totalprice: 3.0,
              buytime: currentPlan[0].endtime,
              endtime: null
            },
            { transaction: ta }
          );

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  applyPromocode: requiresAuth.createResolver(
    async (_, { promocode }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const { credits, currency, creditsexpire } = await selectCredit(
            promocode,
            company
          );

          const p1 = models.Credit.create(
            {
              amount: credits,
              currency,
              unitid: company,
              expires: creditsexpire
            },
            { transaction: ta }
          );

          const p2 = models.DepartmentData.update(
            { promocode },
            { where: { unitid: company }, returning: true, transaction: ta }
          );

          const [newCredits, updatedDepartment] = await Promise.all([p1, p2]);

          const p3 = createNotification({
            receiver: unitid,
            message: `Congrats, you received ${credits} credits`,
            icon: "money-bill-wave",
            link: "profile",
            changed: ["promocode"]
          });

          const p4 = createLog(
            ip,
            "applyPromocode",
            { promocode, newCredits, updatedDepartment },
            unitid,
            ta
          );

          await Promise.all([p3, p4]);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  createEmployee: requiresRights(["create-employees"]).createResolver(
    async (_, { file, addpersonal, addteams, apps }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const { wmail1, wmail2, password, name } = addpersonal;
          const {
            user: { unitid, company }
          } = decode(token);

          const isEmail = wmail1.indexOf("@");

          if (isEmail < 0) {
            throw new Error("Please enter a valid Email!");
          }

          const emailInUse = await models.Email.findOne({
            where: { email: wmail1 }
          });

          if (emailInUse) throw new Error("Email already in use!");
          /* if (password.length > MAX_PASSWORD_LENGTH) {
            throw new Error("Password too long");
          } */

          // Check Password
          if (password.length > MAX_PASSWORD_LENGTH) {
            throw new Error("Password too long");
          }
          if (password.length < MIN_PASSWORD_LENGTH) {
            throw new Error("Password too short");
          }

          const data = {};

          if (file) {
            const parsedFile = await file;
            const profilepicture = await uploadUserImage(
              parsedFile,
              userPicFolder
            );
            data.profilepicture = profilepicture;
          }

          const pwData = await getNewPasswordData(password);

          let unit = await models.Unit.create(data, { transaction: ta });
          unit = unit.get();

          const username = parseName(name);
          const p1 = models.Human.create(
            {
              title: username.salutation || "",
              firstname: username.firstName || "",
              middlename: username.middleName || "",
              lastname: username.lastName || "",
              suffix: username.suffix || "",
              unitid: unit.id,
              needspasswordchange: true,
              firstlogin: true,
              ...pwData,
              statisticdata: {
                name
              }
            },
            { transaction: ta, raw: true }
          );

          const p2 = models.Email.create(
            { email: wmail1, unitid: unit.id, verified: true },
            { transaction: ta }
          );
          let p2a = null;
          if (wmail2) {
            p2a = models.Email.create(
              { email: wmail2, unitid: unit.id, verified: true },
              { transaction: ta }
            );
          }
          const teampromises = [];
          teampromises.push(
            models.ParentUnit.create(
              { parentunit: company, childunit: unit.id },
              { transaction: ta }
            )
          );
          addteams.forEach(team =>
            teampromises.push(
              models.ParentUnit.create(
                { parentunit: team.unitid.id, childunit: unit.id },
                { transaction: ta }
              )
            )
          );
          Promise.all(teampromises);

          const p4 = models.Human.findOne({ where: { unitid } });

          const p5 = models.DepartmentData.findOne({
            where: { unitid: company }
          });

          const p6 = models.Right.create(
            {
              holder: unit.id,
              forunit: company,
              type: "view-apps"
            },
            { transaction: ta }
          );

          // distribute licences

          const licencepromises = [];

          // Teamlicences

          addteams.forEach(team => {
            if (team.services) {
              team.services.forEach(service =>
                licencepromises.push(
                  models.LicenceData.create(
                    {
                      unitid: unit.id,
                      disabled: false,
                      boughtplanid: service.id,
                      agreed: true,
                      key: {
                        email: service.setup.email,
                        password: service.setup.password,
                        subdomain: service.setup.subdomain,
                        external: true
                      },
                      options: service.setupfinished
                        ? {
                            teamlicence: team.unitid.id
                          }
                        : {
                            teamlicence: team.unitid.id,
                            nosetup: true
                          }
                    },
                    { transaction: ta }
                  )
                )
              );
            }
          });

          await Promise.all(licencepromises);

          //SingleLicences

          const mainapppromise = apps.map(async app => {
            const plan = await models.Plan.findOne({
              where: { appid: app.id, options: { external: true } },
              raw: true
            });

            if (!plan) {
              throw new Error(
                "This App is not integrated to handle external Accounts yet."
              );
            }
            await checkPlanValidity(plan);

            const boughtPlan = await models.BoughtPlan.create(
              {
                planid: plan.id,
                alias: app.name,
                disabled: false,
                buyer: unitid,
                payer: company,
                usedby: company,
                totalprice: 0,
                key: {
                  external: true,
                  externaltotalprice: 0
                }
              },
              { transaction: ta }
            );

            const licence = await models.LicenceData.create(
              {
                unitid: unit.id,
                disabled: false,
                boughtplanid: boughtPlan.id,
                agreed: true,
                key: {
                  email: app.email,
                  password: app.password,
                  subdomain: app.subdomain,
                  external: true
                }
              },
              { transaction: ta }
            );
          });

          await Promise.all(mainapppromise);

          let human = null;
          let newEmail = null;
          let newEmail2 = null;
          let requester = null;
          let companyObj = null;
          let rights = null;

          if (p2a) {
            [
              human,
              newEmail,
              newEmail2,
              requester,
              companyObj,
              rights
            ] = await Promise.all([p1, p2, p2a, p4, p5, p6]);
          } else {
            [
              human,
              newEmail,
              requester,
              companyObj,
              rights
            ] = await Promise.all([p1, p2, p4, p5, p6]);
          }
          const humanData = human.get();
          const newEmailData = newEmail.get();

          await createLog(
            ip,
            "addCreateEmployee",
            { unit, humanData, newEmailData, rights },
            unitid,
            ta
          );

          // brand new person, but better to be too careful
          addteams.forEach(team =>
            resetCompanyMembershipCache(team.unitid.id, unit.id)
          );
          resetCompanyMembershipCache(company, unit.id);

          await sendEmail({
            templateId: "d-e049cce50d20428d81f011e521605d4c",
            fromName: "VIPFY",
            personalizations: [
              {
                to: [{ email: wmail1, name: username.fullName }],
                dynamic_template_data: {
                  name: username.fullName,
                  creator: formatHumanName(requester),
                  companyname: companyObj.name,
                  email: wmail1,
                  password
                }
              }
            ]
          });

          await createNotification({
            receiver: unitid,
            message: `${username.fullName} was successfully created`,
            icon: "user-plus",
            link: "employeemanager",
            changed: []
          });

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),
  deleteEmployee: requiresRights(["delete-employees"]).createResolver(
    async (parent, { employeeid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);
          await models.Unit.update(
            { deleted: true },
            { where: { id: employeeid } },
            { transaction: ta, returning: true }
          );

          await createLog(
            ip,
            "fireEmployee",
            {
              employeeid
            },
            unitid.id,
            ta
          );

          resetCompanyMembershipCache(company, unitid.id);

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  )
};
