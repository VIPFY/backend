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
  allDepartments: requiresAuth.createResolver((parent, args, { models }) =>
    models.Department.findAll()
  ),
  allEmployees: requiresAuth.createResolver((parent, args, { models }) =>
    models.Employee.findAll()
  ),
  allDevelopers: (parent, args, { models }) => models.Developer.findAll(),
  fetchDepartmentsByCompanyId: requiresAuth.createResolver(
    (parent, { companyId }, { models }) =>
      models.Department.findAll({
        where: { companyid: companyId }
      })
  ),
  allReviews: (parent, args, { models }) => models.Review.findAll(),
  allAppImages: (parent, args, { models }) => models.AppImage.findAll(),
  allUserRights: requiresAuth.createResolver((parent, args, { models }) =>
    models.UserRight.findAll()
  ),
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
  fetchEmployee: requiresAuth.createResolver((parent, { userId }, { models }) =>
    models.Employee.findOne({
      where: { userid: userId }
    })
  ),
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
  fetchUserRights: requiresAuth.createResolver(
    (parent, { userid }, { models }) =>
      models.UserRight.findAll({
        where: { userid }
      })
  ),
  fetchPlans: (parent, { appid }, { models }) =>
    models.Plan.findAll({ where: { appid } }),
  fetchPrice: (parent, { appid }, { models }) =>
    models.Plan.findOne({ where: { appid } }),

  // Notifcation Queries
  fetchSentNotifications: (parent, { userid }, { models }) =>
    models.Notification.findAll({ where: { fromuser: userid } }),

  fetchReceivedNotifications: (parent, { userid, sender }, { models }) => {
    if (sender == "User") {
      console.log(sender);
      return models.Notification.findAll({ where: { touser: userid } });
    } else if (sender == "App") {
      return models.AppNotification.findAll({ where: { touser: userid } });
    }
  }
};
