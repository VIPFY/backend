import { decode } from "jsonwebtoken";
import { requiresAdmin, requiresVipfyAdmin } from "../../helpers/permissions";

export default {
  allUsers: requiresVipfyAdmin.createResolver(async (parent, args, { models }) =>
    models.User.findAll({
      order: [
        [models.sequelize.literal(`CASE WHEN firstName = 'Deleted' THEN 1 ELSE 0 END`), "ASC"]
      ]
    })
  ),

  fetchUser: requiresVipfyAdmin.createResolver(async (parent, { id }, { models }) => {
    try {
      const user = await models.User.findById(id);

      return user;
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  allDepartments: requiresVipfyAdmin.createResolver(async (parent, args, { models }) =>
    models.Department.findAll({
      where: { deleted: false, banned: false }
    })
  ),

  fetchCompanySize: requiresAdmin.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { company } } = decode(token);
      const size = await models.Department.findOne({ where: { unitid: company } });

      return size.employees;
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
