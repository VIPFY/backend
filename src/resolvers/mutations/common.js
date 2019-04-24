// This file contains common operations which don't belong to a specific Component
import { decode } from "jsonwebtoken";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import {
  checkVat,
  createLog,
  createNotification
} from "../../helpers/functions";
/* eslint-disable consistent-return, no-unused-vars */

export default {
  checkEmail: async (parent, { email }, { models }) => {
    if (!email) return { ok: true };

    try {
      const emailExists = await models.Email.findOne({ where: { email } });

      if (emailExists) {
        throw new Error("There already exists an account with this email");
      }

      return { ok: true };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  readNotification: requiresAuth.createResolver(
    async (parent, { id }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        await models.Notification.update(
          { readtime: models.sequelize.fn("NOW") },
          { where: { receiver: unitid, id } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  readAllNotifications: requiresAuth.createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        await models.Notification.update(
          { readtime: models.sequelize.fn("NOW") },
          { where: { receiver: unitid, readtime: { [models.Op.eq]: null } } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  checkName: requiresAuth.createResolver(
    async (parent, { name }, { models }) => {
      if (!name) return { ok: true };

      try {
        const nameExists = await models.App.findOne({
          where: { name: { [models.sequelize.Op.iLike]: `%${name}` } }
        });

        if (nameExists) {
          throw new Error("There already exists an app with this name");
        }

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  ping: async (parent, args, context) => ({ ok: true }),

  checkVat: async (parent, { vat, cc }) => {
    try {
      if (vat.substr(0, 2) != cc) {
        throw new Error("Prefix doesn't match with provided country");
      }

      const vatNumber = vat.substr(2).trim();

      const checkedData = await checkVat(cc, vatNumber);

      return checkedData.name;
    } catch (err) {
      throw new Error("Invalid Vatnumber!");
    }
  },

  /**
   * Removes a tag from an email
   *
   * @param {string} email
   * @param {string} tag
   *
   * @returns {boolean}
   */
  addEmailTag: requiresRights(["edit-billing"]).createResolver(
    async (parent, { email, tag }, { models, token, ip }) => {
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

        let tags = [tag];
        if (oldEmail.tags) {
          // eslint-disable-next-line
          tags = oldEmail.tags;
          tags.push(tag);
        }

        await models.Email.update({ tags }, { where: { email } });

        await createLog(ip, "addEmailTag", { oldEmail }, unitid, "");

        return true;
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  ),

  /**
   * Removes a tag from an email
   *
   * @param {string} email
   * @param {string} tag
   *
   * @returns {object}
   */
  removeEmailTag: requiresRights(["edit-email"]).createResolver(
    async (parent, { email, tag }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);

        try {
          const emails = await models.DepartmentEmail.findAll({
            where: {
              tags: { [models.sequelize.Op.contains]: [tag] },
              departmentid: company
            },
            raw: true
          });

          if (tag == "billing" && emails.length < 2) {
            throw new Error("You need at least one billing Email");
          }

          const oldEmail = emails.find(bill => bill.email == email);

          if (!oldEmail) {
            throw new Error(
              `Couldn't find email in database or email is not a ${tag} billing email`
            );
          }

          const tags = oldEmail.tags.filter(emailTag => emailTag != tag);

          const updatedEmail = await models.Email.update(
            { tags },
            {
              where: { email },
              returning: true,
              transaction: ta
            }
          );

          const p3 = createLog(
            ip,
            "removeEmailTag",
            { updatedEmail },
            unitid,
            ta
          );

          const p4 = createNotification(
            {
              receiver: unitid,
              message: `Removed ${tag} Email`,
              icon: "envelope",
              link: "email",
              changed: ["emails"]
            },
            ta
          );

          await Promise.all([p3, p4]);

          return true;
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: `Removing of ${tag} Email failed`,
              icon: "bug",
              link: "billing",
              changed: ["emails"]
            },
            ""
          );

          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),
  logSSOError: async (parent, { eventdata }, { models, ip }) => {
    try {
      console.error(eventdata);

      await models.Log.create({
        ip,
        eventtype: "logSSOError",
        eventdata,
        user: null
      });

      return true;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }
};
