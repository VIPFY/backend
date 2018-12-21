import { decode } from "jsonwebtoken";
import iplocate from "node-iplocate";
import axios from "axios";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  fetchAddresses: requiresRights(["view-addresses"]).createResolver(
    async (parent, { forCompany, tag }, { models, token }) => {
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
          order: [["priority", "ASC"]],
          tags: [tag]
        });

        return addresses;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchEmails: requiresRights(["view-emails"]).createResolver(
    async (parent, { forCompany, tag }, { models, token }) => {
      try {
        const {
          user: { unitid, company }
        } = decode(token);

        const where = { autogenerated: false };

        if (forCompany) {
          where.departmentid = company;
        } else {
          where.emailownerid = unitid;
        }

        const emails = await models.DepartmentEmail.findAll({
          where,
          order: [["priority", "DESC"]],
          tags: [tag]
        });

        return emails;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchPhones: requiresRights(["view-phones"]).createResolver(
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
  ),

  searchAddressByCompanyName: requiresAuth.createResolver(
    async (parent, args, { models, token, ip }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const { name } = await models.Department.findOne({
          where: { unitid: company },
          raw: true
        });

        const parsedName = name.replace(" ", "+");
        const geo = await iplocate(ip);

        const url = `http://places.api.here.com/places/v1/autosuggest?app_id=${
          process.env.HERE_ID
        }&app_code=${process.env.HERE_CODE}&at=${geo.latitude},${
          geo.longitude
        };u=100&q=${parsedName}&result_types=place`;

        const res = await axios.get(url);

        return res.data.results;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
