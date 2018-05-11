import { decode } from "jsonwebtoken";
import { requiresAuth, requiresAdmin } from "../../helpers/permissions";

export default {
  allUsers: requiresAuth.createResolver(async (parent, args, { models }) =>
    models.User.findAll({
      order: [
        [models.sequelize.literal(`CASE WHEN firstName = 'Deleted' THEN 1 ELSE 0 END`), "ASC"]
      ]
    })
  ),

  fetchUser: requiresAuth.createResolver(async (parent, { id }, { models }) => {
    try {
      const user = await models.User.findById(id);

      return user;
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  allDepartments: requiresAdmin.createResolver(async (parent, args, { models }) =>
    models.Department.findAll({
      where: { deleted: false, banned: false }
    })
  ),

  fetchCompanySize: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { company } } = decode(token);
      console.log(company);
      const size = await models.Department.findOne({ where: { unitid: company } });

      return size.employees;
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
