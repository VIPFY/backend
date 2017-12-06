export default {
  user: (employee, args, { models }) => models.User.findById(employee.userid)
};
