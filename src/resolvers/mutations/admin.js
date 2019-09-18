import { decode } from "jsonwebtoken";
import { flushAll as flushServices } from "@vipfy-private/services";
import { requiresVipfyAdmin } from "../../helpers/permissions";
import { createProduct, createPlan, deletePlan } from "../../services/stripe";
import { userPicFolder, MAX_PASSWORD_LENGTH } from "../../constants";
import { flushAuthCaches } from "../../helpers/auth";
import { NormalError } from "../../errors";
import { createLog, getNewPasswordData } from "../../helpers/functions";
import {
  uploadUserImage,
  uploadAppImage,
  deleteAppImage,
  deleteUserImage
} from "../../services/aws";

const processMultipleFiles = async (upload, folder) => {
  const pic = await upload;

  const name = await uploadAppImage(pic, folder);
  return name;
};

export default {
  adminCreatePlan: requiresVipfyAdmin.createResolver(
    async (_, { plan, appId }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          const app = await models.App.findOne({
            where: { id: appId, owner: null },
            raw: true,
            attributes: ["internaldata", "name"]
          });
          let product;

          if (!app.internaldata || !app.internaldata.stripe) {
            const productData = await createProduct(app.name);
            const { id, active, created, name, type, updated } = productData;

            await models.App.update(
              {
                internaldata: {
                  stripe: { id, active, created, name, type, updated }
                }
              },
              { where: { id: appId }, transaction: ta }
            );

            product = id;
          } else {
            product = app.internaldata.stripe.id;
          }
          let interval = "year";

          switch (Object.keys(plan.payperiod)[0]) {
            case "days":
              interval = "day";
              break;

            case "months":
              interval = "month";
              break;

            default:
              break;
          }
          const priceInCents = Math.ceil(plan.price * 100);

          const planData = {
            currency: plan.currency,
            interval,
            nickname: plan.name,
            product,
            amount: priceInCents
          };

          const stripePlan = await createPlan(planData);

          const { active, amount, created, currency } = stripePlan;

          await models.Plan.create(
            {
              ...plan,
              stripedata: {
                id: stripePlan.id,
                active,
                amount,
                created,
                product: stripePlan.product,
                currency,
                interval: stripePlan.interval
              }
            },
            { transaction: ta }
          );
          return { ok: true };
        } catch (err) {
          throw new Error(err.message);
        }
      })
  ),

  adminUpdatePlan: requiresVipfyAdmin.createResolver(
    async (parent, { plan, id }, { models }) => {
      try {
        if (plan.price || plan.currency || plan.payperiod) {
          throw new Error(
            "The plan’s ID, amount, currency, or billing cycle can't be changed"
          );
        }

        await models.Plan.update({ ...plan }, { where: { id } });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  adminEndPlan: requiresVipfyAdmin.createResolver(
    async (parent, { id, enddate }, { models }) => {
      try {
        const plan = models.Plan.findById(id, {
          raw: true,
          attributes: ["stripedata"]
        });

        if (plan.stripedata) {
          await deletePlan(plan.stripedata.id);
        }

        await models.Plan.update(
          { enddate, stripedata: { ...plan.stripedata, deleted: true } },
          { where: { id }, raw: true }
        );

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  uploadAppImages: requiresVipfyAdmin.createResolver(
    async (parent, { images, appid }, { models }) => {
      try {
        const app = await models.App.findOne({
          where: { id: appid, owner: null },
          raw: true
        });

        const names = await Promise.all(
          images.map(image => processMultipleFiles(image, app.name))
        );

        await models.App.update(
          { images: names },
          { where: { id: appid, owner: null } }
        );
        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  deleteImage: requiresVipfyAdmin.createResolver(
    async (parent, { id, image, type }, { models }) => {
      try {
        if (type == "app") {
          const { name, images } = await models.App.findOne({
            where: { id, owner: null },
            raw: true,
            attributes: ["images", "name"]
          });

          await deleteAppImage(image, name);
          const filteredImages = images.filter(pic => pic != image);

          await models.App.update(
            { images: filteredImages },
            { where: { id, owner: null }, returning: true }
          );
        }

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  createApp: requiresVipfyAdmin.createResolver(
    async (_parent, { app, options }, context) =>
      context.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = context;
          const {
            user: { company }
          } = decode(session.token);

          const nameExists = await models.App.findOne({
            where: { name: app.name, owner: null },
            raw: true
          });

          if (nameExists) throw new Error("Name is already in Database!");

          const [logo, icon] = await Promise.all(
            app.images.map(async (upload, index) => {
              const pic = await upload;
              const filename = index == 0 ? "logo.png" : "icon.png";

              const name = await uploadAppImage(pic, app.name, filename);
              return name;
            })
          );
          const productData = await createProduct(app.name);
          const { id, active, created, name, type, updated } = productData;
          delete app.images;

          const newApp = await models.App.create(
            {
              ...app,
              logo,
              icon,
              disabled: app.disabled ? app.disabled : false,
              options,
              developer: company,
              supportunit: company,
              internaldata: {
                stripe: {
                  id,
                  active,
                  created,
                  name,
                  type,
                  updated
                }
              }
            },
            { transaction: ta }
          );

          let plan = null;

          if (app.external) {
            plan = await models.Plan.create(
              {
                name: `${app.name} External`,
                appid: newApp.dataValues.id,
                teaserdescription: `External Plan for ${app.name}`,
                startdate: models.sequelize.fn("NOW"),
                numlicences: 0,
                price: 0.0,
                options: { external: true },
                payperiod: { years: 1 },
                cancelperiod: { secs: 1 },
                hidden: true
              },
              { transaction: ta }
            );
          }

          await createLog(context, "updateProfilePic", { newApp, plan }, ta);

          return newApp.dataValues.id;
        } catch ({ message }) {
          throw new Error(message);
        }
      })
  ),

  updateApp: requiresVipfyAdmin.createResolver(
    async (
      parent,
      { supportid, developerid, appid, app = {}, options },
      { models }
    ) => {
      await models.sequelize.transaction(async ta => {
        const tags = ["support"];

        try {
          if (app.image) {
            // eslint-disable-next-line prefer-const
            let { name, images } = await models.App.findOne({
              where: { id: appid, owner: null },
              attributes: ["name", "images"],
              raw: true
            });
            const folder = name;

            const image = await app.image.images;
            const newImage = await uploadAppImage(image, folder);
            if (images) {
              images.push(newImage);
            } else {
              images = [newImage];
            }

            return await models.App.update(
              { images },
              {
                where: { id: appid, owner: null },
                transaction: ta,
                returning: true
              }
            );
          }

          if (app.logo) {
            const { name, logo: oldLogo } = await models.App.findOne({
              where: { id: appid, owner: null },
              attributes: ["name", "logo"],
              raw: true
            });
            const folder = name;

            if (oldLogo) {
              await deleteAppImage(oldLogo, folder);
            }

            const logo = await app.logo.logo;
            const appLogo = await uploadAppImage(logo, folder, "logo.png");
            app.logo = appLogo;
          }

          if (app.icon) {
            const { name, icon: oldIcon } = await models.App.findOne({
              where: { id: appid, owner: null },
              attributes: ["name", "icon"],
              raw: true
            });
            const folder = name;

            if (oldIcon) {
              await deleteAppImage(oldIcon, folder);
            }

            const icon = await app.icon.icon;
            const appIcon = await uploadAppImage(icon, folder, "icon.png");
            app.icon = appIcon;
          }

          if (app.developerwebsite) {
            const siteExists = await models.Website.findOne({
              where: { unitid: developerid }
            });
            const website = app.developerwebsite;

            if (siteExists) {
              await models.Website.update(
                { website },
                { where: { unitid: developerid }, transaction: ta }
              );
            } else {
              await models.Website.create(
                { website, unitid: developerid },
                { transaction: ta }
              );
            }
          } else if (app.supportwebsite) {
            const siteExists = await models.Website.findOne({
              where: { unitid: supportid }
            });
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
            const phoneExists = await models.Phone.findOne({
              where: { unitid }
            });

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

          if (options) {
            const { options: oldOptions } = await models.App.findOne({
              where: { id: appid, owner: null },
              raw: true
            });

            await models.App.update(
              { options: { ...oldOptions, ...options } },
              {
                where: { id: appid, owner: null },
                transaction: ta,
                returning: true
              }
            );
          } else {
            await models.App.update(
              { ...app },
              {
                where: { id: appid, owner: null },
                transaction: ta,
                returning: true
              }
            );
          }
        } catch ({ message }) {
          throw new Error(message);
        }
      });

      return models.AppDetails.findOne({ where: { id: appid, owner: null } });
    }
  ),

  deleteApp: requiresVipfyAdmin.createResolver(
    async (parent, { id }, { models }) => {
      try {
        const app = await models.App.findById(id);
        await models.App.destroy({ where: { id, owner: null } });

        if (app.logo) {
          await deleteAppImage(app.logo, app.name);
        }
        // TODO: delete other images too

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  toggleAppStatus: requiresVipfyAdmin.createResolver(
    async (parent, { id }, { models }) => {
      try {
        const { disabled } = await models.App.findById(id);
        await models.App.update(
          { disabled: !disabled },
          { where: { id, owner: null } }
        );
        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  adminUpdateUser: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, user = {}, profilepic }, { models }) => {
      const { password, verified, email, oldemail, banned } = user;

      try {
        if (profilepic) {
          const profilepicture = await uploadUserImage(
            profilepic,
            userPicFolder
          );
          await models.Unit.update(
            { profilepicture },
            { where: { id: unitid } }
          );
        } else if (password) {
          if (password.length > MAX_PASSWORD_LENGTH) {
            throw new Error("Password too long");
          }

          const pwData = await getNewPasswordData(password);
          await models.Human.update({ ...pwData }, { where: { unitid } });
        } else if (verified != null && email) {
          await models.Email.update({ verified }, { where: { email } });
        } else if (oldemail && email) {
          const emailExists = await models.Email.findOne({ where: { email } });

          if (emailExists) {
            throw new Error("This email is already in our database!");
          }

          // send confirmationEmail

          await models.Email.update(
            { email, verified: false },
            { where: { email: oldemail } }
          );
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

  adminDeleteUnit: requiresVipfyAdmin.createResolver(
    async (parent, { unitid }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          const already = await models.Unit.findById(unitid);
          if (already.deleted) throw new Error("User already deleted!");

          const p1 = models.Unit.update(
            { deleted: true, profilepicture: "" },
            { where: { id: unitid } },
            { transaction: ta }
          );

          let p2;
          const isHuman = await models.User.findById(unitid);

          if (isHuman) {
            p2 = models.Human.update(
              { firstname: "Deleted", middlename: "", lastname: "User" },
              { where: { unitid } },
              { transaction: ta }
            );
          } else {
            p2 = models.DepartmentData.destroy(
              { where: { unitid } },
              { transaction: ta }
            );
          }

          const p3 = models.Email.destroy(
            { where: { unitid } },
            { transaction: ta }
          );

          const p4 = models.Address.destroy(
            { where: { unitid } },
            { transaction: ta }
          );

          let p5;

          if (isHuman) {
            p5 = models.ParentUnit.destroy(
              { where: { childunit: unitid } },
              { transaction: ta }
            );
          } else {
            p5 = models.ParentUnit.destroy(
              {
                where: {
                  [models.Op.or]: [
                    { parentunit: unitid },
                    { childunit: unitid }
                  ]
                }
              },
              { transaction: ta }
            );
          }

          await Promise.all([p1, p2, p3, p4, p5]);

          if (already.profilepicture) {
            await deleteUserImage(already.profilepicture, userPicFolder);
          }

          return { ok: true };
        } catch ({ message }) {
          throw new Error(message);
        }
      })
  ),

  freezeAccount: requiresVipfyAdmin.createResolver(
    async (parent, { unitid }, { models }) => {
      const accountExists = await models.Unit.findById(unitid);

      if (!accountExists) {
        throw new Error("User not found!");
      }

      try {
        await models.Unit.update(
          { suspended: !accountExists.suspended },
          { where: { id: unitid } }
        );
        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  flushLocalCaches: requiresVipfyAdmin.createResolver(
    async (parent, args, context) => {
      flushAuthCaches();
      flushServices();
      return { ok: true };
    }
  )
};
