import { decode } from "jsonwebtoken";

export default {
  allApps: (parent, args, { models }) =>
    models.AppDetails.findAll({
      attributes: [
        "id",
        "logo",
        "name",
        "teaserdescription",
        "features",
        "cheapestprice",
        "avgstars",
        "cheapestpromo"
      ]
    }),

  fetchApp: (parent, { name }, { models }) => models.AppDetails.findOne({ where: { name } }),
  fetchAppById: (parent, { id }, { models }) => models.AppDetails.findById(id),

  // Not needed till now, maybe delete
  fetchUserApps: async (parent, args, { models, token }) => {
    try {
      const { user: { unitid } } = decode(token);
      const licences = await models.Licence.findAll({ where: { unitid } });

      return licences;
    } catch ({ message }) {
      throw new Error(message);
    }
  }
};
