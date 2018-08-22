import bcrypt from "bcrypt";
import { random } from "lodash";
import moment from "moment";
import models from "../models";

/* eslint-disable no-return-assign */

export const getDate = () => new Date().toUTCString();

export const createPassword = async email => {
  // A password musst be created because otherwise the not null rule of the
  // database is violated
  const passwordHash = await bcrypt.hash(email, 5);

  // Change the given hash to improve security
  const start = random(3, 8);
  const newHash = await passwordHash.replace("/", 2).substr(start);

  return newHash;
};

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
      { replacements: { userId: user.id }, type: models.sequelize.QueryTypes.SELECT }
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

/*
* Check whether the department belongs to the company
*/
export const checkDepartment = async (company, departmentid) => {
  if (company == departmentid) return true;

  const departments = await models.sequelize
    .query("SELECT childid FROM department_tree_view WHERE id = ? AND level > 1", {
      replacements: [company]
    })
    .spread(res => res)
    .map(department => parseInt(department.childid));

  if (!departments.includes(departmentid)) {
    throw new Error("This department doesn't belong to the users company!");
  }

  return true;
};

/**
 * check if sup is a superset of sub, i.e. if each element of sub is in sup
 * @param {*} sup
 * @param {*} sub
 */
export const superset = (sup, sub) => {
  sup.sort();
  sub.sort();
  let i,
    j;
  for (i = 0, j = 0; i < sup.length && j < sub.length;) {
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
