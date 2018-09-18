import { decode } from "jsonwebtoken";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";
import { checkCompanyMembership } from "../../helpers/companyMembership";

/* eslint-disable prefer-const */

export default {
  createAddress: requiresRights(["create-addresses"]).createResolver(
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

  updateAddress: requiresRights(["edit-addresses"]).createResolver(
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
                type: { [models.Op.or]: ["admin", "editaddress"] }
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

          await checkCompanyMembership(models, company, oldAddress.unitid);

          const updatedAddress = await models.Address.update(
            { ...address },
            { where: { id }, returning: true, transaction: ta }
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

  deleteAddress: requiresRights(["delete-addresses"]).createResolver(
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
            },
            raw: true
          });

          if (!hasRight) {
            throw new Error("You don't have the necessary rights!");
          } else {
            unitid = company;
          }
        }

        await models.Address.destroy({ where: { id, unitid } });

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
