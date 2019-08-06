import { decode } from "jsonwebtoken";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";
import {
  newsletterSignup,
  newsletterConfirmSignup
} from "../../helpers/newsletter";
import logger from "../../loggers";
import { googleMapsClient } from "../../services/gcloud";
import { sendEmail } from "../../helpers/email";

/* eslint-disable prefer-const */

export default {
  createAddress: requiresRights(["create-address"]).createResolver(
    (_p, { addressData, department }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;
          let {
            user: { unitid, company }
          } = decode(token);

          if (department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "create-addresses"] }
              },
              raw: true
            });

            if (!hasRight) {
              throw new Error("You don't have the necessary rights!");
            } else {
              unitid = company;
            }
          }

          const { zip, street, city, ...normalData } = addressData;
          const address = { street, zip, city };

          const newAddress = await models.Address.create(
            { ...normalData, address, unitid },
            { transaction: ta }
          );

          await createLog(ctx, "createAddress", { newAddress }, ta);

          return newAddress;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateAddress: requiresRights(["edit-address"]).createResolver(
    async (_p, { address, id }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;

          let {
            user: { unitid, company }
          } = decode(token);

          if (address.department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "edit-addresses"] }
              }
            });

            if (!hasRight) {
              throw new Error("You don't have the necessary rights!");
            } else {
              unitid = company;
            }
          }

          const oldAddress = await models.Address.findById(id, {
            raw: true,
            transaction: ta
          });

          const { zip, street, city, ...normalData } = address;
          const addressData = { zip, street, city };

          const updatedAddress = await models.Address.update(
            {
              ...normalData,
              address: { ...oldAddress.address, ...addressData }
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
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  deleteAddress: requiresRights(["delete-address"]).createResolver(
    async (parent, { id, department }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;
          let {
            user: { unitid, company }
          } = decode(token);

          if (department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "delete-addresses"] }
              },
              raw: true
            });

            if (!hasRight) {
              throw new Error("You don't have the necessary rights!");
            } else {
              unitid = company;
            }
          }

          const oldAddress = await models.Phone.findOne({
            where: { id, unitid }
          });

          const p1 = models.Address.destroy({
            where: { id, unitid },
            transaction: ta
          });

          const p2 = createLog(ctx, "deleteAddress", { oldAddress }, ta);

          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
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
          const { models, token } = ctx;
          const {
            user: { company, unitid }
          } = decode(token);

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
            raw: true
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
    async (_p, { email, emailData, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;

          const {
            user: { company }
          } = decode(token);

          const oldEmail = await models.DepartmentEmail.findOne({
            where: { email, departmentid: company },
            raw: true
          });

          if (!oldEmail) {
            throw new Error("This email doesn't belong to this company");
          }

          const updatedEmail = await models.Email.update(
            { ...emailData },
            { where: { email }, transaction: ta, returning: true }
          );

          await createLog(ctx, "createEmail", { oldEmail, updatedEmail }, ta);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateEmail08: requiresRights(["edit-email"]).createResolver(
    async (_p, { email, emailData, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;

          const {
            user: { unitid, company }
          } = decode(token);

          const oldEmail = await models.DepartmentEmail.findOne({
            where: { email, departmentid: company },
            raw: true
          });

          if (!oldEmail) {
            throw new Error("This email doesn't belong to this company");
          }

          const updatedEmail = await models.Email.update(
            { ...emailData },
            { where: { email }, transaction: ta, returning: true }
          );

          await createLog(ctx, "createEmail", { oldEmail, updatedEmail }, ta);

          return updatedEmail[1][0];
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
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
        const { models, token } = ctx;
        const {
          user: { company, unitid }
        } = decode(token);

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
          p2
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
        await createLog(ctx, "deleteEmail", { belongsToUser }, unitid, "");

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
          const { models, token } = ctx;
          let {
            user: { unitid, company }
          } = decode(token);

          if (department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "create-phones"] }
              }
            });

            if (!hasRight) {
              throw new Error("You don't have the necessary rights!");
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
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updatePhone: requiresRights(["edit-phone"]).createResolver(
    async (_p, { phone, id, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;

          let {
            user: { unitid, company }
          } = decode(token);

          if (phone.department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "edit-phones"] }
              }
            });

            if (!hasRight) {
              throw new Error("You don't have the necessary rights!");
            } else {
              unitid = company;
            }
          }

          if (userid) {
            unitid = userid;
          }

          const oldPhone = await models.Phone.findById(id, {
            raw: true,
            transaction: ta
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
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  deletePhone: requiresRights(["delete-phone"]).createResolver(
    async (_p, { id, department, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;
          let {
            user: { unitid, company }
          } = decode(token);

          if (department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "delete-phones"] }
              },
              raw: true
            });

            if (!hasRight) {
              throw new Error("You don't have the necessary rights!");
            } else {
              unitid = company;
            }
          }

          if (userid) {
            unitid = userid;
          }

          const oldPhone = await models.Phone.findOne({
            where: { id, unitid }
          });

          const p1 = models.Phone.destroy({
            where: { id, unitid },
            transaction: ta
          });
          const p2 = createLog(ctx, "deletePhone", { oldPhone }, ta);

          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  newsletterSignup: async (_, { email, firstname, lastname }, { models }) => {
    try {
      const alreadySignedUp = await models.NewsletterSignup.findOne({
        where: { email },
        raw: true
      });

      if (!alreadySignedUp) {
        await newsletterSignup(email, firstname, lastname);
      }

      return { ok: true };
    } catch (err) {
      logger.error(err);
      throw new NormalError({
        message: "there was a problem with adding you to our newsletter",
        internalData: { err }
      });
    }
  },

  newsletterSignupConfirm: async (_, { email, token }) => {
    try {
      const result = await newsletterConfirmSignup(email, token);
      return { ok: result };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  searchAddress: async (_, { input, region }) => {
    try {
      const res = await googleMapsClient
        .findPlace({
          input,
          inputtype: "textquery",
          language: region,
          fields: ["formatted_address", "place_id", "name"]
        })
        .asPromise();

      return res.json;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  contact: async (parent, args) => {
    try {
      let replyId = "d-8f7a72b8b3b4409ebd02e12dbe6f9599";

      if (args.type == "enterprise") {
        replyId = "d-730fe9fdc93242928cbbf19e7c306884";
      } else if (args.type == "partners") {
        replyId = "d-6111bb578b044a4e87575dff53d95085";
      }

      const reply = sendEmail({
        templateId: replyId,
        fromName: "VIPFY",
        personalizations: [
          {
            to: [{ email: args.email }],
            cc: [{ email: "contact@vipfy.store" }],
            dynamic_template_data: { name: args.name }
          }
        ]
      });

      const toVipfy = sendEmail({
        templateId: "d-4e7d8b8200974154bc910adb56b750f7",
        fromName: "VIPFY",
        personalizations: [
          {
            to: [{ email: "contact@vipfy.store" }],
            dynamic_template_data: args
          }
        ]
      });

      await Promise.all([reply, toVipfy]);

      return true;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }
};
