import { requiresAuth } from "../helpers/permissions";
import _ from "lodash";
import { Op } from "sequelize";

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

  allApps: (parent, { first }, { models }) => {
    if (first) {
      return models.App.findAll().then(res => res.slice(0, first));
    } else return models.App.findAll();
  },

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
  fetchMessages: requiresAuth.createResolver(
    async (parent, { id }, { models }) => {
      const users = await models.Notification.findAll({
        where: { touser: id, deleted: false },
        order: [["sendtime", "DESC"]]
      });
      const apps = await models.AppNotification.findAll({
        where: { touser: id, deleted: false },
        order: [["sendtime", "DESC"]]
      });

      const result = [];
      users.map(user => result.push(user));
      apps.map(app => result.push(app));

      return _.orderBy(result, "sendtime", "desc");
    }
  ),

  fetchMessages: requiresAuth.createResolver(
    async (parent, { id, read }, { models }) => {
      let users;
      let apps;

      if (read) {
        users = await models.Notification.findAll({
          where: {
            touser: id,
            deleted: false,
            readtime: { [Op.not]: null }
          },
          order: [["sendtime", "DESC"]]
        });

        apps = await models.AppNotification.findAll({
          where: {
            touser: id,
            deleted: false,
            readtime: { [Op.not]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else {
        users = await models.Notification.findAll({
          where: { touser: id, deleted: false },
          order: [["sendtime", "DESC"]]
        });

        apps = await models.AppNotification.findAll({
          where: { touser: id, deleted: false },
          order: [["sendtime", "DESC"]]
        });
      }

      const result = [];
      users.map(user => result.push(user));
      apps.map(app => result.push(app));

      return _.orderBy(result, "sendtime", "desc");
    }
  )
};
