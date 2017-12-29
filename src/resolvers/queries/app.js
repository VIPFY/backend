export default {
  allApps: (parent, { first }, { models }) => {
    if (first) {
      return models.App.findAll().then(res => res.slice(0, first));
    } else return models.App.findAll();
  },

  allAppImages: (parent, args, { models }) => models.AppImage.findAll(),

  fetchApp: (parent, { name }, { models }) =>
    models.App.findOne({ where: { name } }),

  fetchAppImages: (parent, { appid }, { models }) =>
    models.AppImage.findAll({ where: { appid } }),

  allDevelopers: (parent, args, { models }) => models.Developer.findAll(),

  fetchDeveloper: (parent, { id }, { models }) => models.Developer.findById(id)
};
