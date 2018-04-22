import { requiresAdmin } from "../../helpers/permissions";

export default {
  createApp: requiresAdmin.createResolver(async (parent, { app }, { models }) => {
    try {
      const developerExists = await models.Unit.findOne({
        where: { id: app.developer, deleted: false, banned: false }
      });
      if (!developerExists) throw new Error("Developer doesn't exist!");
      if (app.supportunit == app.developer) {
        throw new Error("Developer and Supportunit can't be the same one!");
      }

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
