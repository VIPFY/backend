export default {
  allUsers: (parent, args, { models }) => models.User.findAll(),
  me: (parent, args, { models, user }) => {
    console.log(user);
    if (user) {
      // they are logged in
      return models.User.findOne({
        where: {
          id: user.id
        }
      });
    }
    // not logged in user
    return null;
  },
  allApps: (parent, args, { models }) => models.App.findAll(),
  allDevelopers: (parent, args, { models }) => models.Developer.findAll(),
  allReviews: (parent, args, { models }) => models.Review.findAll(),
  allAppImages: (parent, args, { models }) => models.AppImage.findAll(),
  fetchUser: (parent, { id }, { models }) => models.User.findById(id),
  fetchApp: (parent, { name }, { models }) =>
    models.App.findOne({
      where: {
        name
      }
    }),
  fetchDeveloper: (parent, { id }, { models }) => models.Developer.findById(id),
  fetchReview: (parent, args, { models }) =>
    models.Review.findAll({
      where: {
        appid: args.appid
      }
    }),
  fetchAppImages: (parent, { appid }, { models }) =>
    models.AppImage.findAll({
      where: {
        appid
      }
    })
};
