import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";

/* eslint-disable prefer-const */

export default {
  createAddress: requiresAuth.createResolver(
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

          await createLog(ip, "createaddress", { newAddress }, unitid, ta);

          return newAddress;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateAddress: requiresAuth.createResolver(
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

  deleteAddress: requiresAuth.createResolver(
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

  createPhone: requiresAuth.createResolver(
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

  updatePhone: requiresAuth.createResolver(
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

  deletePhone: requiresAuth.createResolver(
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
  )
};
