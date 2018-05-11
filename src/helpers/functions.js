import bcrypt from "bcrypt";
import { random } from "lodash";

export const getDate = () => {
  const time = new Date().getTime();
  return new Date(time).toString();
};

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
    .then(roots => roots.map(root => user.set({ company: root.id })));

  const isAdmin = await models.Right.findOne({
    where: { holder: user.id, forunit: user.company, type: "admin" }
  });
  await user.set({ admin: !!isAdmin });

  return user;
};
