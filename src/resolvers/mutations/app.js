import { requiresAdmin } from "../../helpers/permissions";
import { uploadFile, deleteFile } from "../../services/gcloud";
import { appPicFolder } from "../../constants";

/* eslint-disable no-param-reassign */

export default {
  createApp: requiresAdmin.createResolver(async (parent, { app, file }, { models }) => {
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

      if (file) {
        const logo = await uploadFile(file, appPicFolder);
        app.logo = logo;
      }

      await models.App.create({ ...app });
      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  updateApp: requiresAdmin.createResolver(
    async (parent, { supportid, developerid, appid, app = {}, file }, { models }) => {
      const tag = "SUPPORT";

      try {
        if (file) {
          const logo = await uploadFile(file, appPicFolder);
          app.logo = logo;
        }

        if (app.developerwebsite) {
          const siteExists = await models.Website.findOne({ where: { unitid: developerid } });
          const website = app.developerwebsite;

          if (siteExists) {
            await models.Website.update({ website }, { where: { unitid: developerid } });
          } else {
            await models.Website.create({ website, unitid: developerid });
          }
        } else if (app.supportwebsite) {
          const siteExists = await models.Website.findOne({ where: { unitid: supportid } });
          const website = app.supportwebsite;

          if (siteExists) {
            await models.Website.update({ website }, { where: { unitid: supportid } });
          } else {
            await models.Website.create({ website, unitid: supportid, tag });
          }
        } else if (app.supportphone) {
          const unitid = supportid;
          const phoneExists = await models.Phone.findOne({ where: { unitid } });

          if (phoneExists) {
            await models.Phone.update({ number: app.supportphone }, { where: { unitid } });
          } else {
            await models.Phone.create({ number: app.supportphone, unitid, tag });
          }
        }

        await models.App.update({ ...app }, { where: { id: appid } });

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  deleteApp: requiresAdmin.createResolver(async (parent, { id }, { models }) => {
    try {
      const app = await models.App.findById(id);
      await models.App.destroy({ where: { id } });

      if (app.logo) {
        await deleteFile(app.logo, appPicFolder);
      }

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
