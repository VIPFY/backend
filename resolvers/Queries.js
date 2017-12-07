import { requiresAuth } from "../helpers/permissions";

export default {
  allUsers: requiresAuth.createResolver((parent, args, { models }) =>
    models.User.findAll()
  ),
  me: requiresAuth.createResolver((parent, args, { models, user }) => {
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
  }),
  allApps: (parent, args, { models }) => models.App.findAll(),
  allCompanies: (parent, args, { models }) => models.Company.findAll(),
  allDepartments: (parent, args, { models }) => models.Department.findAll(),
  allEmployees: (parent, args, { models }) => models.Employee.findAll(),
  allDevelopers: (parent, args, { models }) => models.Developer.findAll(),
  fetchDepartmentsByCompanyId: (parent, { companyId }, { models }) =>
    models.Department.findAll({
      where: { companyid: companyId }
    }),
  allReviews: (parent, args, { models }) => models.Review.findAll(),
  allAppImages: (parent, args, { models }) => models.AppImage.findAll(),
  allUserRights: (parent, args, { models }) => models.UserRight.findAll(),
  fetchUser: requiresAuth.createResolver((parent, { id }, { models }) =>
    models.User.findById(id)
  ),
  fetchUserByPassword: async (parent, { password }, { models }) => {
    const user = await models.User.findOne({
      where: { password, userstatus: "toverify" }
    });
    return user.dataValues.email;
  },
  fetchApp: (parent, { name }, { models }) =>
    models.App.findOne({
      where: {
        name
      }
    }),
  fetchDeveloper: (parent, { id }, { models }) => models.Developer.findById(id),
  fetchCompany: (parent, { id }, { models }) => models.Company.findById(id),
  fetchDepartment: (parent, { departmentId }, { models }) =>
    models.Department.findById(departmentId),
  fetchEmployee: (parent, { userId }, { models }) =>
    models.Employee.findOne({
      where: { userid: userId }
    }),
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
    }),
  fetchUserRights: (parent, { userid }, { models }) =>
    models.UserRight.findAll({
      where: { userid }
    })
};
