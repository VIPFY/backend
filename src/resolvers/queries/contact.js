import { decode } from "jsonwebtoken";
import { requiresAuth, requiresVipfyAdmin } from "../../helpers/permissions";

export default {
  fetchAddresses: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { unitid, company } } = decode(token);

      const addresses = await models.Address.findAll({
        where: { unitid: [unitid, company] },
        order: [["priority", "ASC"]]
      });

      return addresses;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  fetchUserAddresses: requiresVipfyAdmin.createResolver(async (parent, { unitid }, { models }) => {
    try {
      const addresses = await models.Address.findAll({
        where: { unitid },
        order: [["priority", "ASC"]]
      });

      return addresses;
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
