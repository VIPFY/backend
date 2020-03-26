import { decode, verify } from "jsonwebtoken";
import iplocate from "node-iplocate";
import moment from "moment";
import "moment-feiertage";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import {
  userPicFolder,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  IMPERSONATE_PREFIX,
  USER_SESSION_ID_PREFIX,
  REDIS_SESSION_PREFIX
} from "../../constants";
import { NormalError, RightsError } from "../../errors";
import {
  createLog,
  companyCheck,
  getNewPasswordData,
  parentAdminCheck,
  createNotification,
  concatName,
  fetchSessions,
  hashPasskey
} from "../../helpers/functions";
import { uploadUserImage } from "../../services/aws";
import { createAdminToken } from "../../helpers/auth";
import { sendEmail } from "../../helpers/email";
/* eslint-disable no-unused-vars, prefer-destructuring */

export default {
  updateEmployeePic: requiresRights(["edit-user"]).createResolver(
    async (_p, { file, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models } = ctx;

          const parsedFile = await file;
          const profilepicture = await uploadUserImage(
            parsedFile,
            userPicFolder
          );

          const oldUnit = await models.Unit.findOne({
            where: { id: userid },
            raw: true
          });

          const updatedUnit = await models.Unit.update(
            { profilepicture },
            { where: { id: userid }, returning: true, transaction: ta }
          );

          const p1 = createLog(
            ctx,
            "updateEmployeePic",
            { oldUnit, updatedUnit: updatedUnit[1] },
            ta
          );

          const p2 = models.User.findOne({ where: { id: userid }, raw: true });

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

  updateEmployee: requiresRights(["edit-employee"]).createResolver(
    async (_p, { user }, ctx) => {
      await ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { unitid, company }
          } = decode(session.token);

          const { id, password, ...userData } = user;

          if (password) {
            throw new Error("You can't update the password this way!");
          }

          await companyCheck(company, unitid, id);

          const legitimateUser = models.User.findOne({
            where: { id, deleted: false, banned: false, suspended: false },
            raw: true
          });

          if (!legitimateUser) {
            throw new Error("This user can't be updated at the moment!");
          }

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

          await createLog(ctx, "updateEmployee", { updateArgs: user }, ta);

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      });

      return ctx.models.User.findOne({ where: { id: user.id } });
    }
  ),

  updateEmployeePassword: requiresRights(["edit-employee"]).createResolver(
    async (_p, { unitid, password, logOut }, ctx) => {
      try {
        const { models, session } = ctx;
        const {
          user: { unitid: id, company }
        } = decode(session.token);

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
          throw new RightsError({
            message: "You don't have the neccessary rights!"
          });
        }

        // An admin should be able to update his own password
        if (employee.isadmin && employee.id != isAdmin.id) {
          throw new Error("You can't change another admins password!");
        }

        const pw = await getNewPasswordData(password);

        if (pw.passwordStrength < 2) {
          throw new Error("Password too weak!");
        }

        await models.Human.update({ ...pw }, { where: { unitid } });

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
          const sessions = await fetchSessions(ctx.redis, unitid);

          const sessionPromises = [];

          sessions.forEach(sessionString => {
            sessionPromises.push(
              ctx.redis.del(`${REDIS_SESSION_PREFIX}${sessionString}`)
            );
          });

          sessionPromises.push(
            ctx.redis.del(`${USER_SESSION_ID_PREFIX}${unitid}`)
          );
          await Promise.all(sessionPromises);
        }

        return {
          id: unitid,
          passwordlength: pw.passwordlength,
          passwordstrength: pw.passwordstrength,
          needspasswordchange: true,
          unitid: unitid
        };
      } catch (err) {
        if (err instanceof RightsError) {
          throw err;
        } else {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      }
    }
  ),

  updateEmployeePasswordEncrypted: requiresRights([
    "edit-employee"
  ]).createResolver(
    async (
      _p,
      {
        unitid,
        newPasskey,
        passwordMetrics,
        logOut,
        newKey,
        deprecateAllExistingKeys,
        licenceUpdates
      },
      ctx
    ) => {
      try {
        const { models, session } = ctx;
        const {
          user: { unitid: id, company }
        } = decode(session.token);

        return await ctx.models.sequelize.transaction(async transaction => {
          try {
            if (passwordMetrics.passwordlength > MAX_PASSWORD_LENGTH) {
              throw new Error("Password too long");
            }

            if (passwordMetrics.passwordlength < MIN_PASSWORD_LENGTH) {
              throw new Error(
                `Password must be at least ${MIN_PASSWORD_LENGTH} characters long!`
              );
            }

            if (passwordMetrics.passwordStrength < 2) {
              throw new Error("Password too weak!");
            }

            if (newPasskey.length != 128) {
              throw new Error(
                "Incompatible passkey format, try updating VIPFY"
              );
            }

            const p1 = models.User.findOne({
              where: { id, isadmin: true },
              raw: true,
              transaction
            });

            const p2 = models.User.findOne({
              where: { id: unitid },
              raw: true,
              transaction
            });
            const [isAdmin, employee] = await Promise.all([p1, p2]);

            await companyCheck(company, id, unitid);

            if (!isAdmin) {
              throw new RightsError({
                message: "You don't have the neccessary rights!"
              });
            }

            // An admin should be able to update his own password
            if (employee.isadmin && employee.id != isAdmin.id) {
              throw new Error("You can't change another admins password!");
            }

            if (deprecateAllExistingKeys) {
              await models.Key.update(
                { deprecated: true },
                { where: { unitid }, transaction }
              );
            }

            const promises = [];
            promises.push(
              models.Human.update(
                {
                  needspasswordchange: true,
                  ...passwordMetrics,
                  passkey: await hashPasskey(newPasskey)
                },
                { where: { unitid }, returning: true, transaction }
              )
            );

            delete newKey.id;
            delete newKey.createdat;
            delete newKey.unitid;
            promises.push(
              models.Key.create(
                {
                  ...newKey,
                  unitid
                },
                { transaction }
              )
            );

            promises.push(
              models.LicenceData.findAll({
                attributes: ["id", "key"],
                where: {
                  id: { [models.Op.in]: licenceUpdates.map(u => u.licence) }
                },
                transaction
              })
            );

            console.log("a", Promise.all, promises);
            // let human = await promises[0];
            // console.log("human", human);
            // let key = await promises[1];
            // console.log("key", key);
            // let licences = await promises[2];
            let [human, key, licences] = await Promise.all(promises);
            console.log("b", licences);

            promises.length = 0;
            for (const u of licenceUpdates) {
              if (u.new.key == "new") {
                u.new.key = key.id;
              }
              for (const l of licences) {
                if (l.key.encrypted) {
                  l.key = {
                    ...l.key,
                    encrypted: l.key.encrypted.map(e => {
                      if (
                        e.key != u.old.key ||
                        e.data != u.old.data ||
                        e.belongsto != u.old.belongsto
                      ) {
                        return e;
                      }
                      return u.new;
                    })
                  };
                }
              }
            }

            Promise.all(
              licences.map(l => l.save({ fields: ["key"], transaction }))
            );

            const employeeName = concatName(employee);
            const adminName = concatName(isAdmin);

            // await sendEmail({
            //   templateId: "d-9beb3ea901d64894a8227c295aa8548e",
            //   personalizations: [
            //     {
            //       to: [{ email: employee.emails[0] }],
            //       dynamic_template_data: { employeeName, adminName, password }
            //     }
            //   ],
            //   fromName: "VIPFY GmbH"
            // });

            if (logOut) {
              const sessions = await fetchSessions(ctx.redis, unitid);

              const sessionPromises = [];

              sessions.forEach(sessionString => {
                sessionPromises.push(
                  ctx.redis.del(`${REDIS_SESSION_PREFIX}${sessionString}`)
                );
              });

              sessionPromises.push(
                ctx.redis.del(`${USER_SESSION_ID_PREFIX}${unitid}`)
              );
              await Promise.all(sessionPromises);
            }

            return {
              id: unitid,
              ...passwordMetrics,
              needspasswordchange: true,
              unitid: unitid
            };
          } catch (error) {
            console.log(error);
            throw error;
          }
        });
      } catch (err) {
        if (err instanceof RightsError) {
          throw err;
        } else {
          console.error(err, err.sql);
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      }
    }
  ),

  setConsent: requiresAuth.createResolver(async (_p, { consent }, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      const { models, session } = ctx;
      const {
        user: { unitid }
      } = decode(ctx.session.token);

      try {
        await models.Human.update(
          { consent },
          { where: { unitid }, transaction: ta }
        );

        const p1 = createLog(ctx, "setConsent", { consent }, ta);
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
  ),

  impersonate: requiresRights(["impersonate"]).createResolver(
    async (_p, { userid }, ctx) => {
      try {
        const {
          user: { unitid: id, company }
        } = decode(ctx.session.token);

        if (id == userid) {
          throw new Error("You can't impersonate yourself!");
        }

        if (decode(ctx.session.token).impersonator) {
          throw new Error(
            "You are already impersonating someone, impersonating recursively isn't allowed"
          );
        }

        const target = await ctx.models.User.findOne({ where: { id: userid } });

        if (target.isadmin) {
          throw new Error("You can't impersonate an administrator");
        }

        if (
          target.companyban ||
          target.deleted ||
          target.banned ||
          target.suspended
        ) {
          // this might be useful to allow, but currently requiresAuth won't accept you anyways
          throw new Error("You can't impersonate this user");
        }

        const token = await createAdminToken({
          unitid: userid,
          company,
          impersonator: id,
          sessionID: ctx.sessionID,
          SECRET: ctx.SECRET
        });

        // Append the oldToken to the Session to set it back when the Admin
        // ends the Impersonation
        ctx.session.oldToken = ctx.session.token;
        ctx.session.token = token;
        const location = await iplocate(
          // In development using the ip is not possible
          process.env.ENVIRONMENT == "production" ? ctx.ip : "192.76.145.3"
        );

        await ctx.redis.lpush(
          `${IMPERSONATE_PREFIX}${id}`,
          JSON.stringify({
            session: ctx.sessionID,
            ...ctx.userData,
            ...location,
            loggedInAt: Date.now()
          })
        );

        ctx.session.save(err => {
          if (err) {
            console.error("\x1b[1m%s\x1b[0m", "ERR:", err);
          }
        });

        await createLog(
          ctx,
          "impersonate",
          { impersonator: id, user: userid },
          null
        );

        return token;
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  ),

  endImpersonation: async (_p, _args, ctx) => {
    try {
      const { user, impersonator } = decode(ctx.session.token);

      const listName = `${IMPERSONATE_PREFIX}${impersonator}`;
      const sessionIDs = await ctx.redis.lrange(listName, 0, -1);

      const sessionID = sessionIDs.find(el => el == ctx.sessionID);

      await ctx.redis.lrem(listName, 0, sessionID);
      ctx.session.token = ctx.session.oldToken;
      delete ctx.session.oldToken;

      ctx.session.save(err => {
        if (err) {
          console.error("\x1b[1m%s\x1b[0m", "ERR:", err);
        }
      });

      await createLog(ctx, "endImpersonation", { impersonator, user }, null);

      return ctx.session.token;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  setVacationDays: requiresAuth.createResolver(
    async (_p, { year, days, userid }, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        await models.sequelize.query(
          `
        INSERT into vacation_year_days_data(unitid, company, year, days)
        VALUES(:userid, :company, :year, :days)
        ON CONFLICT (unitid, company, year) DO UPDATE SET days = :days
        `,
          { replacements: { year, company, days, userid } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  requestVacation: requiresAuth.createResolver(
    async (_p, { startDate, endDate, days }, { models, session }) => {
      try {
        return await models.sequelize.transaction(async ta => {
          const {
            user: { unitid, company }
          } = decode(session.token);

          const startdate = moment(startDate);
          const enddate = moment(endDate);

          const computeVacationDays = (date, fullDays) => {
            if (fullDays == 1) {
              return 1;
            }

            const clonedDate = moment(date);
            let offDays = 0;

            for (let i = 0; i < fullDays; i++) {
              clonedDate.add(i < 2 ? i : 1, "days");

              if (
                clonedDate.isoWeekday() == 6 ||
                clonedDate.isoWeekday() == 7 ||
                clonedDate.isHoliday(["SL"]).holidayName
              ) {
                offDays++;
              }
            }

            return fullDays - offDays;
          };

          const computedDays = computeVacationDays(
            startdate,
            moment
              .duration(
                moment(enddate)
                  .endOf("day")
                  // Otherwise it won't be a full day
                  .add(1, "day")
                  .diff(startdate.startOf("day"))
              )
              .days()
          );

          if (computedDays != days) {
            throw new Error(
              "The days don't match the length of the vacation duration!"
            );
          }

          const request = await models.VacationRequest.create(
            {
              unitid,
              startdate: startdate.format("LL"),
              enddate: enddate.format("LL"),
              days,
              requested: models.sequelize.fn("NOW")
            },
            { transaction: ta }
          );

          createNotification(
            {
              receiver: unitid,
              message: "Vacation request successfully created",
              icon: "umbrella-beach",
              link: "vacation",
              changed: ["vacationRequest"]
            },
            ta,
            { company, message: `User ${unitid} requested vacation` }
          );

          return request;
        });
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  ),

  requestHalfVacationDay: requiresAuth.createResolver(
    async (_p, { day }, { models, session }) => {
      try {
        return await models.sequelize.transaction(async ta => {
          const {
            user: { unitid, company }
          } = decode(session.token);

          const request = await models.VacationRequest.create(
            {
              unitid,
              startdate: day,
              enddate: day,
              days: 0.5,
              requested: models.sequelize.fn("NOW")
            },
            { transaction: ta }
          );

          await createNotification(
            {
              receiver: unitid,
              message: "Vacation request successfully created",
              icon: "umbrella-beach",
              link: "vacation",
              changed: ["vacationRequest"]
            },
            ta,
            { company, message: `User ${unitid} requested half a vacation day` }
          );

          return request;
        });
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  deleteVacationRequest: requiresAuth.createResolver(
    async (_p, { id }, { models, session }) => {
      try {
        return await models.sequelize.transaction(async ta => {
          const {
            user: { unitid, company }
          } = decode(session.token);

          const res = await models.VacationRequest.update(
            { decided: models.sequelize.fn("NOW"), status: "CANCELLED" },
            { where: { id, unitid }, transaction: ta }
          );

          if (res[0] == 0) {
            throw new Error("Could not update request");
          }

          await createNotification(
            {
              message: "Successfully deleted request",
              icon: "umbrella-beach",
              link: "vacation",
              changed: ["vacationRequest"]
            },
            ta,
            { company, message: `User ${unitid} deleted a vacation request` }
          );

          return true;
        });
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  )
};
