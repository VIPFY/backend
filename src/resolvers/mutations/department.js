import { decode } from "jsonwebtoken";
import { parseName } from "humanparser";
import {
  userPicFolder,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH
} from "../../constants";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import {
  createLog,
  createNotification,
  formatHumanName,
  selectCredit,
  getNewPasswordData,
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
    (_p, { data }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { unitid: id, company: unitid }
          } = decode(session.token);

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
            ctx,
            "updateStatisticData",
            { currentData, newData: newData[1] },
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
    (_p, { unitid, departmentid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { company }
          } = decode(session.token);

          let parentUnit = await models.ParentUnit.create(
            { parentunit: departmentid, childunit: unitid },
            { transaction: ta }
          );

          parentUnit = parentUnit.get();

          await createLog(
            ctx,
            "addEmployee",
            { unitid, departmentid, parentUnit },
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

  createEmployee: requiresRights(["create-employees"]).createResolver(
    async (_p, args, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
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
          } = args;
          const {
            user: { unitid, company }
          } = decode(session.token);

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

          // Create Emails
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

          // Create Adress

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

          await createLog(ctx, "addCreateEmployee", { unit }, ta);

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

          await createNotification({
            receiver: unitid,
            message: `${formatHumanName(name)} was successfully created`,
            icon: "user-plus",
            link: "employeemanager",
            changed: ["employees"]
          });

          return await models.User.findOne({
            where: { id: unit.id },
            transaction: ta,
            raw: true
          });
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  editDepartmentName: requiresRights(["edit-department"]).createResolver(
    (_p, { departmentid, name }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { unitid }
          } = decode(session.token);

          const updatedDepartment = await models.DepartmentData.update(
            { name },
            {
              where: { unitid: departmentid },
              returning: true,
              transaction: ta
            }
          );

          await createLog(
            ctx,
            "editDepartmentName",
            { updatedDepartment: updatedDepartment[1] },
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

  banEmployee: requiresRights(["edit-employees"]).createResolver(
    async (_p, { userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;
        const {
          user: { unitid, company }
        } = decode(session.token);

        if (userid == unitid) {
          throw new Error("You can't ban yourself!");
        }

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
            message: `You banned ${user.firstname} ${user.lastname} from the company`,
            icon: "user-slash",
            link: "team",
            changed: ["human"]
          });

          const p5 = createLog(ctx, "banEmployee", { bannedUser, admin }, ta);

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
    async (_p, { userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;

        const {
          user: { unitid, company }
        } = decode(session.token);

        try {
          if (userid == unitid) {
            throw new Error("You can't unban yourself!");
          }

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
            message: `You unbanned ${user.firstname} ${user.lastname} from the company`,
            icon: "user-check",
            link: "team",
            changed: ["human"]
          });

          const p5 = createLog(ctx, "banEmployee", { unbannedUser, admin }, ta);

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
    async (_p, { file }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const parsedFile = await file;
          const profilepicture = await uploadUserImage(
            parsedFile,
            userPicFolder
          );

          const { models, session } = ctx;
          const {
            user: { company: id }
          } = decode(session.token);

          const oldUnit = await models.Unit.findOne({
            where: { id },
            raw: true
          });

          const updatedUnit = await models.Unit.update(
            { profilepicture },
            { where: { id }, returning: true, transaction: ta }
          );

          await createLog(
            ctx,
            "updateCompanyPic",
            { oldUnit, updatedUnit: updatedUnit[1] },
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
  saveProposalData: async (_, { data }, { models, session }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { company }
        } = decode(session.token);

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

  addAdmin: requiresRights(["edit-users"]).createResolver(
    async (_p, { unitid, adminkey }, ctx) =>
      ctx.models.sequelize.transaction(async transaction => {
        try {
          const { models, session } = ctx;
          const {
            user: { company }
          } = decode(session.token);

          const p1 = models.Right.create(
            {
              holder: unitid,
              forunit: company,
              type: "admin"
            },
            { transaction }
          );
          const p2 = models.Key.create(
            {
              publickey: adminkey.publickey,
              privatekey: adminkey.privatekey,
              encryptedby: adminkey.encryptedby,
              unitid
            },
            { transaction }
          );
          const p3 = createLog(ctx, "adminAdd", {}, transaction);

          await Promise.all([p1, p2, p3]);

          await createNotification(
            {
              receiver: unitid,
              message: "You received admin privileges",
              icon: "user-tie",
              link: "profile",
              changed: ["me"]
            },
            transaction,
            {
              company,
              message: `User ${unitid} has received admin status`
            }
          );

          return models.User.findByPk(unitid, { transaction });
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),
  removeAdmin: requiresRights(["edit-users"]).createResolver(
    async (_p, { unitid }, ctx) =>
      ctx.models.sequelize.transaction(async transaction => {
        try {
          const { models, session } = ctx;
          const {
            user: { company, unitid: userid }
          } = decode(session.token);

          if (userid == unitid) {
            throw new Error("You can't take your own admin rights!");
          }

          const allAdmins = await models.sequelize.query(
            `
              SELECT DISTINCT ON (dev.employee) uv.*
              FROM users_view uv
                LEFT OUTER JOIN department_employee_view dev ON dev.employee = uv.id
              WHERE dev.id = :company AND uv.isadmin = true;
              `,
            {
              replacements: { company },
              type: models.sequelize.QueryTypes.SELECT,
              transaction
            }
          );

          if (allAdmins.length < 2) {
            throw new Error("You can't take the last admins privileges");
          }

          const p1 = models.Right.destroy({
            where: {
              holder: unitid,
              forunit: company,
              type: "admin"
            },
            transaction
          });
          const p2 = models.sequelize.query(
            `
            DELETE FROM key_data
            WHERE
              unitid = :unitid AND
              publickey = (SELECT adminkey from department_data WHERE unitid = :company)
          `,
            { replacements: { unitid, company }, transaction }
          );
          const p3 = createLog(ctx, "adminRemove", {}, transaction);

          await Promise.all([p1, p2, p3]);

          await createNotification(
            {
              receiver: unitid,
              message: "Your admin privileges were revoked",
              icon: "user-minus",
              link: "profile",
              changed: ["me"]
            },
            transaction,
            {
              company,
              message: `Admin Rights were revoked for user ${unitid}`
            }
          );

          return models.User.findByPk(unitid, { transaction });
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
    async (_p, { promocode }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

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

          const [currentPlan, promoPlan, _d] = await Promise.all([p1, p2, p3]);

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

  applyPromocode: requiresAuth.createResolver(async (_p, { promocode }, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      try {
        const { models, session } = ctx;

        const {
          user: { unitid, company }
        } = decode(session.token);

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
          ctx,
          "applyPromocode",
          { promocode, newCredits, updatedDepartment },
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

  createEmployeeOLD: requiresRights(["create-employees"]).createResolver(
    async (_p, { file, addpersonal, addteams, apps }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { wmail1, wmail2, password, name } = addpersonal;

          const { models, session } = ctx;
          const {
            user: { unitid, company }
          } = decode(session.token);

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
                        ? { teamlicence: team.unitid.id }
                        : { teamlicence: team.unitid.id, nosetup: true }
                    },
                    { transaction: ta }
                  )
                )
              );
            }
          });

          await Promise.all(licencepromises);

          // SingleLicences

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

            await models.LicenceData.create(
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
            ctx,
            "addCreateEmployee",
            { unit, humanData, newEmailData, rights },
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

  deleteUser: requiresRights(["delete-employees"]).createResolver(
    async (_p, { userid, autodelete }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { unitid, company }
          } = decode(session.token);

          const oldUser = await models.sequelize.query(
            `SELECT * FROM users_view WHERE id = :userid`,
            {
              replacements: { userid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta
            }
          );

          //oldUser all informations

          //START DELETE ONE EMPLOYEE
          const promises = [];

          if (oldUser.assignments) {
            // Delete all assignments of oldUser
            await Promise.all(
              oldUser.assignments.map(async asid => {
                if (as.bool) {
                  promises.push(
                    models.LicenceRight.update(
                      {
                        endtime
                      },
                      {
                        where: { id: asid },
                        transaction: ta
                      }
                    )
                  );
                } else {
                  // Remove team tag and assignoption
                  const checkassignment = await models.LicenceRight.findOne({
                    where: { id: asid },
                    raw: true,
                    transaction: ta
                  });
                  if (
                    checkassignment.tags &&
                    checkassignment.tags.includes("teamlicence") &&
                    checkassignment.options &&
                    checkassignment.options.teamlicence == teamid
                  ) {
                    let newtags = checkassignment.tags;
                    newtags.splice(
                      checkassignment.tags.findIndex(e => e == "teamlicence"),
                      1
                    );
                    promises.push(
                      models.LicenceRight.update(
                        {
                          tags: newtags,
                          options: {
                            ...checkassignment.options,
                            teamlicence: undefined
                          }
                        },
                        {
                          where: { id: asid },
                          transaction: ta
                        }
                      )
                    );
                  }
                }
              })
            );
            await Promise.all(promises);

            //Check for other assignments
            if (autodelete) {
              await Promise.all(
                oldUser.assignments.map(async asid => {
                  const licenceRight = await models.LicenceRight.findOne({
                    where: { id: asid },
                    raw: true,
                    transaction: ta
                  });

                  const licences = await models.sequelize.query(
                    `SELECT * FROM licence_view WHERE id = :licenceid and endtime > now() or endtime is null`,
                    {
                      replacements: { licenceid: licenceRight.licenceid },
                      type: models.sequelize.QueryTypes.SELECT,
                      transaction: ta
                    }
                  );

                  if (licences.length == 0) {
                    await models.LicenceData.update(
                      {
                        endtime
                      },
                      {
                        where: { id: licenceRight.licenceid },
                        transaction: ta
                      }
                    );

                    const otherlicences = await models.sequelize.query(
                      `Select distinct (lva.*)
                    from licence_view lva left outer join licence_view lvb on lva.boughtplanid = lvb.boughtplanid
                    where lvb.id = :licenceid and lva.starttime < now() and lva.endtime > now();`,
                      {
                        replacements: { licenceid: licenceRight.licenceid },
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction: ta
                      }
                    );

                    if (otherlicences.length == 0) {
                      const boughtplan = await models.sequelize.query(
                        `SELECT boughtplanid FROM licence_view WHERE id = :licenceid`,
                        {
                          replacements: { licenceid: licenceRight.licenceid },
                          type: models.sequelize.QueryTypes.SELECT,
                          transaction: ta
                        }
                      );

                      await models.BoughtPlan.update(
                        {
                          endtime
                        },
                        {
                          where: { id: boughtplan[0].boughtplanid },
                          transaction: ta
                        }
                      );
                    }
                  }
                })
              );
            }
          }

          //Delete from teams

          await models.ParentUnit.destroy({
            where: { childunit: userid },
            transaction: ta
          });

          await models.Unit.update(
            { deleted: true },
            { where: { id: userid } },
            { transaction: ta, returning: true }
          );

          await createLog(ctx, "fireEmployee", { userid }, ta);

          resetCompanyMembershipCache(company, unitid.id);

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  approveVacationRequest: requiresRights([
    "edit-vacation-requests"
  ]).createResolver(async (_p, { userid, requestid }, { models, session }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        const res = await models.VacationRequest.update(
          { status: "CONFIRMED", decided: models.sequelize.fn("NOW") },
          { where: { unitid: userid, id: requestid } }
        );

        if (res[0] == 0) {
          throw new Error("Could not update request");
        }

        await createNotification(
          {
            receiver: userid,
            show: true,
            message: "Your vacation request was confirmed",
            icon: "umbrella-beach",
            changed: ["vacationRequest"],
            link: "vacation"
          },
          ta,
          { company, message: `User ${userid} vacation request was confirmed` }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    })
  ),

  declineVacationRequest: requiresRights([
    "edit-vacation-requests"
  ]).createResolver(async (_p, { userid, requestid }, { models, session }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { company }
        } = decode(session.token);
        const res = await models.VacationRequest.update(
          { status: "REJECTED", decided: models.sequelize.fn("NOW") },
          { where: { unitid: userid, id: requestid }, transaction: ta }
        );

        if (res[0] == 0) {
          throw new Error("Could not update request");
        }

        await createNotification(
          {
            receiver: userid,
            show: true,
            message: "Your vacation request was declined",
            icon: "umbrella-beach",
            changed: ["vacationRequest"],
            link: "vacation"
          },
          ta,
          { company, message: `User ${userid} vacation request was declined` }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    })
  )
};
