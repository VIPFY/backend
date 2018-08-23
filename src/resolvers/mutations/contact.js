import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";

export default {
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
          const p1 = models.Address.findById(args.id, { raw: true, transaction: ta });
          const p2 = models.Address.update(
            { ...args },
            { where: { id: args.id }, returning: true, transaction: ta }
          );

          const [oldAddress, updatedAddress] = await Promise.all([p1, p2]);
          logArgs = { oldAddress, updatedAddress: updatedAddress[1] };
        }

        await createLog(ip, "updateAddress", logArgs, unitid, ta);

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    })
  )
};
