export const findUser = {
  user: (parent, args, { models }) => models.User.findById(parent.userid)
};

export const findApp = {
  app: (parent, args, { models }) => models.App.findById(parent.appid)
};
