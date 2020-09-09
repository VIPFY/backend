import { decode } from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { requiresVipfyAdmin } from "../../helpers/permissions";
import { createProduct } from "../../services/stripe";
import { NormalError } from "../../errors";
import { createLog, formatFilename } from "../../helpers/functions";
import { uploadAppImage, deleteAppImage } from "../../services/aws";

const processMultipleFiles = async (upload, folder) => {
  const pic = await upload;

  const name = await uploadAppImage(pic, folder);
  return name;
};

export default {
  uploadAppImages: requiresVipfyAdmin().createResolver(
    async (_p, { images, appid }, { models }) => {
      try {
        const app = await models.App.findOne({
          where: { id: appid, owner: null },
          raw: true,
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

  deleteImage: requiresVipfyAdmin().createResolver(
    async (_p, { id, image, type }, { models }) => {
      try {
        if (type == "app") {
          const { name, images } = await models.App.findOne({
            where: { id, owner: null },
            raw: true,
            attributes: ["images", "name"],
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

  createApp: requiresVipfyAdmin().createResolver(
    async (_parent, { app, options }, context) =>
      context.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = context;
          const {
            user: { company },
          } = decode(session.token);

          const nameExists = await models.App.findOne({
            where: { name: app.name, owner: null },
            raw: true,
          });

          if (nameExists) throw new Error("Name is already in Database!");

          const [logo, icon] = await Promise.all(
            app.images.map(async (upload, index) => {
              const pic = await upload;
              const filename = formatFilename(index == 0 ? "logo" : "icon");

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
                  updated,
                },
              },
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
                hidden: true,
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

  updateApp: requiresVipfyAdmin().createResolver(
    async (
      _p,
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
              raw: true,
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
                returning: true,
              }
            );
          }

          if (app.logo) {
            const { name, logo: oldLogo } = await models.App.findOne({
              where: { id: appid, owner: null },
              attributes: ["name", "logo"],
              raw: true,
            });
            const folder = name;

            if (oldLogo) {
              await deleteAppImage(oldLogo, folder);
            }

            const logo = await (app.logo.logo || app.logo);
            const appLogo = await uploadAppImage(
              logo,
              folder,
              formatFilename("logo")
            );
            app.logo = appLogo;
          }

          if (app.icon) {
            const { name, icon: oldIcon } = await models.App.findOne({
              where: { id: appid, owner: null },
              attributes: ["name", "icon"],
              raw: true,
            });
            const folder = name;

            if (oldIcon) {
              await deleteAppImage(oldIcon, folder);
            }

            const icon = await (app.icon.icon || app.icon);
            const appIcon = await uploadAppImage(
              icon,
              folder,
              formatFilename("icon")
            );
            app.icon = appIcon;
          }

          if (app.developerwebsite) {
            const siteExists = await models.Website.findOne({
              where: { unitid: developerid },
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
              where: { unitid: supportid },
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
              where: { unitid },
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
              raw: true,
            });

            await models.App.update(
              { options: { ...oldOptions, ...options } },
              {
                where: { id: appid, owner: null },
                transaction: ta,
                returning: true,
              }
            );
          } else {
            await models.App.update(
              { ...app },
              {
                where: { id: appid, owner: null },
                transaction: ta,
                returning: true,
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
  createPlan: requiresVipfyAdmin().createResolver(
    async (_p, { period, planName, price, appid }, { models }) => {
      await models.sequelize.transaction(async ta => {
        try {
          await models.Plan.create(
            {
              name: planName,
              appid,
              price,
              options: {},
              payperiod: { mons: 6 },
              cancelperiod: { mons: 6 },
            },
            { transaction: ta }
          );
        } catch ({ message }) {
          throw new Error(message);
        }
      });
      return true;
    }
  ),

  finishStudy: requiresVipfyAdmin().createResolver(
    async (_p, { participantID }, { models }) => {
      try {
        await models.Study.update(
          { voucher: true },
          { where: { id: participantID }, returning: true }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  cancelFinishStudy: requiresVipfyAdmin().createResolver(
    async (_p, { participantID }, { models }) => {
      try {
        await models.Study.update(
          { voucher: false },
          { where: { id: participantID }, returning: true }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  processMarketplaceApps: requiresVipfyAdmin().createResolver(
    async (_p, { file }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          const FILE_PATH = path.join(__dirname, "../../files/apps.json");
          const apps = await file;
          const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
          console.log("⛴️ Bulk data received", apps);

          fs.writeFileSync(
            FILE_PATH,
            apps.createReadStream().pipe(fs.createWriteStream(FILE_PATH))
          );
          //  Needed, otherwise the file is not there
          await sleep(500);

          const myFile = fs.readFileSync(FILE_PATH, { encoding: "utf-8" });
          const jsonList = await JSON.parse(myFile);

          const createPromises = jsonList.map(app =>
            models.App.findOrCreate({
              where: { externalid: app.externalid },
              defaults: app,
              transaction: ta,
            })
          );

          const createdApps = await Promise.all(createPromises);
          const appsToUpdate = [];
          const deleteOldQuotes = [];
          const quotes = [];

          createdApps.forEach(([app, created]) => {
            const jsonApp = jsonList.find(
              node => node.externalid == app.externalid
            );

            if (!created) {
              appsToUpdate.push(jsonApp);

              deleteOldQuotes.push(
                models.Quote.destroy({
                  where: { appid: app.id },
                  transaction: ta,
                })
              );
            }

            if (jsonApp.quotes && jsonApp.quotes.length > 0) {
              Object.values(jsonApp.quotes).forEach(quote => {
                quotes.push(
                  models.Quote.create(
                    { appid: app.dataValues.id, ...quote },
                    { transaction: ta }
                  )
                );
              });
            }

            // TODO: Update table with app alternatives as soon as Conrad is ready
          });

          const updatePromises = appsToUpdate.map(app =>
            models.App.update(app, {
              where: { externalid: app.externalid },
              transaction: ta,
            })
          );

          await Promise.all(updatePromises);
          await Promise.all(deleteOldQuotes);
          await Promise.all(quotes);

          console.log("Upload worked 🤗");
          fs.unlinkSync(FILE_PATH);
          console.log("File deleted 🗑️");

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),
};
