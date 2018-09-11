import { decode } from "jsonwebtoken";
import moment from "moment";
import dd24Api from "../../services/dd24";

import { requiresRight } from "../../helpers/permissions";
import {
  recursiveAddressCheck,
  createLog,
  createNotification
} from "../../helpers/functions";
import { PartnerError } from "../../errors";

export default {
  registerDomain: async (parent, { domainData }, { models, token, ip }) =>
    models.sequelize.transaction(async ta => {
      const {
        user: { unitid, company }
      } = decode(token);

      try {
        const hasAccount = await models.Domain.findOne({
          where: { unitid: company },
          raw: true
        });

        let register;
        let partnerLogs = {};

        if (hasAccount) {
          const mergedData = {
            cid: hasAccount.accountid,
            period: 1,
            ...domainData
          };
          register = await dd24Api("AddDomain", mergedData);
          domainData.accountid = register.cid;
        } else {
          const accountData = await models.sequelize.query(
            `SELECT ad.address, ad.country, pd.number as phone FROM unit_data hd
            INNER JOIN address_data ad ON ad.unitid = hd.unitid
            INNER JOIN phone_data pd ON pd.unitid = hd.unitid WHERE hd.unitid =
            :company AND ('domain' = ANY(ad.tags) OR 'main' = ANY(ad.tags))`,
            {
              replacements: { company },
              type: models.sequelize.QueryTypes.SELECT
            }
          );

          const accountDataCorrect = recursiveAddressCheck(accountData);

          if (!accountDataCorrect) {
            throw new Error(
              "Please make sure you have a valid address and retry then."
            );
          }

          const { address, ...account } = accountDataCorrect;
          const { street, zip, city } = address;

          const newOptions = {
            ...domainData,
            ...account,
            title: "Mr",
            firstname: "Domain",
            lastname: "Administrator",
            accountemail: "domains@vipfy.com",
            period: 1,
            street,
            zip,
            city,
            unitid: company
          };

          const organization = await models.Department.findOne({
            attributes: ["name"],
            raw: true,
            where: { unitid: company }
          });
          newOptions.organization = organization.name;

          register = await dd24Api("AddDomain", newOptions);
          partnerLogs = newOptions;
          partnerLogs.domain = register;
        }
        if (register.code == 200) {
          domainData.accountid = register.cid;
        } else {
          throw new Error(register.description);
        }

        const renewaldate = moment(Date.now())
          .add(1, "year")
          .subtract(1, "day");

        const domain = await models.Domain.create(
          { ...domainData, renewaldate, unitid },
          { returning: true }
        );

        const p1 = createLog(
          ip,
          "registerDomain",
          {
            ...partnerLogs,
            domain
          },
          unitid,
          ta
        );

        const p2 = createNotification(
          {
            receiver: unitid,
            message: `${domainData.domainname} successfully registered.`,
            icon: "laptop",
            link: "domains"
          },
          ta
        );

        await Promise.all([p1, p2]);

        return { ok: true };
      } catch (err) {
        createNotification({
          receiver: unitid,
          message: `Registration of ${domainData.domainname} failed.`,
          icon: "bug",
          link: "domains"
        });

        throw new PartnerError({
          message: err.message,
          internalData: {
            err,
            partner: "DD24"
          }
        });
      }
    }),

  /**
   * Update Whois Privacy or Renewal Mode of a domain. Updating both at the same
   * time is not possible!
   * @param domainData: object
   * domainData can contain the properties:
   * domain: string
   * renewalmode: enum
   * whoisPrivacy: integer
   * cid: string
   * dns: object[]
   * @param licenceid: integer
   * @returns {any}
   */
  updateDomain: requiresRight(["admin", "managedomains"]).createResolver(
    (parent, { domainData, licenceid: id }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const oldLicence = await models.Licence.findById(id, { raw: true });

          if (domainData.dns) {
            const rr = [];
            domainData.dns.forEach(dns => {
              rr.push({
                [dns.type]: [dns.data],
                ZONE: [dns.host],
                ADD: ["1"]
              });
            });

            domainData.rr = rr;
            delete domainData.dns;
            const updatedDNS = await dd24Api("UpdateDomain", domainData);

            if (updatedDNS && updatedDNS.code == 200) {
              const updatedLicence = await models.Licence.update(
                {
                  key: { dns: { ...domainData.dns } }
                },
                { transaction: ta, where: { id } }
              );

              await createLog(
                ip,
                "updateDomain",
                { updatedDNS, domainData, oldLicence, updatedLicence },
                unitid,
                ta
              );

              return { ok: true };
            } else {
              throw new Error(updatedDNS.description);
            }
          }

          // Has to be created here to avoid problems when using Promise.all
          let p1;

          let queryString = "UPDATE licence_data SET key = jsonb_set(key";

          if (domainData.hasOwnProperty("whoisPrivacy")) {
            const enddate = moment(Date.now()).add(1, "year");
            let planid;

            if (domainData.domain.indexOf(".org")) {
              planid = 53;
            } else if (domainData.domain.indexOf(".com")) {
              planid = 51;
            } else {
              planid = 52;
            }

            p1 = models.BoughtPlan.create(
              {
                planid,
                buyer: unitid,
                payer: company,
                enddate,
                disabled: false,
                description: `Whois Privacy for ${domainData.domain}`
              },
              { transaction: ta }
            );

            queryString += `, '{whoisPrivacy}', '"${domainData.whoisPrivacy}"'`;
          } else {
            queryString += `, '{renewalmode}', '"${
              domainData.renewalmode == "ONCE" ||
              domainData.renewalmode == "AUTODELETE"
                ? 0
                : 1
            }"'`;
          }
          queryString += `) WHERE id = ${id} AND unitid = ${unitid}`;

          const updateDomain = await dd24Api("UpdateDomain", domainData);

          if (updateDomain.code == 200) {
            const p2 = models.sequelize.query(queryString, { transaction: ta });
            const [boughtPlan, updatedLicence] = await Promise.all([p1, p2]);

            await createLog(
              ip,
              "updateDomain",
              { boughtPlan, domainData, oldLicence, updatedLicence },
              unitid,
              ta
            );

            return { ok: true };
          } else {
            throw new Error(updateDomain.description);
          }
        } catch (err) {
          throw new PartnerError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  )
};
