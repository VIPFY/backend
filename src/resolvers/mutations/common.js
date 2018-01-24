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
      } catch (error) {
        return { error };
      }
    }
  }
};
