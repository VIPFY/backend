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

          let totalprice;
          let register;
          const additionalfeatures = {};
          const totalfeatures = {
            domain: domainData.domain,
            renewalmode: "AUTORENEW"
          };
          let partnerLogs = {};
          domainData.renewalmode = "AUTORENEW";

          // eslint-disable-next-line
          switch (domainData.tld) {
            case "com":
              totalprice = 10;
              break;

            case "org":
              totalprice = 15;
              break;

            case "net":
              totalprice = 20;
          }

          if (domainData.whoisprivacy == 1) {
            totalprice += 5;
            additionalfeatures.whoisprivacy = true;
            totalfeatures.whoisprivacy = true;
          }

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

          const boughtPlan = await models.BoughtPlan.create(
            {
              buyer: unitid,
              payer: company,
              planid: 25,
              disabled: false,
              totalprice,
              description: `Registration of ${domainData.domain}`,
              additionalfeatures,
              totalfeatures
            },
            { transaction: ta }
          );

          const domain = await models.Domain.create(
            {
              ...domainData,
              boughtplanid: boughtPlan.dataValues.id,
              accountemail: "domains@vipfy.com",
              domainname: domainData.domain,
              renewalmode: "AUTORENEWAL",
              renewaldate,
              unitid: company
            },
            { transaction: ta }
          );

          const p1 = createLog(
            ip,
            "registerDomain",
            {
              ...partnerLogs,
              domain,
              boughtPlan
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
        const {
          user: { unitid, company }
        } = decode(token);

        try {
          const oldDomain = await models.Domain.findOne(
            { where: { id } },
            {
              raw: true,
              transaction: ta
            }
          );
          domainData.cid = oldDomain.accountid;
          domainData.domain = oldDomain.domainname;
          let message;

          // Update of the domains DNS settings
          if (domainData.dns) {
            message = `DNS update of ${domainData.domain} was successful`;

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

              const log = await createLog(
                ip,
                "updateDomain",
                { updatedDNS, domainData, oldDomain, updatedDomain },
                unitid,
                ta
              );

              const notification = createNotification(
                {
                  receiver: unitid,
                  message,
                  icon: "laptop",
                  link: "domains"
                },
                ta
              );

              await Promise.all([log, notification]);

              return { ok: true };
            } else {
              throw new Error(updatedDNS.description);
            }
          }

          // Has to be created here to avoid problems when using Promise.all
          let p1;
          const toUpdate = {};
          const addLogs = {};

          if (domainData.hasOwnProperty("whoisprivacy")) {
            const endtime = new Date();
            let totalprice = 5;
            const additionalfeatures = { whoisprivacy: true };
            message = `Whois Privacy for ${
              domainData.domain
            } was successfully applied`;

            const totalfeatures = {
              domain: domainData.domain,
              renewalmode: "AUTORENEW",
              whoisprivacy: true
            };

            if (domainData.domain.indexOf(".org")) {
              totalprice += 15;
            } else if (domainData.domain.indexOf(".com")) {
              totalprice += 10;
            } else {
              totalprice += 20;
            }

            const predecessor = await models.BoughtPlan.findOne(
              { where: { id: oldDomain.boughtplanid } },
              { raw: true }
            );

            const bpOld = models.BoughtPlan.update(
              {
                endtime,
                planid: 25
              },
              {
                where: {
                  id: predecessor.id
                },
                transaction: ta,
                returning: true
              }
            );

            const bpNew = await models.BoughtPlan.create(
              {
                buyer: unitid,
                predecessor: predecessor.id,
                payer: company,
                planid: 25,
                disabled: false,
                totalprice,
                description: `Registration of ${domainData.domain}`,
                additionalfeatures,
                totalfeatures
              },
              { transaction: ta, returning: true }
            );

            const [oldBoughtPlan, updatedBoughtPlan] = await Promise.all([
              bpOld,
              bpNew
            ]);

            toUpdate.whoisprivacy = domainData.whoisprivacy;
            addLogs.oldBoughtPlan = oldBoughtPlan;
            addLogs.updatedBoughtPlan = updatedBoughtPlan;
          } else {
            toUpdate.renewalmode =
              domainData.renewalmode == "ONCE" ||
              domainData.renewalmode == "AUTODELETE"
                ? "AUTODELETE"
                : "AUTORENEW";

            message = `Renewal of ${domainData.domain} was successful`;
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

            const log = createLog(
              ip,
              "updateDomain",
              { boughtPlan, domainData, oldDomain, updatedDomain, ...addLogs },
              unitid,
              ta
            );

            const notification = createNotification(
              {
                receiver: unitid,
                message,
                icon: "laptop",
                link: "domains"
              },
              ta
            );

            await Promise.all([log, notification]);

            return { ok: true };
          } else {
            throw new Error(updateDomain.description);
          }
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Update failed",
              icon: "laptop",
              link: "domains"
            },
            ta
          );
          throw new PartnerError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  )
};
