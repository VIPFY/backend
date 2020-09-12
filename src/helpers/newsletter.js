import { Client as ClientClass } from "@sendgrid/client";
import models from "@vipfy-private/sequelize-setup";
import logger from "../loggers";
import { sendEmail } from "./email";

const Client = new ClientClass();

Client.setApiKey(
  "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"
);

const cryptoRandomString = require("crypto-random-string");

/**
 * Creates an entry in the newsletter table and signs the user up in Sendgrid
 * @param {string} email
 * @param {string} [firstname]
 * @param {string} [lastname]
 */
export async function newsletterSignup(email, firstname, lastname, ta) {
  const token = await cryptoRandomString(10);

  let name = "";

  if (firstname) {
    name += firstname;
  }

  if (lastname) {
    name += ` ${lastname}`;
  }

  await models.NewsletterSignup.create(
    { email, token, firstname, lastname },
    { transaction: ta }
  );

  await sendEmail({
    templateId: "d-8059caceeda04753a138e623ba6f67e5",
    fromName: "VIPFY Newsletter",
    personalizations: [
      {
        to: [{ email, name: name.trim() }],
        dynamic_template_data: {
          name: name.trim(),
          url: `https://vipfy.store/verifyemail/${encodeURIComponent(
            email
          )}/${token}`,
        },
      },
    ],
  });
  logger.debug("Newsletter signup done");
  return true;
}

export async function newsletterConfirmSignup(email, token) {
  const signup = await models.NewsletterSignup.findOne({
    where: { email, token },
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
      where: { uploadedat: null, usedat: { [models.Op.ne]: null } },
    });

    const signups = unsentSignups.map(v => ({
      email: v.email,
      first_name: v.firstname,
      last_name: v.lastname,
    }));

    const [, response] = await Client.request({
      method: "POST",
      url: "/v3/contactdb/recipients",
      body: signups,
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
