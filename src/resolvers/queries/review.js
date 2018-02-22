export default {
  allReviews: (parent, args, { models }) => models.Review.findAll(),

  fetchReview: (parent, { appid }, { models }) => models.Review.findAll({ where: { appid } }),

  fetchPlans: (parent, { appid }, { models }) => models.Plan.findAll({ where: { appid } }),

  fetchPrice: (parent, { appid }, { models }) => models.Plan.findOne({ where: { appid } })
};
