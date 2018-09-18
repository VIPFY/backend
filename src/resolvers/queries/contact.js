import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  fetchAddresses: requiresAuth.createResolver(
    async (parent, { forCompany }, { models, token }) => {
      try {
        let {
          // eslint-disable-next-line
          user: { unitid, company }
        } = decode(token);

        if (forCompany) {
          unitid = company;
        }

        const addresses = await models.Address.findAll({
          where: { unitid },
          order: [["priority", "ASC"]]
        });

        return addresses;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchPhones: requiresAuth.createResolver(
    async (parent, { forCompany }, { models, token }) => {
      try {
        let {
          // eslint-disable-next-line
          user: { unitid, company }
        } = decode(token);

        if (forCompany) {
          unitid = company;
        }

        const phones = await models.Phone.findAll({
          where: { unitid },
          order: [["priority", "ASC"]]
        });

        return phones;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
