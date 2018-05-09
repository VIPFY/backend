import { requiresAdmin } from "../../helpers/permissions";

export default {
  createApp: requiresAdmin.createResolver(async (parent, { app }, { models }) => {
    try {
      const nameExists = await models.App.findOne({ where: { name: app.name } });
      if (nameExists) throw new Error("Name is already in Database!");

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

  updateApp: requiresAdmin.createResolver(async (parent, { id, app }, { models }) => {
    try {
      await models.App.update({ ...app }, { where: { id } });

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
  }),

  toggleAppStatus: requiresAdmin.createResolver(async (parent, { id }, { models }) => {
    try {
      const { disabled } = await models.App.findById(id);
      await models.App.update({ disabled: !disabled }, { where: { id } });
      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
