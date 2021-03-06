import { decode } from "jsonwebtoken";
import { requiresRights } from "../../helpers/permissions";
import { NormalError, RightsError } from "../../errors";
import { createLog } from "../../helpers/functions";
import {
  newsletterSignup,
  newsletterConfirmSignup,
} from "../../helpers/newsletter";
import logger from "../../loggers";
import { googleMapsClient } from "../../services/gcloud";
import { emailRegex, sendEmail } from "../../helpers/email";

/* eslint-disable prefer-const */

export default {
  createAddress: requiresRights(["create-address"]).createResolver(
    (_p, { addressData, department }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          let {
            user: { unitid, company },
          } = decode(session.token);

          if (department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "create-addresses"] },
              },
              raw: true,
            });

            if (!hasRight) {
              throw new RightsError({
                message: "You don't have the neccessary rights!",
              });
            } else {
              unitid = company;
            }
          }

          const {
            postalCode,
            street,
            city,
            addition,
            ...normalData
          } = addressData;
          const address = { street, postalCode, city, addition };

          const newAddress = await models.Address.create(
            { ...normalData, address, unitid },
            { transaction: ta }
          );

          await createLog(ctx, "createAddress", { newAddress }, ta);

          return newAddress;
        } catch (err) {
          if (err instanceof RightsError) {
            throw err;
          } else {
            throw new NormalError({
              message: err.message,
              internalData: { err },
            });
          }
        }
      })
  ),

  updateAddress: requiresRights(["edit-address"]).createResolver(
    async (_p, { address, id }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          let {
            user: { unitid, company },
          } = decode(session.token);

          if (address.department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "edit-addresses"] },
              },
            });

            if (!hasRight) {
              throw new RightsError({
                message: "You don't have the neccessary rights!",
              });
            } else {
              unitid = company;
            }
          }

          const oldAddress = await models.Address.findByPk(id, {
            raw: true,
            transaction: ta,
          });

          const { postalCode, street, city, addition, ...normalData } = address;
          const addressData = { postalCode, street, city, addition };

          const updatedAddress = await models.Address.update(
            {
              ...normalData,
              address: {
                city: addressData.city || oldAddress.address.city,
                street: addressData.street || oldAddress.address.street,
                postalCode:
                  addressData.postalCode || oldAddress.address.postalCode,
                addition: addressData.addition || oldAddress.address.addition,
              },
            },
            { where: { id, unitid }, returning: true, transaction: ta }
          );

          await createLog(
            ctx,
            "updateAddress",
            { oldAddress, updatedAddress: updatedAddress[1][0] },
            ta
          );

          return updatedAddress[1][0];
        } catch (err) {
          if (err instanceof RightsError) {
            throw err;
          } else {
            throw new NormalError({
              message: err.message,
              internalData: { err },
            });
          }
        }
      })
  ),

  deleteAddress: requiresRights(["delete-address"]).createResolver(
    async (_parent, { id, department }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          let {
            user: { unitid, company },
          } = decode(session.token);

          if (department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "delete-addresses"] },
              },
              raw: true,
            });

            if (!hasRight) {
              throw new RightsError({
                message: "You don't have the neccessary rights!",
              });
            } else {
              unitid = company;
            }
          }

          const oldAddress = await models.Address.findOne({
            where: { id, unitid },
          });

          const billingAddress = oldAddress.tags.find(tag => tag == "billing");

          if (billingAddress) {
            throw new Error("You can't delete your billing address!");
          }

          const p1 = models.Address.destroy({
            where: { id, unitid },
            transaction: ta,
          });

          const p2 = createLog(ctx, "deleteAddress", { oldAddress }, ta);

          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          if (err instanceof RightsError) {
            throw err;
          } else {
            throw new NormalError({
              message: err.message,
              internalData: { err },
            });
          }
        }
      })
  ),

  /**
   * Create a new Email
   *
   * @param {string} email
   * @param {boolean} forCompany
   * @param {string[]} tags
   *
   * @returns {object} newEmail The newly generated Email.
   */
  createEmail: requiresRights(["create-email"]).createResolver(
    async (_p, { emailData, forCompany, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { company, unitid },
          } = decode(session.token);

          const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

          if (!emailData.email.match(emailRegex)) {
            throw new Error("This is not a valid email!");
          }

          // Necessary for correct logs
          let id;

          if (forCompany) {
            id = company;
          } else if (userid) {
            id = userid;
          } else {
            id = unitid;
          }

          const emailExists = await models.Email.findOne({
            where: { email: emailData.email },
            raw: true,
          });

          if (emailExists) {
            throw new Error("Email already exists!");
          }

          const newEmail = await models.Email.create(
            { ...emailData, unitid: id },
            { transaction: ta }
          );

          await createLog(ctx, "createEmail", { newEmail }, ta);

          return newEmail;
        } catch (err) {
          throw new Error(err.message);
        }
      })
  ),

  updateEmail: requiresRights(["edit-email"]).createResolver(
    async (_p, { email, emailData }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { company },
          } = decode(session.token);

          const oldEmail = await models.DepartmentEmail.findOne({
            where: { email, departmentid: company },
            raw: true,
          });

          if (!oldEmail) {
            throw new Error("This email doesn't belong to this company");
          }

          const { addTags, removeTags, ...data } = emailData;
          if (addTags) {
            if (oldEmail.tags) {
              data.tags = [...oldEmail.tags, ...addTags];
            } else {
              data.tags = addTags;
            }
          } else if (removeTags) {
            data.tags = oldEmail.tags.filter(tag =>
              removeTags.find(rTag => rTag != tag)
            );
          }

          const updatedEmail = await models.Email.update(
            { ...data },
            {
              where: { email },
              transaction: ta,
              returning: true,
            }
          );

          await createLog(ctx, "createEmail", { oldEmail, updatedEmail }, ta);

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  /**
   * Deletes an existing Email
   * @param {string} email
   * @param {boolean} forCompany
   *
   * @returns {object}
   */
  deleteEmail: requiresRights(["delete-email"]).createResolver(
    async (_p, { email, forCompany, userid }, ctx) => {
      try {
        const { models, session } = ctx;
        const {
          user: { company, unitid },
        } = decode(session.token);

        let id;

        if (forCompany) {
          id = company;
        } else if (userid) {
          id = userid;
        } else {
          id = unitid;
        }

        const p1 = models.Email.findOne({ where: { email, unitid: id } });
        const p2 = models.Email.findAll({ where: { unitid: id } });
        const [belongsToUser, userHasAnotherEmail] = await Promise.all([
          p1,
          p2,
        ]);

        if (!belongsToUser) {
          throw new Error("The email doesn't belong to this user!");
        }

        if (
          !forCompany &&
          (!userHasAnotherEmail || userHasAnotherEmail.length < 2)
        ) {
          throw new Error(
            "This is the users last email address. He needs at least one!"
          );
        }

        await models.Email.destroy({ where: { email, unitid: id } });
        await createLog(ctx, "deleteEmail", { belongsToUser }, "");

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  createPhone: requiresRights(["create-phone"]).createResolver(
    (_p, { phoneData, department, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          let {
            user: { unitid, company },
          } = decode(session.token);

          if (department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "create-phones"] },
              },
            });

            if (!hasRight) {
              throw new RightsError({
                message: "You don't have the neccessary rights!",
              });
            } else {
              unitid = company;
            }
          }

          if (userid) {
            unitid = userid;
          }

          const newPhone = await models.Phone.create(
            { ...phoneData, unitid },
            { transaction: ta }
          );

          await createLog(ctx, "createPhone", { newPhone }, ta);

          return newPhone;
        } catch (err) {
          if (err instanceof RightsError) {
            throw err;
          } else {
            throw new NormalError({
              message: err.message,
              internalData: { err },
            });
          }
        }
      })
  ),

  updatePhone: requiresRights(["edit-phone"]).createResolver(
    async (_p, { phone, id, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          let {
            user: { unitid, company },
          } = decode(session.token);

          if (phone.department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "edit-phones"] },
              },
            });

            if (!hasRight) {
              throw new RightsError({
                message: "You don't have the neccessary rights!",
              });
            } else {
              unitid = company;
            }
          }

          if (userid) {
            unitid = userid;
          }

          const oldPhone = await models.Phone.findByPk(id, {
            raw: true,
            transaction: ta,
          });

          const updatedPhone = await models.Phone.update(
            { ...phone },
            { where: { id, unitid }, returning: true, transaction: ta }
          );

          await createLog(
            ctx,
            "updatePhone",
            { oldPhone, updatedPhone: updatedPhone[1][0] },
            ta
          );

          return updatedPhone[1][0];
        } catch (err) {
          if (err instanceof RightsError) {
            throw err;
          } else {
            throw new NormalError({
              message: err.message,
              internalData: { err },
            });
          }
        }
      })
  ),

  deletePhone: requiresRights(["delete-phone"]).createResolver(
    async (_p, { id, department, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          let {
            user: { unitid, company },
          } = decode(session.token);

          if (department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "delete-phones"] },
              },
              raw: true,
            });

            if (!hasRight) {
              throw new RightsError({
                message: "You don't have the neccessary rights!",
              });
            } else {
              unitid = company;
            }
          }

          if (userid) {
            unitid = userid;
          }

          const oldPhone = await models.Phone.findOne({
            where: { id, unitid },
          });

          const p1 = models.Phone.destroy({
            where: { id, unitid },
            transaction: ta,
          });
          const p2 = createLog(ctx, "deletePhone", { oldPhone }, ta);

          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          if (err instanceof RightsError) {
            throw err;
          } else {
            throw new NormalError({
              message: err.message,
              internalData: { err },
            });
          }
        }
      })
  ),

  newsletterSignup: async (_p, { email, firstname, lastname }, { models }) => {
    try {
      const alreadySignedUp = await models.NewsletterSignup.findOne({
        where: { email },
        raw: true,
      });

      if (!alreadySignedUp) {
        await newsletterSignup(email, firstname, lastname);
      }

      return { ok: true };
    } catch (err) {
      logger.error(err);
      throw new NormalError({
        message: "there was a problem with adding you to our newsletter",
        internalData: { err },
      });
    }
  },

  newsletterSignupConfirm: async (_P, { email, session }) => {
    try {
      const result = await newsletterConfirmSignup(email, session.token);
      return { ok: result };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  searchAddress: async (_p, { input, region }) => {
    try {
      const res = await googleMapsClient
        .findPlace({
          input,
          inputtype: "textquery",
          language: region,
          fields: ["formatted_address", "place_id", "name"],
        })
        .asPromise();

      return res.json;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  contact: async (_p, { contactData }) => {
    try {
      let replyId = "d-8f7a72b8b3b4409ebd02e12dbe6f9599";

      if (contactData.type == "enterprise") {
        replyId = "d-730fe9fdc93242928cbbf19e7c306884";
      } else if (contactData.type == "partners") {
        replyId = "d-6111bb578b044a4e87575dff53d95085";
      }

      const reply = sendEmail({
        templateId: replyId,
        fromName: "VIPFY",
        personalizations: [
          {
            to: [{ email: contactData.email }],
            cc: [{ email: "contact@vipfy.store" }],
            dynamic_template_data: { name: contactData.name },
          },
        ],
      });

      const toVipfy = sendEmail({
        templateId: "d-4e7d8b8200974154bc910adb56b750f7",
        fromName: "VIPFY",
        personalizations: [
          {
            to: [{ email: "contact@vipfy.store" }],
            dynamic_template_data: contactData,
          },
        ],
      });

      await Promise.all([reply, toVipfy]);

      return true;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  showInterest: async (_p, { email, appName, appID }, { models }) => {
    try {
      if (!email.match(emailRegex)) {
        throw new Error("Not a valid email!");
      }
      await models.AppInterest.create({ email, appid: appID });

      await sendEmail({
        templateId: "d-7d0ed02be9df4816a5b82cfd7afb8a4d",
        fromName: "VIPFY Trade Fair Bot (beep beep)",
        personalizations: [
          {
            to: [{ email: "marketplace-interest@vipfy.store" }],
            dynamic_template_data: { email, appName, appID },
          },
        ],
      });

      return true;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  promoCodeRequest: async (_p, args, { models }) =>
    models.sequelize.transaction(async ta => {
      try {
        const { fair, name, email, newsletter } = args;
        const promises = [
          models.TradeFair.create(
            {
              trade_fair: fair,
              name,
              email,
              year: new Date().getFullYear(),
            },
            { transaction: ta }
          ),
        ];

        if (newsletter) {
          const [firstName, ...restName] = name.split(" ");
          const lastName = restName.join(" ");
          promises.push(newsletterSignup(email, firstName, lastName, ta));
        }

        await Promise.all(promises);
        sendEmail({
          templateId: "d-c359cc2705ab45699300584e13c5d70e",
          fromName: "VIPFY Trade Fair Bot (beep beep)",
          personalizations: [
            {
              to: [{ email: "marc@vipfy.store" }],
              dynamic_template_data: { name, email, fair },
            },
          ],
        });

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }),
};
