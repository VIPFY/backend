// This file contains common operations which don't belong to a specific Component
import { decode } from "jsonwebtoken";
import crypto from "crypto";
import moment from "moment";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { checkVat, createLog } from "../../helpers/functions";
import { s3 } from "../../services/aws";
import { sendEmail } from "../../helpers/email";
/* eslint-disable consistent-return, no-unused-vars */

export default {
  readNotification: requiresAuth.createResolver(
    async (_parent, { id }, { models, session }) => {
      try {
        const {
          user: { unitid },
        } = decode(session.token);

        await models.Notification.update(
          { readtime: models.sequelize.fn("NOW") },
          { where: { receiver: unitid, id } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  readAllNotifications: requiresAuth.createResolver(
    async (_parent, _args, { models, session }) => {
      try {
        const {
          user: { unitid },
        } = decode(session.token);

        await models.Notification.update(
          { readtime: models.sequelize.fn("NOW") },
          { where: { receiver: unitid, readtime: { [models.Op.eq]: null } } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  ping: async () => ({ ok: true }),

  checkVat: async (_parent, { vat, cc }) => {
    try {
      if (vat.substr(0, 2) != cc) {
        throw new Error("Prefix doesn't match with provided country");
      }

      const checkedData = await checkVat(vat);

      return checkedData.name;
    } catch (err) {
      throw new Error("Invalid Vatnumber!");
    }
  },

  logSSOError: requiresAuth.createResolver(
    async (_parent, { eventdata }, context) => {
      try {
        console.error(eventdata);

        await sendEmail({
          templateId: "d-a93f5ca8ee6f4f0ab1173d64376a5b97",
          fromName: "VIPFY",
          personalizations: [
            {
              to: [{ email: "support@vipfy.store" }],
              dynamic_template_data: {
                ...eventdata,
              },
            },
          ],
        });

        await createLog(context, "logSSOError", eventdata, null);

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  sendUsageData: requiresAuth.createResolver(
    async (_parent, { data }, { models, ip, session, deviceId }) => {
      try {
        const {
          user: { unitid },
        } = decode(session.token);

        const superSecretKey =
          process.env.PSEUDONYMIZATION_SECRET || "yzSlffJLHor0UPCCLYCL";

        const pseudonymousid = crypto
          .createHmac("sha256", superSecretKey)
          .update(unitid)
          .digest("hex");

        const pseudonymousdeviceid = crypto
          .createHmac("sha256", superSecretKey)
          .update(deviceId)
          .digest("hex");

        const generatorid = crypto
          .createHmac("sha256", "dbXHVFcQ2s7WQwoBIsCg")
          .update(superSecretKey)
          .digest("hex")
          .substring(0, 6);

        const filename = `clicks-${pseudonymousid}-${moment()
          .utc()
          .valueOf()}.lzma`;

        const { createReadStream } = await data;
        const Key = `${generatorid}/${pseudonymousid}/${pseudonymousdeviceid}/${filename}`;
        const Bucket = "vipfy-usagedata";

        const Body = createReadStream();

        const params = {
          Key,
          Body,
          Bucket,
        };

        await s3.upload(params).promise();

        return true;
      } catch (err) {
        console.warn(err);
        throw new NormalError({
          message: "error uploading data",
          internalData: { err },
        });
      }
    }
  ),
};
