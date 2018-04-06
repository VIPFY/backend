import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  fetchAddresses: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    const { user: { unitid } } = decode(token);

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
