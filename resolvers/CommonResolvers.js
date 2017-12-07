export const findUser = {
  user: (parent, args, { models }) => models.User.findById(parent.userid)
};
