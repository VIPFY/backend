import { requiresAdmin } from "../../helpers/permissions";

export default {
  createApp: requiresAdmin.createResolver(async (parent, { app }, { models }) => {
    try {
      await models.App.create({ ...app });

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  deleteApp: requiresAdmin.createResolver(async (parent, { id }, { models }) => {
    try {
      await models.App.destroy({ where: { id } });

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
