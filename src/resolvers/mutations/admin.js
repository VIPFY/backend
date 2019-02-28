import { split } from "lodash";
import { decode } from "jsonwebtoken";
import { flushAll as flushServices } from "@vipfy-private/services";
import { requiresVipfyAdmin } from "../../helpers/permissions";
import { createProduct, createPlan, deletePlan } from "../../services/stripe";
import { userPicFolder, MAX_PASSWORD_LENGTH } from "../../constants";
import { flushAuthCaches, getNewPasswordData } from "../../helpers/auth";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";
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
    async (parent, { plan, appId }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          const app = await models.App.findOne({
            where: { id: appId },
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

  adminUpdateLicence: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, boughtplanid, licenceData }, { models }) => {
      try {
        await models.Licence.update(
          { ...licenceData },
          { where: { unitid, boughtplanid } }
        );

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

  uploadAppImages: requiresVipfyAdmin.createResolver(
    async (parent, { images, appid }, { models }) => {
      try {
        const app = await models.App.findOne({
          where: { id: appid },
          raw: true
        });

        const names = await Promise.all(
          images.map(image => processMultipleFiles(image, app.name))
        );

        await models.App.update({ images: names }, { where: { id: appid } });
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
            where: { id },
            raw: true,
            attributes: ["images", "name"]
          });

          await deleteAppImage(image, name);
          const filteredImages = images.filter(pic => pic != image);

          await models.App.update(
            { images: filteredImages },
            { where: { id }, returning: true }
          );
        }

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  createApp: requiresVipfyAdmin.createResolver(
    async (parent, { app, options }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const nameExists = await models.App.findOne({
            where: { name: app.name },
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

          await createLog(ip, "updateProfilePic", { newApp, plan }, unitid, ta);

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
              where: { id: appid },
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
              { where: { id: appid }, transaction: ta, returning: true }
            );
          }

          if (app.logo) {
            const { name, logo: oldLogo } = await models.App.findOne({
              where: { id: appid },
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
              where: { id: appid },
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
              where: { id: appid },
              raw: true
            });

            await models.App.update(
              { options: { ...oldOptions, ...options } },
              { where: { id: appid }, transaction: ta, returning: true }
            );
          } else {
            console.log("SHIT!");
            await models.App.update(
              { ...app },
              { where: { id: appid }, transaction: ta, returning: true }
            );
          }
        } catch ({ message }) {
          throw new Error(message);
        }
      });

      return models.AppDetails.findOne({ where: { id: appid } });
    }
  ),

  deleteApp: requiresVipfyAdmin.createResolver(
    async (parent, { id }, { models }) => {
      try {
        const app = await models.App.findById(id);
        await models.App.destroy({ where: { id } });

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
        await models.App.update({ disabled: !disabled }, { where: { id } });
        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

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
      const options = { where: { id }, raw: true };

      try {
        if (zip || city || street) {
          const old = await models.Address.findOne(options);
          const newAddress = { ...old.address, ...addressData };

          await models.Address.update({ address: { ...newAddress } }, options);
        } else await models.Address.update({ ...addressData }, options);

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  adminDeleteAddress: requiresVipfyAdmin.createResolver(
    async (parent, { id }, { models }) => {
      try {
        await models.Address.destroy({ where: { id } });

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

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
        const [belongsToUser, userHasAnotherEmail] = await Promise.all([
          p1,
          p2
        ]);

        if (!belongsToUser) {
          throw new Error("The emails doesn't belong to this user!");
        }

        if (!userHasAnotherEmail || userHasAnotherEmail.length < 2) {
          throw new Error(
            "This is the users last email address. He needs at least one!"
          );
        }

        await models.Email.destroy({ where: { email } });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  createUser: requiresVipfyAdmin.createResolver(
    async (parent, { user, file }, { models }) => {
      const { email, ...userData } = user;
      const unitData = {};

      // used by admin interface
      throw new Error("not implemented");
      /*
      if (file) {
        const profilepicture = await uploadUserImage(file, userPicFolder);
        unitData.profilepicture = profilepicture;
      }

      return models.sequelize.transaction(async ta => {
        try {
          const password = await createPassword(email);
          const pwdata = await getNewPasswordData(password);
          const unit = await models.Unit.create(
            { ...unitData },
            { transaction: ta }
          );
          const p1 = models.Human.create(
            { unitid: unit.id, ...userData, ...pwdata },
            { transaction: ta }
          );
          const p2 = models.Email.create(
            { unitid: unit.id, email },
            { transaction: ta }
          );
          await Promise.all([p1, p2]);
          // sendRegistrationEmail(email, passwordhash);

          return { ok: true };
        } catch ({ message }) {
          throw new Error(message);
        }
      });
      */
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

  adminCreateCompany: requiresVipfyAdmin.createResolver(
    async (parent, { company, profilepic }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          let unit;
          const { user, ...data } = company;

          if (profilepic) {
            const profilepicture = await uploadUserImage(
              profilepic,
              userPicFolder
            );
            unit = await models.Unit.create(
              { profilepicture },
              { transaction: ta }
            );
          } else {
            unit = await models.Unit.create({}, { transaction: ta });
          }

          const p1 = models.DepartmentData.create(
            { unitid: unit.id, ...data },
            { transaction: ta }
          );
          const p2 = models.ParentUnit.create(
            { parentunit: unit.id, childunit: user },
            { transaction: ta }
          );
          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          throw new Error(err);
        }
      })
  ),

  adminAddEmployee: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, company }, { models }) => {
      try {
        await models.ParentUnit.create({
          parentunit: company,
          childunit: unitid
        });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  adminRemoveEmployee: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, company }, { models }) => {
      try {
        await models.ParentUnit.destroy({
          where: { parentunit: company, childunit: unitid }
        });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  adminRemoveLicence: requiresVipfyAdmin.createResolver(
    async (parent, { licenceid }, { models }) => {
      try {
        await models.Licence.update(
          { unitid: null },
          { where: { id: licenceid } }
        );

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  adminFetchUser: requiresVipfyAdmin.createResolver(
    async (parent, { name }, { models }) => {
      try {
        const nameForSearch = split(name, " ");
        let searchParams;

        switch (nameForSearch.length) {
          case 1:
            searchParams = {
              [models.Op.or]: [
                { firstname: { [models.Op.iLike]: `%${nameForSearch[0]}%` } },
                { lastname: { [models.Op.iLike]: `%${nameForSearch[0]}%` } }
              ]
            };
            break;

          case 2:
            searchParams = {
              firstname: { [models.Op.iLike]: `%${nameForSearch[0]}%` },
              lastname: { [models.Op.iLike]: `%${nameForSearch[1]}%` }
            };
            break;

          default:
            searchParams = {
              firstname: { [models.Op.iLike]: `%${nameForSearch[0]}%` },
              middlename: { [models.Op.iLike]: `%${nameForSearch[1]}%` },
              lastname: { [models.Op.iLike]: `%${nameForSearch[2]}%` }
            };
        }

        const user = await models.User.findAll({ where: searchParams });

        return user;
      } catch (err) {
        throw new Error(err);
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
