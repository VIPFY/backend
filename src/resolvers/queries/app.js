export default {
  allApps: (parent, { first }, { models }) => {
    if (first) {
      return models.App.findAll().then(res => res.slice(0, first));
    }
    return models.App.findAll();
  },

  fetchApp: (parent, { name }, { models }) => models.App.findOne({ where: { name } })
};
