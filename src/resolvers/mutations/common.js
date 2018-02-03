// This file contains common operations which don't belong to a specific Component

import { sendEmailToVipfy } from "../../services/mailjet";

export default {
  newContactEmail: async (parent, args, { models }) => {
    if (process.env.ENVIRONMENT != "testing") {
      try {
        const messageSent = await sendEmailToVipfy(args);

        return {
          ok: true
        };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  }
};
