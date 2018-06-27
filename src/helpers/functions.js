import bcrypt from "bcrypt";
import { random } from "lodash";
import moment from "moment";

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

export const parentAdminCheck = async (models, user) => {
  await models.sequelize
    .query(
      "Select DISTINCT (id) from department_employee_view where id not in (Select childid from department_employee_view where childid is Not null) and employee = ?",
      { replacements: [user.id], type: models.sequelize.QueryTypes.SELECT }
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

export const checkDepartment = async (models, company, departmentid) => {
  const departments = await models.sequelize
    .query("Select * from getDepartments(?)", {
      replacements: [company]
    })
    .spread(res => res)
    .map(department => parseInt(department.id));

  if (!departments.includes(departmentid)) return false;

  return true;
};
