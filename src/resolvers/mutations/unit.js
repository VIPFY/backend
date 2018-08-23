import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { uploadFile } from "../../services/gcloud";
import { userPicFolder } from "../../constants";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";
/* eslint-disable no-unused-vars */

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

        await createLog(
          ip,
          "updateProfilePic",
          { oldUnit, updatedUnit: updatedUnit[1] },
          unitid,
          ta
        );

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    })
  ),

  updateUser: requiresAuth.createResolver(async (parent, { user }, { models, token, ip }) =>
    models.sequelize.transaction(async ta => {
      try {
        const { password, ...human } = user;
        const {
          user: { unitid }
        } = decode(token);

        if (password) {
          throw new Error("You can't update the password this way!");
        }

        const oldHuman = await models.Human.findOne({ where: { unitid }, raw: true });

        const updatedHuman = await models.Human.update(
          { ...human },
          { where: { unitid }, returning: true, transaction: ta }
        );

        await createLog(ip, "updateUser", { oldHuman, updatedHuman: updatedHuman[1] }, unitid, ta);

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    })
  )
};
