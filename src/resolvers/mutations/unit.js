import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { uploadFile } from "../../services/gcloud";
import { userPicFolder } from "../../constants";
import { NormalError } from "../../errors";
import { createLog, createNotification } from "../../helpers/functions";
/* eslint-disable no-unused-vars, prefer-destructuring */

export default {
  updateProfilePic: requiresAuth.createResolver(async (parent, { file }, { models, token, ip }) =>
    models.sequelize.transaction(async ta => {
      try {
        const profilepicture = await uploadFile(file, userPicFolder);
        const {
          user: { unitid }
        } = decode(token);

        const oldUnit = await models.Unit.findOne({ where: { id: unitid }, raw: true });

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
        const notification = await createNotification(notificationBody, ta);
        console.log(notification);
        await createLog(
          ip,
          "updateProfilePic",
          { oldUnit, updatedUnit: updatedUnit[1], notification },
          unitid,
          ta
        );

        return profilepicture;
      } catch (err) {
        const {
          user: { unitid }
        } = decode(token);

        const notification = {
          receiver: unitid,
          message: "The upload didn't succeed!",
          icon: "user-times",
          link: "profile"
        };

        await createNotification(notification);

        throw new NormalError({ message: err.message, internalData: { err } });
      }
    })
  ),

  updateUser: requiresAuth.createResolver(async (parent, { user }, { models, token, ip }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const { password, ...human } = user;

        if (password) {
          throw new Error("You can't update the password this way!");
        }
        const oldHuman = await models.Human.findOne({ where: { unitid }, raw: true });

        const updatedHuman = await models.Human.update(
          { ...human },
          { where: { unitid }, returning: true, transaction: ta }
        );

        await createLog(
          ip,
          "updateUser",
          { updateArgs: user, oldHuman, updatedHuman: updatedHuman[1] },
          unitid,
          ta
        );

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    })
  )
};
