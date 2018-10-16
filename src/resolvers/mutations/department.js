import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { userPicFolder, MAX_PASSWORD_LENGTH } from "../../constants";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { deleteFile, uploadFile } from "../../services/gcloud";
import { createTokens } from "../../helpers/auth";
import { NormalError } from "../../errors";
import {
  createLog,
  createNotification,
  formatHumanName,
  computePasswortScore
} from "../../helpers/functions";
import { resetCompanyMembershipCache } from "../../helpers/companyMembership";
import { sendEmail } from "../../helpers/email";

// import { sendRegistrationEmail } from "../../services/mailjet";

export default {
  createCompany: requiresAuth.createResolver(
    async (parent, { name }, { models, token, SECRET, SECRET_TWO, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company: companyExists }
          } = decode(token);

          if (companyExists) {
            throw new Error("This user is already assigned to a company!");
          }

          const parentunit = await models.ParentUnit.findOne({
            where: { childunit: unitid }
          });

          const founderEmail = models.Email.findOne(
            { where: { unitid } },
            { raw: true }
          );

          if (parentunit) {
            throw new Error("This user is already assigned to a company!");
          }

          let company = await models.Unit.create({}, { transaction: ta });
          company = company.get();

          const p1 = models.Right.create(
            { holder: unitid, forunit: company.id, type: "admin" },
            { transaction: ta }
          );

          const p2 = models.DepartmentData.create(
            { unitid: company.id, name },
            { transaction: ta }
          );

          const p3 = models.ParentUnit.create(
            { parentunit: company.id, childunit: unitid },
            { transaction: ta }
          );

          const p4 = models.Email.create({
            ...founderEmail,
            unitid: company,
            tags: ["main", "billing"]
          });

          let [rights, department, parentUnit, email] = await Promise.all([
            p1,
            p2,
            p3,
            p4
          ]);

          rights = rights.get();
          department = department.get();
          parentUnit = parentUnit.get();
          email = email.get();

          const p5 = createLog(
            ip,
            "createCompany",
            {
              company,
              rights,
              department,
              parentUnit,
              email
            },
            unitid,
            ta
          );

          const p6 = await models.Login.findOne(
            { where: { unitid } },
            { transaction: ta }
          );

          const [user] = await Promise.all([p6, p5]);

          const refreshTokenSecret = user.passwordhash + SECRET_TWO;
          const [newToken, refreshToken] = await createTokens(
            { unitid, company: company.id },
            SECRET,
            refreshTokenSecret
          );

          resetCompanyMembershipCache(company.id, unitid);

          return { ok: true, token: newToken, refreshToken };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),
  /**
   * Updates the statistics of a company like industry and sets the vatid.
   *
   * @param {object} data contains various data
   *
   * @returns {object}
   */
  updateStatisticData: requiresRights(["edit-departments"]).createResolver(
    (parent, { data }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: id, company: unitid }
          } = decode(token);

          const currentData = await models.Department.findOne({
            where: { unitid },
            attributes: ["statisticdata", "payingoptions"],
            raw: true,
            transaction: ta
          });

          const { vatid, ...statistics } = data;

          const newData = await models.DepartmentData.update(
            {
              statisticdata: { ...currentData.statisticdata, ...statistics },
              payingoptions: { ...currentData.payingoptions, vatid }
            },
            { where: { unitid }, transaction: ta, returning: true }
          );

          await createLog(
            ip,
            "updateStatisticData",
            { currentData, newData: newData[1] },
            id,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  addEmployee: requiresRights(["create-employees"]).createResolver(
    (parent, { unitid, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: adder, company }
          } = decode(token);

          let parentUnit = await models.ParentUnit.create(
            { parentunit: departmentid, childunit: unitid },
            { transaction: ta }
          );

          parentUnit = parentUnit.get();

          await createLog(
            ip,
            "addEmployee",
            { unitid, departmentid, parentUnit },
            adder,
            ta
          );

          // just in case. This mutation shouldn't change actual company membership
          resetCompanyMembershipCache(departmentid, unitid);
          resetCompanyMembershipCache(company, unitid);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  addCreateEmployee: requiresRights(["create-employees"]).createResolver(
    async (
      parent,
      { email, password, name, departmentid },
      { models, token, ip }
    ) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const isEmail = email.indexOf("@");

          if (isEmail < 0) {
            throw new Error("Please enter a valid Email!");
          }

          const emailInUse = await models.Email.findOne({ where: { email } });
          if (emailInUse) throw new Error("Email already in use!");
          if (password.length > MAX_PASSWORD_LENGTH) {
            throw new Error("Password too long");
          }

          const passwordhash = await bcrypt.hash(password, 12);
          const passwordstrength = computePasswortScore(password);

          let unit = await models.Unit.create({}, { transaction: ta });
          unit = unit.get();

          const p1 = models.Human.create(
            {
              firstname: name.firstname,
              middlename: name.middlename,
              lastname: name.lastname,
              title: name.title,
              suffix: name.suffix,
              unitid: unit.id,
              passwordhash,
              needspasswortchange: true,
              firstlogin: true,
              passwordlength: password.length,
              passwordstrength
            },
            { transaction: ta }
          );

          const p2 = models.Email.create(
            { email, unitid: unit.id, verified: true },
            { transaction: ta }
          );

          const p3 = models.ParentUnit.create(
            { parentunit: departmentid, childunit: unit.id },
            { transaction: ta }
          );

          const p4 = models.Human.findOne({ where: { unitid } });

          const p5 = models.DepartmentData.findOne({
            where: { unitid: company }
          });

          let [
            human,
            newEmail,
            parentUnit,
            requester,
            companyObj
          ] = await Promise.all([p1, p2, p3, p4, p5]);
          human = human.get();
          newEmail = newEmail.get();
          parentUnit = parentUnit.get();

          await createLog(
            ip,
            "addCreateEmployee",
            { unit, human, newEmail, parentUnit },
            unitid,
            ta
          );

          // brand new person, but better to be too careful
          resetCompanyMembershipCache(departmentid, unit.id);
          resetCompanyMembershipCache(company, unit.id);

          await sendEmail({
            templateId: "d-e049cce50d20428d81f011e521605d4c",
            fromName: "VIPFY",
            personalizations: [
              {
                to: [
                  {
                    email,
                    name: formatHumanName(name)
                  }
                ],
                dynamic_template_data: {
                  name: formatHumanName(name),
                  creator: formatHumanName(requester),
                  companyname: companyObj.name,
                  email,
                  password
                }
              }
            ]
          });

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  addSubDepartment: requiresRights(["create-departments"]).createResolver(
    async (parent, { departmentid, name }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          let unit = await models.Unit.create({}, { transaction: ta });
          unit = unit();

          const p1 = models.DepartmentData.create(
            { unitid: unit.id, name },
            { transaction: ta }
          );

          const p2 = models.ParentUnit.create(
            { parentunit: departmentid, childunit: unit.id },
            { transaction: ta }
          );

          let [department, parentUnit] = await Promise.all([p1, p2]);
          department = department.get();
          parentUnit = parentUnit.get();

          await createLog(
            ip,
            "addSubDepartment",
            { unit, department, parentUnit },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  editDepartmentName: requiresRights(["edit-departments"]).createResolver(
    (parent, { departmentid, name }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const updatedDepartment = await models.DepartmentData.update(
            { name },
            {
              where: { unitid: departmentid },
              returning: true,
              transaction: ta
            }
          );

          await createLog(
            ip,
            "editDepartmentName",
            { updatedDepartment: updatedDepartment[1] },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  deleteSubDepartment: requiresRights(["delete-departments"]).createResolver(
    async (parent, { departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const options = { transaction: ta, raw: true };
          const updateOptions = {
            where: { id: departmentid },
            returning: true,
            ...options
          };
          const destroyData = {
            where: { unitid: departmentid },
            options
          };

          const p1 = models.Unit.findOne(updateOptions);
          const p2 = models.DepartmentData.findOne(updateOptions);
          const p3 = models.Email.findOne(destroyData);
          const p4 = models.Address.findOne(destroyData);
          const p5 = models.Phone.findOne(destroyData);
          const p6 = models.ParentUnit.findOne(
            {
              where: {
                [models.Op.or]: [
                  { childunit: departmentid },
                  { parentunit: departmentid }
                ]
              }
            },
            options
          );

          const p7 = models.Unit.update({ deleted: true }, updateOptions);
          const p8 = models.DepartmentData.update(
            { name: "Deleted Department" },
            updateOptions
          );
          const p9 = models.Email.destroy(destroyData);
          const p10 = models.Address.destroy(destroyData);
          const p11 = models.Phone.destroy(destroyData);
          const p12 = models.ParentUnit.destroy(
            {
              where: {
                [models.Op.or]: [
                  { childunit: departmentid },
                  { parentunit: departmentid }
                ]
              }
            },
            options
          );

          const [
            oldUnit,
            oldDepartment,
            oldEmail,
            oldAddress,
            oldPhone,
            oldParentUnit
          ] = await Promise.all([p1, p2, p3, p4, p5, p6]);
          await Promise.all([p7, p8, p9, p10, p11, p12]);

          await createLog(
            ip,
            "deleteSubDepartment",
            {
              oldUnit,
              oldDepartment,
              oldEmail,
              oldAddress,
              oldPhone,
              oldParentUnit
            },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  removeEmployee: requiresRights(["delete-employees"]).createResolver(
    async (parent, { unitid, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: id, company }
          } = decode(token);

          const oldParentUnit = await models.ParentUnit.findOne({
            where: { parentunit: departmentid, childunit: unitid }
          });

          await models.ParentUnit.destroy({
            where: { parentunit: departmentid, childunit: unitid },
            transaction: ta
          });

          await createLog(
            ip,
            "removeEmployee",
            {
              oldParentUnit
            },
            id,
            ta
          );

          resetCompanyMembershipCache(departmentid, unitid);
          resetCompanyMembershipCache(company, unitid);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  fireEmployee: requiresRights(["delete-employees"]).createResolver(
    async (parent, { unitid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: id, company }
          } = decode(token);

          const p1 = await models.Unit.findById(unitid);
          const p2 = models.Human.findOne({
            where: { unitid },
            transaction: ta,
            raw: true
          });
          const p3 = models.Email.findOne({
            where: { unitid },
            raw: true,
            transaction: ta
          });
          const p4 = models.Address.findOne({
            where: { unitid },
            raw: true,
            transaction: ta
          });
          const p5 = models.ParentUnit.destroy({
            where: { childunit: unitid },
            raw: true,
            transaction: ta
          });

          const [
            oldUnit,
            oldHuman,
            oldEmail,
            oldAddress,
            oldParentUnit
          ] = await Promise.all([p1, p2, p3, p4, p5]);

          if (oldUnit.deleted) throw new Error("User already deleted!");

          const p6 = models.Unit.update(
            { deleted: true, profilepicture: "" },
            { where: { id: unitid } },
            { transaction: ta, returning: true }
          );

          const p7 = models.Human.update(
            { firstname: "Deleted", middlename: "", lastname: "User" },
            { where: { unitid } },
            { transaction: ta, returning: true }
          );

          const p8 = models.Email.destroy(
            { where: { unitid } },
            { transaction: ta }
          );

          const p9 = models.Address.update(
            { address: { city: "deleted" }, description: "deleted" },
            { where: { unitid } },
            { transaction: ta, returning: true }
          );

          const p10 = models.ParentUnit.destroy(
            { where: { childunit: unitid } },
            { transaction: ta }
          );

          await Promise.all([p6, p7, p8, p9, p10]);

          if (oldUnit.profilepicture) {
            await deleteFile(oldUnit.profilepicture, userPicFolder);
          }

          await createLog(
            ip,
            "fireEmployee",
            {
              oldUnit,
              oldHuman,
              oldEmail,
              oldAddress,
              oldParentUnit
            },
            id,
            ta
          );

          resetCompanyMembershipCache(company, unitid);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateCompanyPic: requiresRights(["edit-departments"]).createResolver(
    async (parent, { file }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const profilepicture = await uploadFile(file, userPicFolder);
          const {
            user: { company: id }
          } = decode(token);

          const oldUnit = await models.Unit.findOne({
            where: { id },
            raw: true
          });

          const updatedUnit = await models.Unit.update(
            { profilepicture },
            { where: { id }, returning: true, transaction: ta }
          );

          await createLog(
            ip,
            "updateCompanyPic",
            { oldUnit, updatedUnit: updatedUnit[1] },
            id,
            ta
          );

          return profilepicture;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  /**
   * Save the data collected by the Google Places API to our database
   *
   * @param {object} data Contains address, phone, website, company and icon
   */
  saveProposalData: async (parent, { data }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { unitid, company }
        } = decode(token);

        const { website, international_phone_number, name } = data;
        const promises = [];
        const addressData = { unitid: company, tags: ["main"] };
        const address = {};
        const street = [];

        data.address_components.forEach(comp => {
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
        const p1 = models.Address.create(addressData, { transaction: ta });

        promises.push(p1);

        if (name) {
          const p2 = models.DepartmentData.update(
            { name },
            {
              transaction: ta,
              where: { unitid: company }
            }
          );

          promises.push(p2);
        }

        if (website) {
          const p3 = models.Website.create(
            {
              website,
              verified: true,
              autogenerated: false,
              unitid: company
            },
            { transaction: ta }
          );

          promises.push(p3);
        }

        if (international_phone_number) {
          const p4 = models.Phone.create(
            {
              unitid: company,
              number: international_phone_number,
              verified: true,
              tags: ["main"],
              autogenerated: false
            },
            { transaction: ta }
          );

          promises.push(p4);
        }

        await Promise.all(promises);

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    })
};
