// This file contains common operations which don't belong to a specific Component
import { sendEmailToVipfy } from "../../services/mailjet";

/* eslint-disable consistent-return, no-unused-vars */

export default {
  newContactEmail: async (parent, args) => {
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
