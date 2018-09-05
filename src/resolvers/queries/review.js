export default {
  allReviews: (parent, args, { models }) => models.Review.findAll(),

  fetchReviews: async (parent, { appid }, { models }) => {
    const reviews = await models.Review.findAll({
      where: { appid },
      attributes: { include: [["unitid", "reviewer"]] }
    });

    return reviews;
  }
};
