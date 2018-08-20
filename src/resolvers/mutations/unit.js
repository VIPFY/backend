import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { uploadFile } from "../../services/gcloud";
import { userPicFolder } from "../../constants";
import { NormalError } from "../errors";
/* eslint-disable no-unused-vars, max-len */

export default {
  updateProfilePic: requiresAuth.createResolver(async (parent, { file }, { models, token }) => {
    try {
      const profilepicture = await uploadFile(file, userPicFolder);
      const {
        user: { unitid }
      } = decode(token);
      await models.Unit.update({ profilepicture }, { where: { id: unitid } });

      return { ok: true };
    } catch (err) {
      throw new NormalError({ message: err.message });
    }
  }),

  updateUser: requiresAuth.createResolver(async (parent, { user }, { models, token }) => {
    try {
      const { password, ...human } = user;
      const {
        user: { unitid }
      } = decode(token);

      if (password) {
        throw new Error("You can't update the password this way!");
      }

      await models.Human.update({ ...human }, { where: { unitid } });

      return { ok: true };
    } catch (err) {
      throw new NormalError({ message: err.message });
    }
  })
};
