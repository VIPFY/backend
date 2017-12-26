export const findUser = {
  user: ({ userid }, args, { models }) => models.User.findById(userid)
};

export const findApp = {
  app: ({ appid }, args, { models }) => models.App.findById(appid)
};

export const findUserNotification = {
  touser: ({ touser }, args, { models }) => models.User.findById(touser),
  fromuser: ({ fromuser }, args, { models }) => models.User.findById(fromuser)
};

export const findAppNotification = {
  touser: ({ touser }, args, { models }) => models.User.findById(touser),
  fromapp: ({ fromapp }, args, { models }) => models.App.findById(fromapp)
};
