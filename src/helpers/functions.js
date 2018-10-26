import moment from "moment";
import models from "@vipfy-private/sequelize-setup";
import zxcvbn from "zxcvbn";
import { NormalError } from "../errors";
import { pubsub, NEW_NOTIFICATION } from "../constants";

/* eslint-disable no-return-assign */

export const getDate = () => new Date().toUTCString();

/**
 * Add the property company to the user object and set it to the companyid of the user
 *
 * @param {*} user
 */
export const parentAdminCheck = async user => {
  await models.sequelize
    .query(
      `Select DISTINCT (id) from department_employee_view where
        id not in (Select childid from department_employee_view where
        childid is Not null) and employee = :userId`,
      {
        replacements: { userId: user.id },
        type: models.sequelize.QueryTypes.SELECT
      }
    )
    .then(roots => roots.map(root => (user.company = root.id)));

  return user;
};

export const formatFilename = filename => {
  const date = moment().format("DDMMYYYY");
  const randomString = Math.random()
    .toString(36)
    .substring(2, 7);
  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, "-");

  return `${date}-${randomString}-${cleanFilename}`;
};

/**
 * check if sup is a superset of sub, i.e. if each element of sub is in sup
 * @param {*} sup
 * @param {*} sub
 */
export const superset = (sup, sub) => {
  sup.sort();
  sub.sort();
  let i, j;
  for (i = 0, j = 0; i < sup.length && j < sub.length; ) {
    if (sup[i] < sub[j]) {
      ++i;
    } else if (sup[i] == sub[j]) {
      ++i;
      ++j;
    } else {
      // sub[j] not in sup, so sub not subbag
      return false;
    }
  }
  // make sure there are no elements left in sub
  return j == sub.length;
};

/**
 * Gives back the first address which has all necessary properties
 * @param {object} accountData
 * @param {integer} iterator
 */
export const recursiveAddressCheck = (accountData, iterator = 0) => {
  if (!accountData[iterator]) {
    return null;
  }

  const { address } = accountData[iterator];

  if (!address.street || !address.zip || !address.city) {
    return recursiveAddressCheck(accountData, iterator + 1);
  }

  return accountData[iterator];
};

/**
 * Add an entry in our Log table
 * @param {string} ip
 * @param {string} eventtype
 * @param {object} eventdata
 * @param {integer} user
 * @param {object} transaction
 */
export const createLog = (ip, eventtype, eventdata, user, transaction) =>
  models.Log.create(
    {
      ip,
      eventtype,
      eventdata,
      user
    },
    { transaction, raw: true }
  );

export const formatHumanName = human =>
  `${human.firstname} ${human.lastname} ${human.suffix}`;

/**
 * Create a notification and send it to the user via Webhooks
 * @param {object} notificationBody
 * @param {string} transaction
 * notificationBody needs these properties:
 * @param {string} receiver
 * @param {string} message
 * @param {string} icon
 * @param {string} link
 */
export const createNotification = async (notificationBody, transaction) => {
  try {
    const sendtime = getDate();

    let notification = { dataValues: notificationBody };
    if (notificationBody.show !== false) {
      notification = await models.Notification.create(
        { ...notificationBody, sendtime },
        { transaction }
      );
    }

    pubsub.publish(NEW_NOTIFICATION, {
      newNotification: {
        ...notification.dataValues,
        changed: notificationBody.changed,
        show: notificationBody.show
      }
    });

    return notification;
  } catch (err) {
    return new NormalError({ message: err.message });
  }
};

/**
 * Computes the strength of the password on a scale from 0 to 4, with 0 being the weakest
 *
 * Only uses the first 50 characters of password for performance reasons
 *
 * @param {string} password
 */
export const computePasswordScore = password =>
  zxcvbn(password.substring(0, 50)).score;

/**
 * Checks whether a Plan and an App are still valid
 *
 * @param {object} plan
 *
 * @returns {boolean}
 */
export const checkPlanValidity = async plan => {
  if (plan.enddate && plan.enddate < Date.now()) {
    throw new Error(`The plan ${plan.name} has already expired!`);
  }

  const app = await models.App.findOne({
    where: { id: plan.appid, deprecated: false, disabled: false },
    raw: true
  });

  if (!app) {
    throw new Error("App not found, maybe it is disabled/deprecated");
  }

  return true;
};
