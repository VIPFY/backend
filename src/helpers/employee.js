import { parseName } from "humanparser";
import { getNewPasswordData } from "./auth";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../constants";
import { checkMailExistance } from "./functions";

/**
 * Creates a Human and add him to the company. Returns new unitid
 *
 *
 * @param {models} models
 * @param {tansaction} ta
 * @param {company} company
 * @param {name} name
 * @param {password} password
 * @param {mail1} mail1
 * @param {mail2} mail2
 */

export const createHuman = async (
  models,
  ta,
  company,
  name,
  password,
  mail1,
  mail2
) => {
  try {
    console.log("CREATE HUMAN", company, name, password, mail1, mail2);
    // Check Mails
    if (!mail1) {
      throw new Error("No Email-Adress given!");
    }

    if (mail1.indexOf("@") < 0) {
      throw new Error("Please enter a valid Email!");
    }

    /* if (await checkMailExistance(mail1)) {
      throw new Error("Email already in use!");
    } */
    const emailInUse = await models.Email.findOne({
      where: { email: mail1 }
    });
    if (emailInUse) throw new Error("Email already in use!");

    // Check Password
    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new Error("Password too long");
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error("Password too short");
    }

    const pwData = await getNewPasswordData(password);

    let unit = await models.Unit.create({}, { transaction: ta });
    unit = unit.get();

    const username = parseName(name);
    const promises = [];

    promises.push(
      models.Human.create(
        {
          title: username.salutation || "",
          firstname: username.firstName || "",
          middlename: username.middleName || "",
          lastname: username.lastName || "",
          suffix: username.suffix || "",
          unitid: unit.id,
          needspasswordchange: true,
          firstlogin: true,
          ...pwData,
          statisticdata: {
            name
          }
        },
        { transaction: ta, raw: true }
      )
    );

    promises.push(
      models.Email.create(
        { email: mail1, unitid: unit.id, verified: true },
        { transaction: ta }
      )
    );
    if (mail2 && mail2 != "") {
      promises.push(
        models.Email.create(
          { email: mail2, unitid: unit.id, verified: true },
          { transaction: ta }
        )
      );
    }
    promises.push(
      models.ParentUnit.create(
        { parentunit: company, childunit: unit.id },
        { transaction: ta }
      )
    );

    await Promise.all(promises);

    return unit.id;
  } catch (err) {
    throw new Error(err);
  }
};

export const deleteHuman = async id => {
  // Less red ;)
  const a = 1;
  return id + a;
};
