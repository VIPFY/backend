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

  changeAdminStatus: requiresRights(["edit-rights"]).createResolver(
    async (_p, { unitid, admin }, ctx) =>
      ctx.models.sequelize.transaction(async transaction => {
        try {
          const { models, session } = ctx;
          const {
            user: { company, unitid: userid }
          } = decode(session.token);

          if (userid == unitid) {
            throw new Error("You can't take your own admin rights!");
          }

          const data = {
            holder: unitid,
            forunit: company,
            type: "admin"
          };

          if (admin) {
            const p1 = await models.Right.create(data, { transaction });
            const p2 = await createLog(ctx, "adminAdd", {}, transaction);

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
            const p2 = createLog(ctx, "adminRemove", {}, transaction);

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
            transaction,
            {
              company,
              message: `Admin Rights have been changed for user ${unitid}`
            }
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
