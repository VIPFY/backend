import { Client as ClientClass } from "@sendgrid/client";
import logger from "../loggers";

const Client = new ClientClass();

Client.setApiKey(
  "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"
);

export const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// eslint-disable-next-line import/prefer-default-export
export const sendEmail = async ({ templateId, personalizations, fromName }) => {
  const [a, b] = await Client.request({
    method: "POST",
    url: "/v3/mail/send",
    body: {
      template_id: templateId,
      personalizations,
      from: {
        email: "noreply@vipfy.store",
        name: fromName,
      },
      reply_to: {
        email: "support@vipfy.store",
        name: "Vipfy Support",
      },
    },
  });
  logger.debug("Sent email", { a, b });
};
