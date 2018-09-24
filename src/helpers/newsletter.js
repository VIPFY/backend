import logger from "../loggers";
import { NormalError } from "../errors";

const cryptoRandomString = require("crypto-random-string");
const Client = require("@sendgrid/client");

Client.setApiKey(
  "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"
);

export async function newsletterSignup(models, email, firstname, lastname) {
  const token = cryptoRandomString(10);
  const name = `${firstname} ${lastname}`;
  await models.NewsletterSignup.create({ email, token, firstname, lastname });
  const [a, b] = await Client.request({
    method: "POST",
    url: "/v3/mail/send",
    body: {
      template_id: "d-8059caceeda04753a138e623ba6f67e5",
      personalizations: [
        {
          to: [{ email, name }],
          dynamic_template_data: {
            name,
            url: `https://vipfy.store/verifyemail/${encodeURIComponent(
              email
            )}/${token}`
          }
        }
      ],
      from: {
        email: "no-reply@vifpy.store",
        name: "Vipfy Newsletter"
      },
      reply_to: {
        email: "support@vipfy.store",
        name: "Vipfy Support"
      }
    }
  });
  logger.debug("Newsletter signup done", { a, b });
  return true;
}

export async function newsletterConfirmSignup(models, email, token) {
  const signup = await models.NewsletterSignup.findOne({
    where: { email, token }
  });
  if (!signup) {
    throw new Error("Token not found");
  }
  if (signup.usedat) {
    // already successful in the past, no need to present user with error
    return true;
  }

  await signup.update({ usedat: new Date() });

  try {
    const unsentSignups = await models.NewsletterSignup.findAll({
      where: { uploadedat: null, usedat: { [models.Op.ne]: null } }
    });
    const signups = unsentSignups.map(v => ({
      email: v.email,
      first_name: v.firstname,
      last_name: v.lastname
    }));
    const [, response] = await Client.request({
      method: "POST",
      url: "/v3/contactdb/recipients",
      body: signups
    });
    logger.debug("Newsletter recipient upload", response);
    if (response.error_count != 0) {
      logger.error("Error uploading Newsletter Recipients", response.errors);
      for (const errorIndex of response.error_indices) {
        unsentSignups[errorIndex] = null;
      }
    }
    const p = [];
    for (const s of unsentSignups) {
      if (s === null) continue;
      p.push(s.update({ uploadedat: new Date() }));
    }
    await Promise.all(p);
  } catch (err) {
    logger.info("Couldn't upload newsletter email addresses");
    logger.info(err);
  }

  return true;
}
