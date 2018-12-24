import { decode } from "jsonwebtoken";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { uploadFile } from "../../services/gcloud";
import { userPicFolder } from "../../constants";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";
/* eslint-disable no-unused-vars, prefer-destructuring */

export default {
  updateProfilePic: requiresAuth.createResolver(
    async (parent, { file }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const parsedFile = await file;

          const profilepicture = await uploadFile(parsedFile, userPicFolder);
          const {
            user: { unitid }
          } = decode(token);

          const oldUnit = await models.Unit.findOne({
            where: { id: unitid },
            raw: true
          });

          const updatedUnit = await models.Unit.update(
            { profilepicture },
            { where: { id: unitid }, returning: true, transaction: ta }
          );

          const notificationBody = {
            receiver: unitid,
            message: "Your profile picture was updated.",
            icon: "user-check",
            link: "profile"
          };

          await createLog(
            ip,
            "updateProfilePic",
            { oldUnit, updatedUnit: updatedUnit[1] },
            unitid,
            ta
          );

          return profilepicture;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateUser: requiresRights(["edit-employees"]).createResolver(
    async (parent, { user }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const { password, statisticdata, ...human } = user;
          let updatedHuman;
          if (password) {
            throw new Error("You can't update the password this way!");
          }

          const oldHuman = await models.Human.findOne({
            where: { unitid },
            raw: true
          });

          if (statisticdata) {
            updatedHuman = await models.Human.update(
              {
                statisticdata: { ...oldHuman.statisticdata, ...statisticdata },
                ...human
              },
              { where: { unitid }, returning: true, transaction: ta }
            );
          } else {
            updatedHuman = await models.Human.update(
              { ...human },
              { where: { unitid }, returning: true, transaction: ta }
            );
          }

          await createLog(
            ip,
            "updateUser",
            { updateArgs: user, oldHuman, updatedHuman: updatedHuman[1] },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  saveAppLayout: requiresAuth.createResolver(
    async (parent, { layout }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const { config } = await models.Human.findOne({
          where: { unitid },
          raw: true
        });

        await models.Human.update(
          { config: { ...config, layout } },
          { where: { unitid } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
