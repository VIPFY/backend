import { decode } from "jsonwebtoken";
import { requiresAuth, requiresVipfyAdmin } from "../../helpers/permissions";

export default {
  adminCreateAddress: requiresVipfyAdmin.createResolver(
    async (parent, { addressData, unitid }, { models }) => {
      try {
        const { zip, street, city, ...normalData } = addressData;
        const address = { street, zip, city };

        await models.Address.create({ ...normalData, address, unitid });

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  updateAddress: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { unitid } } = decode(token);
      if (!args.id) {
        await models.Address.create({ unitid, ...args });

        return { ok: true };
      }

      await models.Address.update({ ...args }, { where: { id: args.id } });

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  adminUpdateAddress: requiresVipfyAdmin.createResolver(
    async (parent, { addressData, id }, { models }) => {
      const { zip, city, street } = addressData;

      try {
        if (zip || city || street) {
          const old = await models.Address.findOne({ where: { id } });
          const newAddress = { ...old.address, ...addressData };

          await models.Address.update({ address: { ...newAddress } }, { where: { id } });
        } else await models.Address.update({ ...addressData }, { where: { id } });

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  adminCreateEmail: requiresVipfyAdmin.createResolver(
    async (parent, { email, unitid }, { models }) => {
      try {
        const emailExists = await models.Email.findOne({ where: { email } });
        if (emailExists) {
          throw new Error("Email already exists!");
        }

        const userHasAnotherEmail = await models.Email.findAll({ where: { unitid } });
        if (!userHasAnotherEmail || userHasAnotherEmail.length < 2) {
          throw new Error("This is the users last email address. He needs at least one!");
        }
        await models.Email.create({ email, unitid });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
