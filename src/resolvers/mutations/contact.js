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
                type: { [models.Op.or]: ["admin", "createAddress"] }
              }
            });

            if (!hasRight) {
              throw new Error("You don't have the necessary rights!");
            } else {
              unitid = company;
            }
          }

          const { zip, street, city, tags, ...normalData } = addressData;
          const address = { street, zip, city };
          // Remove main
          const newAddress = await models.Address.create(
            { ...normalData, address, unitid, tags },
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
    async (parent, args, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          let {
            user: { unitid, company }
          } = decode(token);

          let logArgs;
          let address;

          if (args.department) {
            const hasRight = await models.Right.findOne({
              where: {
                holder: unitid,
                forunit: { [models.Op.or]: [company, null] },
                type: { [models.Op.or]: ["admin", "editaddress"] }
              }
            });

            if (!hasRight) {
              throw new Error("You don't have the necessary rights!");
            } else {
              unitid = company;
            }
          }

          if (!args.id) {
            const newAddress = await models.Address.create(
              { unitid, ...args },
              { transaction: ta }
            );
            logArgs = { newAddress };
            address = newAddress;
          } else {
            const oldAddress = await models.Address.findById(args.id, {
              raw: true,
              transaction: ta
            });
            const updatedAddress = await models.Address.update(
              { ...args },
              { where: { id: args.id }, returning: true, transaction: ta }
            );

            // eslint-disable-next-line
            address = updatedAddress[1];
            logArgs = { oldAddress, updatedAddress: updatedAddress[1] };
          }

          await createLog(ip, "updateAddress", logArgs, unitid, ta);

          return address;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  deleteAddress: requiresAuth.createResolver(
    async (parent, { id, department }, { models, token }) => {
      try {
        let {
          user: { unitid, company }
        } = decode(token);

        if (department) {
          const hasRight = await models.Right.findOne({
            where: {
              holder: unitid,
              forunit: { [models.Op.or]: [company, null] },
              type: { [models.Op.or]: ["admin", "editaddress"] }
            }
          });

          if (!hasRight) {
            throw new Error("You don't have the necessary rights!");
          } else {
            unitid = company;
          }
        } else await models.Address.destroy({ where: { id, unitid } });

        return { ok: true };
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  )
};
