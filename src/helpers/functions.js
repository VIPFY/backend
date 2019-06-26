import moment from "moment";
import soap from "soap";
import models from "@vipfy-private/sequelize-setup";
import zxcvbn from "zxcvbn";
import { createSubscription } from "../services/stripe";
import { NormalError } from "../errors";
import { pubsub, NEW_NOTIFICATION } from "../constants";

/* eslint-disable no-return-assign */

export const getDate = () => new Date().toUTCString();

/**
 * Add the property company to the user object and set it to the
 * companyid of the user
 * @exports
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
    { transaction }
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
  console.log("SENDED Notification to");
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
/**
 * Checks whether a vat number is valid
 *
 * @exports
 * @param {string} cc The two-digit country code
 * @param {string} vatNumber The vat number
 *
 * @returns {object}
 */
export const checkVat = async (cc, vatNumber) => {
  try {
    const apiWSDL =
      "http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl";
    const res = await soap.createClientAsync(apiWSDL).then(client =>
      client
        .checkVatAsync({ countryCode: cc, vatNumber })
        .then(result => result[0])
        .catch(err => {
          throw new Error(err);
        })
    );

    if (res.valid == false) {
      throw new Error(res);
    } else {
      return res;
    }
  } catch (error) {
    throw new Error("Invalid Vatnumber!");
  }
};

export const selectCredit = async (code, unitid) => {
  try {
    const p1 = models.Department.findOne({
      where: { unitid, promocode: code },
      raw: true
    });

    const p2 = models.Promocode.findOne(
      {
        where: {
          code,
          expires: { [models.Op.gt]: models.sequelize.fn("NOW") }
        }
      },
      { raw: true }
    );

    const [checkCode, credits] = await Promise.all([p1, p2]);

    if (!credits) {
      throw new Error("Invalid Promocode!");
    } else if (checkCode) {
      throw new Error("You already used this code");
    } else {
      return credits;
    }
  } catch (err) {
    throw new Error(err);
  }
};

/**
 * Takes an object and parses it into the form we need for the database
 * @exports
 * @param {object} addressComponents Unparsed components from Google
 *
 * @returns {object} addressData
 */
export const parseAddress = addressComponents => {
  const address = {};
  const street = [];
  const addressData = {};

  addressComponents.forEach(comp => {
    comp.types.every(type => {
      switch (type) {
        case "country":
          addressData.country = comp.short_name;
          break;

        case "postal_code":
          address.zip = comp.long_name;
          break;

        case "locality":
          address.city = comp.long_name;
          break;

        case "floor":
          street.push(comp.long_name);
          break;

        case "street_number":
          street.push(comp.long_name);
          break;

        case "route":
          street.push(comp.long_name);
          break;

        case "administrative_area_level_1":
          address.state = comp.short_name;
          break;

        default:
          return true;
      }
      return true;
    });
  });
  address.street = street.join(", ");
  addressData.address = address;

  return addressData;
};

/**
 * Checks whether an User has a Stripe Subscription and creates it if he doesn't
 * @extends
 * @param {ID} unitid
 * @param {object} plan
 * @param {object} ta
 */
export const checkPaymentData = async (unitid, plan, ta) => {
  try {
    const { payingoptions } = await models.Department.findOne({
      where: { unitid },
      raw: true
    });

    if (
      !payingoptions ||
      !payingoptions.stripe ||
      !payingoptions.stripe.cards ||
      payingoptions.stripe.cards.length < 1
    ) {
      throw new Error("Missing payment information!");
    }

    if (!payingoptions.stripe.subscription) {
      const subscription = await createSubscription(payingoptions.stripe.id, [
        { plan }
      ]);

      await models.DepartmentData.update(
        {
          payingoptions: {
            ...payingoptions,
            stripe: {
              ...payingoptions.stripe,
              subscription: subscription.id
            }
          }
        },
        { where: { unitid }, transaction: ta }
      );
      return subscription;
    }

    return null;
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Returns User `unitid` if the provided `employee` is in the `company`,
 * otherwise it throws an Exception
 * @param {ID} company
 * @param {ID} unitid
 * @param {ID} employee
 */
export const companyCheck = async (company, unitid, employee) => {
  try {
    // Do not use DepartmentEmployee any longer use departmentEmployeeTreeView instead
    /* const findCompany = models.DepartmentEmployee.findOne({
      where: { id: company, employee },
      raw: true
    }); */

    const findCompany = await models.sequelize.query(
      `
      SELECT level
      FROM department_tree_view
      WHERE id = :company and childid = :employee
    `,
      {
        replacements: { company, employee },
        raw: true,
        type: models.sequelize.QueryTypes.SELECT
      }
    );

    const findAdmin = models.User.findOne({ where: { id: unitid }, raw: true });

    const [inCompany, admin] = await Promise.all([findCompany, findAdmin]);

    if (!inCompany) {
      throw new Error("This user doesn't belong to this company!");
    }

    return admin;
  } catch (err) {
    throw new Error(err);
  }
};

export const groupBy = (list, keyGetter) => {
  const map = {};
  list.forEach(item => {
    const key = keyGetter(item);
    const collection = map[key];

    if (!collection) {
      map[key] = [item];
    } else {
      collection.push(item);
    }
  });
  return map;
};

/**
 * Checks whether a Team belongs to a Company. Throws an Error if not.
 *
 * @param {number} parentunit The company the Team belongs to
 * @param {number} childunit The Team
 */
export const teamCheck = async (parentunit, childunit) => {
  const team = await models.ParentUnit.findOne({
    where: { parentunit, childunit },
    raw: true
  });

  if (!team) {
    throw new Error("Team does not belong to company!");
  }
};

export const checkMailExistance = async email => {
  try {
    console.log("EMAIL", email);
    const emailExists = await models.Email.findOne({ where: { email } });
    console.log("EMAILEXISTS", emailExists);
    if (emailExists) {
      return true;
    }

    return false;
  } catch (err) {
    throw new NormalError({ message: err.message, internalData: { err } });
  }
};

export const checkMailPossible = email => {
  const tester = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
  // Thanks to:
  // http://fightingforalostcause.net/misc/2006/compare-email-regex.php
  // http://thedailywtf.com/Articles/Validating_Email_Addresses.aspx
  // http://stackoverflow.com/questions/201323/what-is-the-best-regular-expression-for-validating-email-addresses/201378#201378

  if (!email) return false;

  if (email.length > 254) return false;

  const valid = tester.test(email);
  if (!valid) return false;

  // Further checking of some things regex can't handle
  const parts = email.split("@");
  if (parts[0].length > 64) return false;

  const domainParts = parts[1].split(".");
  if (domainParts.some(part => part.length > 63)) {
    return false;
  }

  return true;
};
