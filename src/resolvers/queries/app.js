export default {
  allApps: (parent, { first }, { models }) => {
    if (first) {
      return models.AppDetails.findAll().then(res => res.slice(0, first));
    }
    return models.AppDetails.findAll();
  },

  fetchApp: (parent, { name }, { models }) => models.AppDetails.findOne({ where: { name } })
};
