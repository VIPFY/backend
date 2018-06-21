import bcrypt from "bcrypt";
import { requiresVipfyAdmin } from "../../helpers/permissions";
import { createProduct, createPlan } from "../../services/stripe";
import { uploadFile, deleteFile } from "../../services/gcloud";
import { appPicFolder, userPicFolder } from "../../constants";
import { createPassword } from "../../helpers/functions";

export default {
  createStripePlan: requiresVipfyAdmin.createResolver(
    async (parent, { name, productid, amount }) => {
      let product;
      if (name && !productid) {
        try {
          const newProduct = await createProduct(name);
          product = newProduct.id;
          console.log({ newProduct });
        } catch ({ message }) {
          throw new Error(message);
        }
      } else product = productid;

      try {
        await createPlan(product, amount);
        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  adminUpdateLicence: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, boughtplanid, licenceData }, { models }) => {
      try {
        await models.Licence.update({ ...licenceData }, { where: { unitid, boughtplanid } });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  adminCreateLicence: requiresVipfyAdmin.createResolver(
    async (parent, { licenceData }, { models }) => {
      try {
        await models.Licence.create({ ...licenceData });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  createApp: requiresVipfyAdmin.createResolver(
    async (parent, { app, file, file2, files }, { models }) => {
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

        if (file2) {
          const icon = await uploadFile(file2, "icons");
          app.icon = icon;
        }

        if (files) {
          // eslint-disable-next-line
          const imagesToUpload = files.map(async fi => await uploadFile(fi, app.name));
          const images = await Promise.all(imagesToUpload);
          app.images = images;
        }

        await models.App.create({ ...app });
        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  updateApp: requiresVipfyAdmin.createResolver(
    async (parent, { supportid, developerid, appid, app = {}, file }, { models }) =>
      models.sequelize.transaction(async ta => {
        const tags = ["support"];

        try {
          if (file) {
            const logo = await uploadFile(file, appPicFolder);
            app.logo = logo;
          }

          if (app.developerwebsite) {
            const siteExists = await models.Website.findOne({ where: { unitid: developerid } });
            const website = app.developerwebsite;

            if (siteExists) {
              await models.Website.update(
                { website },
                { where: { unitid: developerid }, transaction: ta }
              );
            } else {
              await models.Website.create({ website, unitid: developerid }, { transaction: ta });
            }
          } else if (app.supportwebsite) {
            const siteExists = await models.Website.findOne({ where: { unitid: supportid } });
            const website = app.supportwebsite;

            if (siteExists) {
              await models.Website.update(
                { website },
                { where: { unitid: supportid }, transaction: ta }
              );
            } else {
              await models.Website.create(
                { website, unitid: supportid, tags },
                { transaction: ta }
              );
            }
          } else if (app.supportphone) {
            const unitid = supportid;
            const phoneExists = await models.Phone.findOne({ where: { unitid } });

            if (phoneExists) {
              await models.Phone.update(
                { number: app.supportphone },
                { where: { unitid }, transaction: ta }
              );
            } else {
              await models.Phone.create(
                { number: app.supportphone, unitid, tags },
                { transaction: ta }
              );
            }
          }

          await models.App.update({ ...app }, { where: { id: appid }, transaction: ta });

          return { ok: true };
        } catch ({ message }) {
          throw new Error(message);
        }
      })
  ),

  deleteApp: requiresVipfyAdmin.createResolver(async (parent, { id }, { models }) => {
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

  toggleAppStatus: requiresVipfyAdmin.createResolver(async (parent, { id }, { models }) => {
    try {
      const { disabled } = await models.App.findById(id);
      await models.App.update({ disabled: !disabled }, { where: { id } });
      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  adminCreateAddress: requiresVipfyAdmin.createResolver(
    async (parent, { addressData, unitid }, { models }) => {
      try {
        const { zip, street, city, ...normalData } = addressData;
        const address = { street, zip, city };

        await models.Address.create({ ...normalData, address, unitid });

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  adminUpdateAddress: requiresVipfyAdmin.createResolver(
    async (parent, { addressData, id }, { models }) => {
      const { zip, city, street } = addressData;

      try {
        if (zip || city || street) {
          const old = await models.Address.findOne({ where: { id } });
          const newAddress = { ...old.address, ...addressData };

          await models.Address.update({ address: { ...newAddress } }, { where: { id } });
        } else await models.Address.update({ ...addressData }, { where: { id } });

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  adminDeleteAddress: requiresVipfyAdmin.createResolver(async (parent, { id }, { models }) => {
    try {
      await models.Address.destroy({ where: { id } });

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  adminCreateEmail: requiresVipfyAdmin.createResolver(
    async (parent, { email, unitid }, { models }) => {
      try {
        const emailExists = await models.Email.findOne({ where: { email } });
        if (emailExists) {
          throw new Error("Email already exists!");
        }

        await models.Email.create({ email, unitid });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  adminDeleteEmail: requiresVipfyAdmin.createResolver(
    async (parent, { email, unitid }, { models }) => {
      try {
        const p1 = models.Email.findOne({ where: { email, unitid } });
        const p2 = models.Email.findAll({ where: { unitid } });
        const [belongsToUser, userHasAnotherEmail] = await Promise.all([p1, p2]);

        if (!belongsToUser) {
          throw new Error("The emails doesn't belong to this user!");
        }

        if (!userHasAnotherEmail || userHasAnotherEmail.length < 2) {
          throw new Error("This is the users last email address. He needs at least one!");
        }

        await models.Email.destroy({ where: { email } });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  createUser: requiresVipfyAdmin.createResolver(async (parent, { user, file }, { models }) => {
    const { position, email, ...userData } = user;
    const unitData = { position };

    if (file) {
      const profilepicture = await uploadFile(file, userPicFolder);
      unitData.profilepicture = profilepicture;
    }

    return models.sequelize.transaction(async ta => {
      try {
        const passwordhash = await createPassword(email);
        const unit = await models.Unit.create({ ...unitData }, { transaction: ta });
        const p1 = models.Human.create(
          { unitid: unit.id, ...userData, passwordhash },
          { transaction: ta }
        );
        const p2 = models.Email.create({ unitid: unit.id, email }, { transaction: ta });
        await Promise.all([p1, p2]);
        // sendRegistrationEmail(email, passwordhash);

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    });
  }),

  adminUpdateUser: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, user = {}, file }, { models }) => {
      const { password, position, verified, email, oldemail, banned } = user;

      try {
        if (file) {
          const profilepicture = await uploadFile(file, userPicFolder);
          await models.Unit.update({ profilepicture }, { where: { id: unitid } });
        } else if (password) {
          const passwordhash = await bcrypt.hash(password, 12);
          await models.Human.update({ passwordhash }, { where: { unitid } });
        } else if (position) {
          await models.Unit.update({ ...user }, { where: { id: unitid } });
        } else if (verified != null && email) {
          await models.Email.update({ verified }, { where: { email } });
        } else if (oldemail && email) {
          const emailExists = await models.Email.findOne({ where: { email } });

          if (emailExists) {
            throw new Error("This email is already in our database!");
          }

          // send confirmationEmail

          await models.Email.update({ email, verified: false }, { where: { email: oldemail } });
        } else if (banned != null) {
          await models.Unit.update({ banned }, { where: { id: unitid } });
        } else {
          await models.Human.update({ ...user }, { where: { unitid } });
        }

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  deleteUser: requiresVipfyAdmin.createResolver(async (parent, { unitid }, { models }) =>
    models.sequelize.transaction(async ta => {
      try {
        const already = await models.Unit.findById(unitid);
        if (already.deleted) throw new Error("User already deleted!");

        const p1 = models.Unit.update(
          { deleted: true, profilepicture: "" },
          { where: { id: unitid } },
          { transaction: ta }
        );

        const p2 = models.Human.update(
          { firstname: "Deleted", middlename: "", lastname: "User" },
          { where: { unitid } },
          { transaction: ta }
        );

        const p3 = models.Email.destroy({ where: { unitid } }, { transaction: ta });

        const p4 = models.Address.update(
          { address: { city: "deleted" }, description: "deleted" },
          { where: { unitid } },
          { transaction: ta }
        );

        const p5 = models.ParentUnit.destroy({ where: { childunit: unitid } }, { transaction: ta });

        await Promise.all([p1, p2, p3, p4, p5]);

        if (already.profilepicture) {
          await deleteFile(already.profilepicture, userPicFolder);
        }

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    })
  ),

  freezeAccount: requiresVipfyAdmin.createResolver(async (parent, { unitid }, { models }) => {
    const accountExists = await models.Unit.findById(unitid);

    if (!accountExists) {
      throw new Error("User not found!");
    }

    try {
      await models.Unit.update({ suspended: !accountExists.suspended }, { where: { id: unitid } });
      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  adminCreateCompany: requiresVipfyAdmin.createResolver(async (parent, args, { models }) => {
    try {
      await models.Unit.create({});

      return { ok: true };
    } catch (err) {
      throw new Error(err);
    }
  })
};