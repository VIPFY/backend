import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";

export default {
  createAddress: requiresAuth.createResolver((parent, { addressData }, { models, token, ip }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const { zip, street, city, ...normalData } = addressData;
        const address = { street, zip, city };

        await models.Address.create({ ...normalData, address, unitid }, { transaction: ta });
        await createLog(ip, "createAddress", { addressData }, unitid, ta);

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    })
  ),

  updateAddress: requiresAuth.createResolver(async (parent, args, { models, token, ip }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        let logArgs;

        if (!args.id) {
          const newAddress = await models.Address.create({ unitid, ...args }, { transaction: ta });
          logArgs = { newAddress };
        } else {
          const oldAddress = await models.Address.findById(args.id, { raw: true, transaction: ta });
          const updatedAddress = await models.Address.update(
            { ...args },
            { where: { id: args.id }, returning: true, transaction: ta }
          );

          logArgs = { oldAddress, updatedAddress: updatedAddress[1] };
        }

        await createLog(ip, "updateAddress", logArgs, unitid, ta);

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    })
  )
};
