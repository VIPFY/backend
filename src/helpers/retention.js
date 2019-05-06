import models from "@vipfy-private/sequelize-setup";
import moment from "moment";
import logger from "../loggers";
import { sendEmail } from "./email";
import { formatHumanName } from "./functions";

export const notDownloaded = async () => {
  const yesterday = moment().subtract(1, "d");

  try {
    const users = await models.User.findAll({
      where: {
        lastactive: null,
        createdate: {
          [models.Op.lt]: models.sequelize.fn("NOW"),
          [models.Op.gt]: yesterday
        },
        hasdownloaded: false
      },
      raw: true
    });

    for await (const user of users) {
      await sendEmail({
        templateId: "d-4f80809afffe4ce2846350f9bf2a94da",
        fromName: "VIPFY Team",
        personalizations: [
          {
            to: [{ email: user.emails[1] }],
            dynamic_template_data: {}
          }
        ]
      });
    }
  } catch (error) {
    logger.error("Email could not be sent", error);
  }
};

export const notLoggedIn = async () => {
  const yesterday = moment().subtract(1, "d");

  try {
    const users = await models.User.findAll({
      where: {
        lastactive: null,
        createdate: {
          [models.Op.lt]: models.sequelize.fn("NOW"),
          [models.Op.gt]: yesterday
        }
      },
      raw: true
    });

    for await (const user of users) {
      await sendEmail({
        templateId: "d-4f80809afffe4ce2846350f9bf2a94da",
        fromName: "VIPFY Team",
        personalizations: [
          {
            to: [{ email: user.emails[1] }],
            dynamic_template_data: {}
          }
        ]
      });
    }
  } catch (error) {
    logger.error("Email could not be sent", error);
  }
};

export const notActive = async () => {
  const twoWeeksAgo = moment().subtract(2, "w");

  try {
    const users = await models.User.findAll({
      where: {
        lastactive: {
          [models.Op.not]: null,
          [models.Op.lt]: twoWeeksAgo
        }
      },
      raw: true
    });

    for await (const user of users) {
      await sendEmail({
        templateId: "d-35196caf5ec347feb8e1fd91425ece2f",
        fromName: "VIPFY Team",
        personalizations: [
          {
            to: [{ email: user.emails[1] }],
            dynamic_template_data: { name: formatHumanName(user) }
          }
        ]
      });
    }
  } catch (err) {
    logger.error("Email could not be sent", err);
  }
};

export const planEnds = async () => {
  try {
    const companies = await models.sequelize.query(
      `SELECT dd.*, extract(days from age(bd.endtime)) AS daysremaining, bd.planid, ed.email
      FROM department_data dd
        LEFT JOIN boughtplan_data bd
          ON bd.payer = dd.unitid
      LEFT JOIN email_data ed
          ON bd.payer = ed.unitid
      WHERE bd.planid IN (125, 126)
        AND bd.endtime NOTNULL
        AND NOW() > bd.endtime - INTERVAL '30 days'
        AND bd.endtime > NOW()
        AND 'billing' = ANY(ed.tags)
    `,
      { type: models.sequelize.QueryTypes.SELECT }
    );

    for await (const company of companies) {
      await sendEmail({
        templateId: "d-35196caf5ec347feb8e1fd91425ece2f",
        fromName: "VIPFY Team",
        personalizations: [
          {
            to: [{ email: company.emails[1] }],
            dynamic_template_data: { name: company.name }
          }
        ]
      });
    }

    return companies;
  } catch (err) {
    logger.error("Email could not be sent", err);
  }
};
