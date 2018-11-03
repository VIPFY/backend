import { decode } from "jsonwebtoken";
import geoip from "geoip-country";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";
import {
  newsletterSignup,
  newsletterConfirmSignup
} from "../../helpers/newsletter";
import logger from "../../loggers";
import { googleMapsClient } from "../../services/gcloud";

/* eslint-disable prefer-const */

export default {
  createAddress: requiresRights(["create-address"]).createResolver(
    (parent, { addressData, department }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          let {
            user: { unitid, company }
          } = decode(token);

          if (department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "create-addresses"] }
              }
            });

            if (!hasRight) {
              throw new Error("You don't have the necessary rights!");
            } else {
              unitid = company;
            }
          }

          const { zip, street, city, ...normalData } = addressData;
          const address = { street, zip, city };
          // Remove main
          const newAddress = await models.Address.create(
            { ...normalData, address, unitid },
            { transaction: ta }
          );

          await createLog(ip, "createAddress", { newAddress }, unitid, ta);

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
    async (parent, { address, id }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
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
            ip,
            "updateAddress",
            { oldAddress, updatedAddress: updatedAddress[1][0] },
            unitid,
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
    async (parent, { id, department }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
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

          const p2 = createLog(ip, "deleteAddress", { oldAddress }, unitid, ta);

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
    async (parent, { emailData, forCompany }, { models, ip, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company, unitid }
          } = decode(token);

          // Necessary for correct logs
          let id;

          if (forCompany) {
            id = company;
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

          await createLog(ip, "createEmail", { newEmail }, unitid, ta);

          return newEmail;
        } catch (err) {
          throw new Error(err.message);
        }
      })
  ),

  updateEmail: requiresRights(["edit-email"]).createResolver(
    async (parent, { email, emailData }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
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

          await createLog(
            ip,
            "createEmail",
            { oldEmail, updatedEmail },
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

  /**
   * Deletes an existing Email
   * @param {string} email
   * @param {boolean} forCompany
   *
   * @returns {object}
   */
  deleteEmail: requiresRights(["delete-email"]).createResolver(
    async (parent, { email, forCompany }, { models, ip, token }) => {
      try {
        const {
          user: { company, unitid }
        } = decode(token);

        let id;

        if (forCompany) {
          id = company;
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

        if (!userHasAnotherEmail || userHasAnotherEmail.length < 2) {
          throw new Error(
            "This is the users last email address. He needs at least one!"
          );
        }

        await models.Email.destroy({ where: { email, unitid: id } });
        await createLog(ip, "deleteEmail", { belongsToUser }, unitid, "");

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  createPhone: requiresRights(["create-phone"]).createResolver(
    (parent, { phoneData, department }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
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

          const newPhone = await models.Phone.create(
            { ...phoneData, unitid },
            { transaction: ta }
          );

          await createLog(ip, "createPhone", { newPhone }, unitid, ta);

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
    async (parent, { phone, id }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
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

          const oldPhone = await models.Phone.findById(id, {
            raw: true,
            transaction: ta
          });

          const updatedPhone = await models.Phone.update(
            { ...phone },
            { where: { id, unitid }, returning: true, transaction: ta }
          );

          await createLog(
            ip,
            "updatePhone",
            { oldPhone, updatedPhone: updatedPhone[1][0] },
            unitid,
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
    async (parent, { id, department }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
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

          const oldPhone = await models.Phone.findOne({
            where: { id, unitid }
          });

          const p1 = models.Phone.destroy({
            where: { id, unitid },
            transaction: ta
          });
          const p2 = createLog(ip, "deletePhone", { oldPhone }, unitid, ta);

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

  newsletterSignup: async (
    parent,
    { email, firstname, lastname },
    { models }
  ) => {
    try {
      await newsletterSignup(models, email, firstname, lastname);
      return { ok: true };
    } catch (err) {
      logger.error(err);
      throw new NormalError({
        message: "there was a problem with adding you to our newsletter",
        internalData: { err }
      });
    }
  },

  newsletterSignupConfirm: async (parent, { email, token }, { models }) => {
    try {
      const result = await newsletterConfirmSignup(models, email, token);
      return { ok: result };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  searchAddressByCompanyName: async (parent, { input }, { ip }) => {
    try {
      const config = { input };
      const geo = geoip.lookup(ip);

      if (geo && geo.range) {
        config.location = {
          latitude: geo.range[0],
          longitude: geo.range[1]
        };
      }

      if (geo && geo.country) {
        config.language = geo.country;
      }

      const res = await googleMapsClient
        .placesQueryAutoComplete(config)
        .asPromise();

      return res.json.predictions;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  searchAddress: async (parent, { input, region }) => {
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
  }
};
