import { decode } from "jsonwebtoken";
import { weeblyApi } from "../../services/weebly";
import { requiresAuth } from "../../helpers/permissions";

/* eslint-disable default-case */

export default {
  allApps: (parent, { limit, offset, sortOptions }, { models }) =>
    models.AppDetails.findAll({
      limit,
      offset,
      attributes: [
        "id",
        "icon",
        "logo",
        "disabled",
        "name",
        "teaserdescription",
        "features",
        "cheapestprice",
        "avgstars",
        "cheapestpromo"
      ],
      order: sortOptions ? [[sortOptions.name, sortOptions.order]] : ""
    }),

  fetchApp: (parent, { name }, { models }) => models.AppDetails.findOne({ where: { name } }),
  fetchAppById: (parent, { id }, { models }) => models.AppDetails.findById(id),

  // Not needed till now, maybe delete
  fetchUserApps: async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);
      const licences = await models.Licence.findAll({ where: { unitid } });

      return licences;
    } catch ({ message }) {
      throw new Error(message);
    }
  },

  fetchLicences: requiresAuth.createResolver(
    async (parent, { boughtplanid }, { models, token }) => {
      const startTime = Date.now();
      try {
        const {
          user: { unitid }
        } = decode(token);
        let findLicences;

        if (boughtplanid) {
          findLicences = await models.Licence.findAll({ where: { unitid, boughtplanid } });
        } else {
          findLicences = await models.Licence.findAll({
            where: { unitid }
          });
        }

        const licences = findLicences.get();

        await licences.forEach(licence => {
          if (licence.disabled) {
            licence.set({ agreed: false, key: null });
          }

          if (Date.parse(licence.starttime) > startTime || !licence.agreed) {
            licence.set({ key: null });
          }

          if (licence.endtime) {
            if (Date.parse(licence.endtime) < startTime) {
              licence.set({ key: null });
            }
          }

          if (licence.key.needsloginlink) {
            switch (licence.key.appid) {
              case 2: {
                if (licence.unitid != unitid) {
                  throw new Error("This licence doesn't belong to this user!");
                }

                const endpoint = `user/${licence.key.weeblyid}/loginLink`;
                // res = await weeblyApi("POST", endpoint, "");
                weeblyApi("POST", endpoint, "")
                  .then(res => licence.set({ key: { loginlink: res.link } }))
                  .catch(err => console.log(err));
              }
            }
          }
        });

        return licences;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  // change to requiresAdmin in Production!
  createLoginLink: requiresAuth.createResolver(async (parent, { licenceid }, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);
      let res;

      const licenceBelongsToUser = await models.Licence.findOne({
        where: { unitid, id: licenceid }
      });

      if (!licenceBelongsToUser) {
        throw new Error("This licence doesn't belong to this user!");
      }

      const credentials = licenceBelongsToUser.get("key");

      if (credentials.weeblyid) {
        const endpoint = `user/${credentials.weeblyid}/loginLink`;
        res = await weeblyApi("POST", endpoint, "");
      }

      return {
        ok: true,
        loginLink: res.link
      };
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
