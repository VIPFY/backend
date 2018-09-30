import { requiresRights } from "../../helpers/permissions";

export default {
  allReviews: requiresRights(["view-apps"]).createResolver(
    (parent, args, { models }) => models.Review.findAll()
  ),

  fetchReviews: requiresRights(["view-apps"]).createResolver(
    async (parent, { appid }, { models }) => {
      const reviews = await models.Review.findAll({
        where: { appid },
        attributes: { include: [["unitid", "reviewer"]] }
      });

      return reviews;
    }
  )
};
