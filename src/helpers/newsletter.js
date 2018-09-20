import logger from "../loggers";

const cryptoRandomString = require("crypto-random-string");
const Client = require("@sendgrid/client");

Client.setApiKey(
  "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"
);

export async function newsletterSignup(models, email, name) {
  const token = cryptoRandomString(10);
  models.NewsletterSignup.create({ email, token, name });
  const [a, b] = await Client.request({
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
  logger.debug("Newsletter signup done", { a, b });
  return true;
}

export async function newsletterConfirmSignup(models, email, token) {}
