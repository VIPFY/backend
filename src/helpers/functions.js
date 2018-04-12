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
