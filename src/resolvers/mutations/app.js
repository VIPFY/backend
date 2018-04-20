import { requiresAdmin } from "../../helpers/permissions";

export default {
  createApp: requiresAdmin.createResolver(async (parent, { app }, { models }) => {
    const developerExists = await models.Unit.findOne({
      where: { id: app.developer, deleted: false, banned: false }
    });
    if (!developerExists) throw new Error("Developer doesn't exist!");

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
