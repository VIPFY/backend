import * as cryptoRandomString from "crypto-random-string";

const Client = require("@sendgrid/client");

const sendgrid = Client(
  "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"
);

export async function newsletterSignup(models, email, name) {
  const token = cryptoRandomString(10);
  models.newsletterSignup.create({ email, token, name });
  await sendgrid.request({
    method: "POST",
    url: "/v3/mail/send",
    body: {
      template_id: "d-8059caceeda04753a138e623ba6f67e5",
      personalizations: [
        {
          to: { email, name },
          substitutions: {
            name,
            url: `https://vipfy.store/verifyemail/${encodeURIComponent(
              email
            )}/${token}`
          },
          from: {
            email: "no-reply@vifpy.store",
            name: "Vipfy Newsletter"
          },
          reply_to: {
            email: "support@vipfy.store",
            name: "Vipfy Support"
          }
        }
      ]
    }
  });
  return true;
}

export async function newsletterConfirmSignup(models, email, token) {}
