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
  registerDomain: requiresRight(["admin", "registerdomain"]).createResolver(
    async (parent, { domainData }, { models, token, ip }) =>
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
          domainData.renewalmode = "AUTORENEW";

          if (hasAccount) {
            const mergedData = {
              cid: hasAccount.accountid,
              period: 1,
              ...domainData
            };

            register = await dd24Api("AddDomain", mergedData);

            if (register.code == "200") {
              domainData.accountid = hasAccount.accountid;
            } else {
              throw new Error(register.description);
            }
          } else {
            const accountData = await models.sequelize.query(
              `SELECT ad.address, ad.country, pd.number as phone FROM unit_data hd
              INNER JOIN address_data ad ON ad.unitid = hd.id INNER JOIN phone_data pd
              ON pd.unitid = hd.id WHERE hd.id = :company AND
              ('domain' = ANY(ad.tags) OR 'main' = ANY(ad.tags))`,
              {
                replacements: { company },
                type: models.sequelize.QueryTypes.SELECT
              }
            );

            if (accountData.length == 0) {
              throw new Error("Address or Telefonnumber missing.");
            }

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
              email: "domains@vipfy.com",
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

            if (register.code == "200") {
              domainData.accountid = register.cid;
            } else {
              throw new Error(register.description);
            }
          }

          const renewaldate = moment(Date.now())
            .add(1, "year")
            .subtract(1, "day");

          const domain = await models.Domain.create(
            {
              ...domainData,
              accountemail: "domains@vipfy.com",
              domainname: domainData.domain,
              renewalmode: "AUTORENEWAL",
              renewaldate,
              unitid: company
            },
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
              message: `${domainData.domain} successfully registered.`,
              icon: "laptop",
              link: "domains"
            },
            ta
          );

          await Promise.all([p1, p2]);

          return domain;
        } catch (err) {
          createNotification({
            receiver: unitid,
            message: `Registration of ${domainData.domain} failed.`,
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
      })
  ),

  /**
   * Update Whois Privacy or Renewal Mode of a domain. Updating both at the same
   * time is not possible!
   * @param id: integer
   * @param domainData: object
   * domainData can contain the properties:
   * domain: string
   * renewalmode: enum
   * whoisPrivacy: integer
   * cid: string
   * dns: object[]
   * @returns {any}
   */
  updateDomain: requiresRight(["admin", "managedomains"]).createResolver(
    (parent, { domainData, id }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const oldDomain = await models.Domain.findOne(
            { where: { id } },
            {
              raw: true,
              transaction: ta
            }
          );
          domainData.cid = oldDomain.accountid;
          domainData.domain = oldDomain.domainname;

          // Update of the domains DNS settings
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
              const updatedDomain = await models.Domain.update(
                {
                  dns: { ...domainData.dns }
                },
                { transaction: ta, where: { id } }
              );

              await createLog(
                ip,
                "updateDomain",
                { updatedDNS, domainData, oldDomain, updatedDomain },
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

          const toUpdate = {};

          if (domainData.hasOwnProperty("whoisprivacy")) {
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
            toUpdate.whoisprivacy = domainData.whoisprivacy;
          } else {
            toUpdate.renewalmode =
              domainData.renewalmode == "ONCE" ||
              domainData.renewalmode == "AUTODELETE"
                ? "AUTODELETE"
                : "AUTORENEW";
          }
          const updateDomain = await dd24Api("UpdateDomain", domainData);

          if (updateDomain.code == 200) {
            const p2 = models.Domain.update(
              { ...toUpdate },
              {
                where: { id, unitid: company },
                transaction: ta,
                returning: true
              }
            );
            const [boughtPlan, updatedDomain] = await Promise.all([p1, p2]);

            await createLog(
              ip,
              "updateDomain",
              { boughtPlan, domainData, oldDomain, updatedDomain },
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
