import { decode } from "jsonwebtoken";
import axios from "axios";
import iplocate from "node-iplocate";
import { googleMapsClient } from "../../services/gcloud";
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

        const { name: input } = await models.Department.findOne({
          where: { unitid: company },
          raw: true
        });

        // const geo = await iplocate(ip);
        const geo = {
          longitude: 1.34234234,
          latitude: -24.8988,
          country_code: "DE"
        };
        if (geo && geo.latitude) {
          const config = {
            query: input,
            region: geo.country_code,
            location: {
              latitude: geo.latitude,
              longitude: geo.longitude
            },
            radius: 1000
          };

          const { json } = await googleMapsClient.places(config).asPromise();
          console.log(json);
          const results = json.results.map(e => ({
            ...e,
            description: `${e.name}, ${e.formatted_address}`
          }));

          if (results.length < 1) {
            const hereUrl =
              "https://places.cit.api.here.com/places/v1/autosuggest";

            const here = await axios.get(hereUrl, {
              params: {
                app_id: process.env.HERE_ID,
                app_code: process.env.HERE_CODE,
                at: "41.8369,-87.6840",
                q: input,
                result_types: "place, chain"
              }
            });

            return here.data.results;
          }

          return results;
        } else {
          const res = await googleMapsClient
            .placesQueryAutoComplete({ input })
            .asPromise();
          return res.json.predictions;
        }
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
