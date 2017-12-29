export default {
  allReviews: (parent, args, { models }) => models.Review.findAll(),

  fetchReview: (parent, args, { models }) =>
    models.Review.findAll({ where: { appid: args.appid } }),

  fetchPlans: (parent, { appid }, { models }) =>
    models.Plan.findAll({ where: { appid } }),

  fetchPrice: (parent, { appid }, { models }) =>
    models.Plan.findOne({ where: { appid } })
};
