export default {
  user: (review, args, { models }) => models.User.findById(review.userid)
};
