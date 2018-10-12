import { Client as ClientClass } from "@sendgrid/client";

const Client = new ClientClass();

Client.setApiKey(
  "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"
);

// eslint-disable-next-line import/prefer-default-export
export const sendEmail = async ({ templateId, personalizations, fromName }) => {
  await Client.request({
    method: "POST",
    url: "/v3/mail/send",
    body: {
      template_id: templateId,
      personalizations,
      from: {
        email: "no-reply@vifpy.store",
        name: fromName
      },
      reply_to: {
        email: "support@vipfy.store",
        name: "Vipfy Support"
      }
    }
  });
};
