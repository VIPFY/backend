import { decode } from "jsonwebtoken";
import {
  userPicFolder,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../../constants";
import {
  requiresAuth,
  requiresRights,
  requiresVipfyManagement,
} from "../../helpers/permissions";
import { NormalError } from "../../errors";
import {
  createLog,
  createNotification,
  formatHumanName,
  selectCredit,
  hashPasskey,
  checkVat,
} from "../../helpers/functions";
import { resetCompanyMembershipCache } from "../../helpers/companyMembership";
import { sendEmail } from "../../helpers/email";
import { uploadUserImage } from "../../services/aws";
import moment from "moment";

export default {
  createEmployee: requiresRights(["create-employees"]).createResolver(
    async (_p, args, ctx) => {
      const { models, session } = ctx;
      const {
        user: { unitid, company },
      } = decode(session.token);

      return ctx.models.sequelize
        .transaction(async ta => {
          try {
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
              phones,
              passkey,
              passwordMetrics,
              personalKey,
              passwordsalt,
            } = args;

            let noEmail = true;
            for await (const email of emails) {
              if (email.email != "") {
                noEmail = false;
                const isEmail = email.email.indexOf("@");

                if (isEmail < 0) {
                  throw new Error("Please enter a valid Email!");
                }

                const emailInUse = await models.Email.findOne({
                  where: { email: email.email },
                });
                if (emailInUse) throw new Error("Email already in use!");
              }
            }

            if (noEmail) {
              throw new Error("You need at least one Email!");
            }

            if (password && password.length > MAX_PASSWORD_LENGTH) {
              throw new Error("Password too long");
            }

            if (password && password.length < MIN_PASSWORD_LENGTH) {
              throw new Error(
                `Password must be at least ${MIN_PASSWORD_LENGTH} characters long!`
              );
            }

            if (passwordMetrics.passwordStrength < MIN_PASSWORD_LENGTH) {
              throw new Error("Password too weak!");
            }

            if (passwordMetrics.passwordlength > MAX_PASSWORD_LENGTH) {
              throw new Error("Password too long");
            }

            if (passwordMetrics.passwordlength < MIN_PASSWORD_LENGTH) {
              throw new Error(
                `Password must be at least ${MIN_PASSWORD_LENGTH} characters long!`
              );
            }

            if (passkey.length != 128) {
              throw new Error(
                "Incompatible passkey format, try updating VIPFY"
              );
            }

            if (passwordsalt.length != 32) {
              throw new Error("Incompatible salt format, try updating VIPFY");
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

            const [unitData, [currentPlan]] = await Promise.all([
              models.Unit.create(data, {
                transaction: ta,
              }),
              models.sequelize.query(
                `
                SELECT bpv.id, bpv.key, bpv.totalprice, pd.price as singleprice
                FROM boughtplan_view bpv
                        LEFT JOIN plan_data pd ON pd.id = bpv.planid
                WHERE planid IN (SELECT pd.id
                                FROM plan_data pd
                                WHERE appid = 'aeb28408-464f-49f7-97f1-6a512ccf46c2')
                  AND payer = :company
                  AND (endtime IS NULL OR endtime < now())
                  AND starttime < now()
                  AND disabled = FALSE
                ORDER BY starttime DESC;
                `,
                {
                  replacements: { company },
                  transaction: ta,
                  type: models.sequelize.QueryTypes.SELECT,
                }
              ),
            ]);
            const unit = unitData.get();

            const humanPromises = [
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
                  position,
                  hiredate: hiredate != "" ? hiredate : null,
                  birthday: birthday != "" ? birthday : null,
                  passkey: await hashPasskey(passkey),
                  ...passwordMetrics,
                  passwordsalt,
                  passwordhash: "",
                },
                { transaction: ta }
              ),
            ];

            if (currentPlan.key && !currentPlan.key.vipfyTrial) {
              humanPromises.push(
                models.BoughtPlanPeriod.update(
                  {
                    totalprice:
                      parseFloat(currentPlan.totalprice) +
                      parseFloat(currentPlan.singleprice),
                  },
                  { where: { boughtplanid: currentPlan.id }, transaction: ta }
                )
              );
            }

            // Create Emails
            emails.forEach(
              (email, index) =>
                email &&
                email.email &&
                email.email != "" &&
                humanPromises.push(
                  models.Email.create(
                    {
                      email: email.email,
                      unitid: unit.id,
                      verified: true,
                      priority: index,
                    },
                    { transaction: ta }
                  )
                )
            );

            // Create Adress

            if (address) {
              const { zip, street, city, ...normalData } = address;
              const addressData = { street, zip, city };
              humanPromises.push(
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
                  humanPromises.push(
                    models.Phone.create(
                      { ...phoneData, unitid: unit.id },
                      { transaction: ta }
                    )
                  )
              );
            }

            humanPromises.push(
              models.ParentUnit.create(
                { parentunit: company, childunit: unit.id },
                { transaction: ta }
              )
            );

            humanPromises.push(
              models.Right.create(
                {
                  holder: unit.id,
                  forunit: company,
                  type: "view-apps",
                },
                { transaction: ta }
              )
            );

            humanPromises.push(
              models.Key.create(
                {
                  ...personalKey,
                  unitid: unit.id,
                },
                { transaction: ta }
              )
            );

            await Promise.all(humanPromises);

            const [requester, companyObj] = await Promise.all([
              models.Human.findOne({ where: { unitid } }),
              models.DepartmentData.findOne({
                where: { unitid: company },
              }),
            ]);

            await createLog(ctx, "addCreateEmployee", { unit }, ta);

            // brand new person, but better to be too careful
            resetCompanyMembershipCache(company, unit.id);

            if (password) {
              await sendEmail({
                templateId: "d-e049cce50d20428d81f011e521605d4c",
                fromName: "VIPFY",
                personalizations: [
                  {
                    to: [
                      { email: emails[0].email, name: formatHumanName(name) },
                    ],
                    dynamic_template_data: {
                      name: formatHumanName(name),
                      creator: formatHumanName(requester),
                      companyname: companyObj.name,
                      email: emails[0].email,
                      password,
                    },
                  },
                ],
              });
            } else {
              // no password supplied to backend, this should be the encouraged case
              await sendEmail({
                templateId: "d-fc629636327e400ea14bda1340451eb6",
                fromName: "VIPFY",
                personalizations: [
                  {
                    to: [
                      { email: emails[0].email, name: formatHumanName(name) },
                    ],
                    dynamic_template_data: {
                      name: formatHumanName(name),
                      creator: formatHumanName(requester),
                      companyname: companyObj.name,
                      email: emails[0].email,
                    },
                  },
                ],
              });
            }

            const user = await models.User.findOne({
              where: { id: unit.id },
              transaction: ta,
              raw: true,
            });

            return { unitid, name, user };
          } catch (err) {
            throw new NormalError({
              message: err.message,
              internalData: { err },
            });
          }
        })
        .then(async ({ unitid, user }) => {
          await createNotification(
            {
              message: `User ${user.id} was successfully created by User ${unitid}`,
              icon: "user-plus",
              link: "employeemanager",
              changed: ["employees", "company"],
            },
            null,
            { company }
          );
          return user;
        });
    }
  ),

  editDepartmentName: requiresRights(["edit-department"]).createResolver(
    (_p, { departmentid, name }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { unitid, company },
          } = decode(session.token);

          const updatedDepartment = await models.DepartmentData.update(
            { name },
            {
              where: { unitid: departmentid },
              returning: true,
              transaction: ta,
            }
          );

          await createNotification(
            {
              message: `User ${unitid} updated Name of Team ${departmentid}`,
              icon: "users",
              link: "teammanager",
              changed: ["ownTeams", "companyTeams"],
            },
            null,
            { company, level: 1 },
            { teamid: departmentid, level: 1 }
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
            internalData: { err },
          });
        }
      })
  ),

  banEmployee: requiresRights(["edit-employees"]).createResolver(
    async (_p, { userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;
        const {
          user: { unitid, company },
        } = decode(session.token);

        if (userid == unitid) {
          throw new Error("You can't ban yourself!");
        }

        try {
          const p1 = await models.DepartmentEmployee.findOne({
            where: { id: company, employee: userid },

            raw: true,
          });

          const p2 = models.User.findOne(
            { where: { id: unitid } },

            { raw: true }
          );

          const [inCompany, admin] = await Promise.all([p1, p2]);

          if (!inCompany) {
            throw new Error("This user doesn't belong to this company!");
          }

          const bannedUser = await models.Human.update(
            { companyban: true },
            { where: { unitid: userid }, returning: true, transaction: ta }
          );

          const p4 = createNotification(
            {
              receiver: userid,
              message: `User ${unitid} banned User ${userid} from the company`,
              icon: "user-slash",
              link: "team",
              changed: ["me", "employees", "semiPublicUser"],
            },
            ta,
            { company, level: 3 }
          );

          const p5 = createLog(ctx, "banEmployee", { bannedUser, admin }, ta);

          await Promise.all([p4, p5]);

          return { ok: true };
        } catch (err) {
          await createNotification({
            receiver: unitid,
            message: `You couldn't ban the user. Please retry`,
            icon: "bug",
            link: "team",
            changed: [""],
          });

          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  unbanEmployee: requiresRights(["edit-employees"]).createResolver(
    async (_p, { userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;

        const {
          user: { unitid, company },
        } = decode(session.token);

        try {
          if (userid == unitid) {
            throw new Error("You can't unban yourself!");
          }

          const p1 = await models.DepartmentEmployee.findOne({
            where: { id: company, employee: userid },
            raw: true,
          });

          const p2 = models.User.findOne(
            { where: { id: unitid } },
            { raw: true }
          );

          const [inCompany, admin] = await Promise.all([p1, p2]);

          if (!inCompany) {
            throw new Error("This user doesn't belong to this company!");
          }

          const unbannedUser = await models.Human.update(
            { companyban: false },
            { where: { unitid: userid }, returning: true, transaction: ta }
          );

          const p4 = createNotification(
            {
              receiver: userid,
              message: `User ${unitid} unbanned User ${userid} from the company`,
              icon: "user-check",
              link: "team",
              changed: ["me", "employees", "semiPublicUser"],
            },
            ta,
            { company, level: 3 }
          );

          const p5 = createLog(ctx, "banEmployee", { unbannedUser, admin }, ta);

          await Promise.all([p4, p5]);

          return { ok: true };
        } catch (err) {
          await createNotification({
            receiver: unitid,
            message: `You couldn't unban the user. Please retry`,
            icon: "bug",
            link: "team",
            changed: [""],
          });

          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  addAdmin: requiresRights(["edit-users"]).createResolver(
    async (_p, { unitid, adminkey }, ctx) =>
      ctx.models.sequelize.transaction(async transaction => {
        try {
          const { models, session } = ctx;
          const {
            user: { unitid: issuer, company },
          } = decode(session.token);

          const p1 = models.Right.create(
            {
              holder: unitid,
              forunit: company,
              type: "admin",
            },
            { transaction }
          );
          const p2 = models.Key.create(
            {
              publickey: adminkey.publickey,
              privatekey: adminkey.privatekey,
              encryptedby: adminkey.encryptedby,
              unitid,
            },
            { transaction }
          );
          const p3 = createLog(ctx, "adminAdd", {}, transaction);

          await Promise.all([p1, p2, p3]);

          await createNotification(
            {
              receiver: unitid,
              message: `User ${issuer} gave admin privileges to User ${unitid}`,
              icon: "user-tie",
              link: "profile",
              changed: ["me", "employees", "semiPublicUser"],
            },
            transaction,
            {
              company,
              level: 3,
            }
          );

          return models.User.findByPk(unitid, { transaction });
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
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
            user: { company, unitid: userid },
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
              transaction,
            }
          );

          if (allAdmins.length < 2) {
            throw new Error("You can't take the last admins privileges");
          }

          const p1 = models.Right.destroy({
            where: {
              holder: unitid,
              forunit: company,
              type: "admin",
            },
            transaction,
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
              message: `User ${userid} revoked admin privileges from User ${unitid}`,
              icon: "user-minus",
              link: "profile",
              changed: ["me", "employees", "semiPublicUser"],
            },
            transaction,
            {
              company,
              level: 3,
            }
          );

          return models.User.findByPk(unitid, { transaction });
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
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
            user: { unitid, company },
          } = decode(session.token);

          const valid = await models.PromocodePlan.findOne({
            where: { code: promocode },
            raw: true,
            transaction: ta,
          });

          if (!valid) {
            throw new Error(`The code ${promocode} is not valid`);
          }

          const p1 = models.sequelize.query(
            `SELECT bd.*, pd.name
            FROM boughtplan_view bd
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
              transaction: ta,
            }
          );

          const p2 = models.Plan.findOne({
            where: { id: valid.planid, appid: 66 },
            raw: true,
            transaction: ta,
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
              endtime: null,
            },
            { transaction: ta }
          );

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  applyPromocode: requiresAuth.createResolver(async (_p, { promocode }, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      try {
        const { models, session } = ctx;

        const {
          user: { unitid, company },
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
            expires: creditsexpire,
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
          changed: ["promocode"],
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
          internalData: { err },
        });
      }
    })
  ),

  setVatID: requiresRights(["edit-company"]).createResolver(
    async (_p, { vatID }, { models, session }) => {
      try {
        const {
          user: { company: companyID },
        } = decode(session.token);

        const company = await models.Department.findOne({
          where: { unitid: companyID },
          raw: true,
        });

        let legalinformation;
        const sanitizedVatID = vatID.replace(/[\s]*/g, "");

        if (company.legalinformation) {
          if (company.legalinformation.vatID) {
            throw new Error("Please contact support to update your vatID");
          } else {
            legalinformation = {
              vatID: sanitizedVatID,
              ...company.legalinformation,
            };
          }
        } else {
          legalinformation = { vatID: sanitizedVatID };
        }

        await checkVat(sanitizedVatID);

        await models.DepartmentData.update(
          { legalinformation },
          { where: { unitid: companyID } }
        );

        return { ...company, legalinformation };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  deleteUser: requiresRights(["delete-employees"]).createResolver(
    async (_p, { userid, autodelete }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { unitid, company },
          } = decode(session.token);

          const oldUser = await models.User.findOne({
            where: { id: userid },
            transaction: ta,
            raw: true,
          });

          if (oldUser.assignments && autodelete) {
            await Promise.all(
              oldUser.assignments.map(async asid => {
                const licenceRight = await models.LicenceRight.findOne({
                  where: { id: asid },
                  raw: true,
                  transaction: ta,
                });
                if (licenceRight) {
                  const licences = await models.sequelize.query(
                    `SELECT * FROM licence_view WHERE id = :licenceid and endtime > now() or endtime is null`,
                    {
                      replacements: { licenceid: licenceRight.licenceid },
                      type: models.sequelize.QueryTypes.SELECT,
                      transaction: ta,
                    }
                  );

                  if (licences.length == 0) {
                    await models.LicenceData.update(
                      { endtime: models.Op.sequelize.fn("NOW") },
                      {
                        where: { id: licenceRight.licenceid },
                        transaction: ta,
                      }
                    );

                    const otherlicences = await models.sequelize.query(
                      `Select distinct (lva.*)
                    from licence_view lva left outer join licence_view lvb on lva.boughtplanid = lvb.boughtplanid
                    where lvb.id = :licenceid and lva.starttime < now() and lva.endtime > now();`,
                      {
                        replacements: { licenceid: licenceRight.licenceid },
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction: ta,
                      }
                    );

                    if (otherlicences.length == 0) {
                      const boughtplan = await models.sequelize.query(
                        `SELECT boughtplanid FROM licence_view WHERE id = :licenceid`,
                        {
                          replacements: { licenceid: licenceRight.licenceid },
                          type: models.sequelize.QueryTypes.SELECT,
                          transaction: ta,
                        }
                      );

                      const oldperiod = await models.BoughtPlanPeriodView.findOne(
                        {
                          where: { boughtplanid: boughtplan[0].boughtplanid },
                          raw: true,
                          transaction: ta,
                        }
                      );

                      await models.BoughtPlanPeriod.update(
                        { endtime: models.Op.sequelize.fn("NOW") },
                        {
                          where: { id: oldperiod.id },
                          transaction: ta,
                        }
                      );
                    }
                  }
                }
              })
            );
          }

          await Promise.all([
            models.ParentUnit.destroy({
              where: { childunit: userid },
              transaction: ta,
            }),
            models.Unit.update(
              { deleted: true },
              { where: { id: userid }, transaction: ta }
            ),
            models.Human.update(
              {
                firstname: "redacted",
                middlename: "redacted",
                lastname: "redacted",
                sex: null,
                birthday: null,
                statisticdata: null,
              },
              { where: { unitid: userid }, transaction: ta }
            ),
          ]);

          await Promise.all([
            createNotification(
              {
                message: `User ${unitid} removed User ${userid} from the company`,
                icon: "user-minus",
                link: "employeemanager",
                changed: ["employees"],
              },
              ta,
              { company, level: 3 }
            ),
            createLog(ctx, "deleteUser", { oldUser }, ta),
            resetCompanyMembershipCache(company, unitid.id),
          ]);

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  approveVacationRequest: requiresVipfyManagement().createResolver(
    async (_p, { userid, requestid }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company },
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
              link: "vacation",
            },
            ta,
            {
              company,
              message: `User ${userid} vacation request was confirmed`,
            }
          );

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  declineVacationRequest: requiresVipfyManagement().createResolver(
    async (_p, { userid, requestid }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company },
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
              link: "vacation",
            },
            ta,
            { company, message: `User ${userid} vacation request was declined` }
          );

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  updateCompanyPic: requiresRights(["edit-department"]).createResolver(
    async (_p, { file }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models } = ctx;
          const {
            user: { company, unitid },
          } = decode(ctx.session.token);

          const parsedFile = await file;
          const profilepicture = await uploadUserImage(
            parsedFile,
            userPicFolder
          );

          const oldUnit = await models.Department.findOne({
            where: { unitid: company },
            raw: true,
            transaction: ta,
          });

          const [, updatedUnit] = await models.Unit.update(
            { profilepicture },
            { where: { id: company }, returning: true, transaction: ta }
          );

          await Promise.all([
            createLog(ctx, "updateCompanyPic", { oldUnit, updatedUnit }, ta),
            createNotification(
              {
                receiver: unitid,
                show: true,
                message: `User ${unitid} updated the companies profile picture`,
                icon: "image",
                changed: ["company", "me"],
                link: "companyprofile",
                level: 1,
              },
              ta,
              null,
              { teamid: company, level: 1 }
            ),
          ]);

          return { ...oldUnit, profilepicture };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  selectVIPFYPlan: requiresRights(["edit-boughtplan"]).createResolver(
    async (_p, { planid, tos }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(session.token);

          if (!tos) {
            throw new Error("You have to accept the Terms of Service");
          }

          const vipfyPlans = await models.Plan.findAll({
            where: {
              appid: "aeb28408-464f-49f7-97f1-6a512ccf46c2",
              enddate: {
                [models.Op.or]: {
                  [models.Op.is]: null,
                  [models.Op.lt]: models.sequelize.fn("NOW"),
                },
              },
            },
            attributes: ["id", "price"],
            raw: true,
            transaction: ta,
          });

          const [vipfyPlan, currentPlan, { employees }] = await Promise.all([
            models.Plan.findByPk(planid, {
              attributes: ["name", "price", "currency", "payperiod"],
              raw: true,
              transaction: ta,
            }),
            models.BoughtPlanView.findOne({
              where: {
                usedby: company,
                planid: vipfyPlans.map(plan => plan.id),
                endtime: null,
                disabled: false,
              },
              order: [["buytime", "DESC"]],
              raw: true,
              transaction: ta,
            }),
            models.Department.findOne({
              where: { unitid: company },
              attributes: ["employees"],
              raw: true,
              transaction: ta,
            }),
          ]);

          const [boughtPlan, { cancelperiod }] = await Promise.all([
            models.BoughtPlan.create(
              {
                disabled: false,
                usedby: company,
                alias: vipfyPlan.name,
                key: { vipfyTrial: false, tos: Date.now() },
              },
              { transaction: ta }
            ),
            models.Plan.findByPk(currentPlan.planid, {
              raw: true,
              transaction: ta,
              attributes: ["cancelperiod"],
            }),
          ]);

          const endtime = moment()
            .add(Object.values(cancelperiod)[0], Object.keys(cancelperiod)[0])
            .endOf("month");

          await Promise.all([
            models.BoughtPlanPeriod.create(
              {
                boughtplanid: boughtPlan.dataValues.id,
                planid,
                starttime: endtime,
                payer: company,
                creator: unitid,
                totalprice: parseFloat(vipfyPlan.price) * parseFloat(employees),
              },
              { transaction: ta }
            ),
            models.BoughtPlan.update(
              {
                key: {
                  ...boughtPlan.dataValues.key,
                  needsCustomerAction: false,
                },
              },
              { where: { id: currentPlan.id }, transaction: ta }
            ),
            models.BoughtPlanPeriod.update(
              { endtime },
              { where: { boughtplanid: currentPlan.id }, transaction: ta }
            ),
          ]);

          await createNotification(
            {
              receiver: unitid,
              show: true,
              message: `User ${unitid} bought the VIPFY plan ${
                vipfyPlan.name
              } for ${vipfyPlan.price} ${
                vipfyPlan.price >= 0 ? vipfyPlan.currency : ""
              }`,
              icon: "file-contract",
              changed: ["vipfyPlan"],
              link: "companyprofile",
              level: 1,
            },
            ta,
            { company },
            null
          );

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),
};
