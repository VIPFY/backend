import { decode } from "jsonwebtoken";
import punycode from "punycode";
import {
  checkDomain,
  registerDomain,
  createContact,
  getDomainSuggestion,
  toggleWhoisPrivacy,
  transferIn,
  toggleRenewalMode,
  addNs,
  removeNs,
  setNs
} from "../../services/rrp";
import { requiresRights } from "../../helpers/permissions";
import {
  recursiveAddressCheck,
  createLog,
  createNotification
} from "../../helpers/functions";
import { PartnerError, NormalError } from "../../errors";

export default {
  checkDomain: async (parent, { domain }, { models }) => {
    try {
      const domainPlans = await models.Plan.findAll({
        where: {
          appid: 11,
          name: {
            [models.Op.and]: [
              { [models.Op.notLike]: "RRP%" },
              { [models.Op.notLike]: "WHOIS%" }
            ]
          },
          enddate: {
            [models.Op.or]: {
              [models.Op.eq]: null,
              [models.Op.gt]: models.sequelize.fn("NOW")
            }
          }
        },
        raw: true
      });

      const splitName = domain.split(".");
      const punycodeDomain = punycode.toASCII(splitName[0]);

      const domains = domainPlans.map(plan => `${punycodeDomain}.${plan.name}`);

      const p1 = checkDomain(domains);
      const p2 = getDomainSuggestion(punycodeDomain);

      const [domainCheck, suggestions] = await Promise.all([p1, p2]);

      if (domainCheck.code != 200) {
        throw new Error(domainCheck.description);
      }

      const domainList = Object.keys(domainCheck)
        // Filter out the props which are not domains
        .filter(item => item.includes("[domaincheck]"))
        .map((item, key) => ({
          domain: punycode.toUnicode(domains[key]),
          availability: domainCheck[item].substring(0, 3),
          price: domainPlans[key].price,
          currency: domainPlans[key].currency,
          description: domainCheck[item].substring(4)
        }));

      if (splitName.length > 1) {
        domainList.sort(a => (a.domain == domain ? -1 : 1));
      }

      const suggestionList = [];

      Object.keys(suggestions)
        .filter(item => item.includes("property[name]"))
        .forEach((item, key) => {
          if (suggestions[`property[availability][${key}]`] == "available") {
            const [, tld] = suggestions[item].split(".");
            const plan = domainPlans.find(el => el.name == tld);

            suggestionList.push({
              domain: punycode.toUnicode(suggestions[item]),
              availability: "210",
              price: plan.price,
              currency: plan.currency,
              description: "available"
            });
          }
        });

      return { domains: domainList, suggestions: suggestionList };
    } catch (err) {
      throw new PartnerError({
        message: err.message,
        internalData: { err, partner: "RRP" }
      });
    }
  },
  /**
   * Register a Domain with our Partner RRP Proxy
   *
   * @param {object} domainData Contains the domain as well as the options
   * @param {number} totalPrice The total price of all domains and features
   * @param {boolean} agb Confirmation of our terms of service and privacy agreement
   *
   * @returns {object} domain The registered Domain
   */
  registerDomains: requiresRights(["create-domains"]).createResolver(
    async (parent, { domainData, totalPrice, agb }, { models, token, ip }) => {
      const {
        user: { unitid, company }
      } = decode(token);

      try {
        if (!agb) {
          throw new Error(
            "Terms of Service and Privacy Agreement not confirmed!"
          );
        }

        const p1 = models.Department.findOne({
          raw: true,
          where: { unitid: company }
        });

        const p2 = models.Plan.findOne({
          where: { name: "WHOIS privacy", appid: 11 },
          raw: true
        });

        const p3 = models.Domain.findOne({
          where: { unitid: company, external: false },
          raw: true,
          attributes: ["contactid"]
        });

        const [organization, whoisPlan, oldDomain] = await Promise.all([
          p1,
          p2,
          p3
        ]);

        if (
          !organization.payingoptions ||
          !organization.payingoptions.stripe ||
          !organization.payingoptions.stripe.cards ||
          organization.payingoptions.stripe.cards.length < 1
        ) {
          throw new Error("Missing payment information!");
        }

        let total = 0;

        // Check whether the price from the frontend was correct
        for await (const domain of domainData) {
          const tld = domain.domain.split(".")[1];

          const plan = await models.Plan.findOne({
            where: { name: tld, appid: 11 },
            raw: true
          });

          if (domain.price != plan.price) {
            throw new Error("Prices don't match!");
          }

          if (domain.whoisprivacy) {
            total += parseFloat(whoisPlan.price);
          }

          total += parseFloat(plan.price);
        }

        if (total.toFixed(2) != totalPrice) {
          throw new Error("Prices don't match!");
        }

        const partnerLogs = {
          domainData,
          unitid: company,
          failed: [],
          successful: []
        };

        let contactid = null;

        if (!oldDomain.contactid) {
          // eslint-disable-next-line
          contactid = oldDomain.contactid;
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
            throw new Error("Address or Telephonenumber missing.");
          }

          const accountDataCorrect = recursiveAddressCheck(accountData);

          if (!accountDataCorrect) {
            throw new Error(
              "Please make sure you have a valid address and retry then."
            );
          }

          const {
            address: { street, zip, city },
            country,
            phone
          } = accountDataCorrect;

          const { email } = await models.Email.findOne({
            where: { unitid },
            raw: true
          });

          if (!email) {
            throw new Error("Valid Email needed!");
          }

          const contactData = {
            firstname: "Domain",
            lastname: "Admin",
            street0: street,
            zip,
            city,
            country,
            phone,
            email
          };

          const contact = await createContact(contactData);
          partnerLogs.newContact = contact;

          if (contact.code != 200) {
            throw new Error(contact.description);
          } else {
            contactid = contact["property[contact][0]"];
          }
        }

        for await (const domainItem of domainData) {
          try {
            // eslint-disable-next-line no-loop-func
            await models.sequelize.transaction(async ta => {
              try {
                const { domain, whoisprivacy } = domainItem;

                const registerRes = await registerDomain({
                  domain,
                  contactid,
                  whoisprivacy
                });

                partnerLogs.successful.push(registerRes);
                if (registerRes.code != "200") {
                  console.log(registerRes);
                  partnerLogs.failed.push(registerRes);
                  throw new Error(registerRes.description);
                }

                const [, tld] = domain.split(".");
                const plan = await models.Plan.findOne({
                  where: { name: tld, appid: 11 },
                  raw: true,
                  transaction: ta
                });

                const additionalfeatures = {};
                const totalfeatures = { ...domainItem };
                let totalprice = parseFloat(domainItem.price);

                if (whoisprivacy) {
                  additionalfeatures.whoisPrivacy = true;
                  totalfeatures.whoisPrivacy = true;
                  totalprice += parseFloat(whoisPlan.price);
                }

                const boughtPlan = await models.BoughtPlan.create(
                  {
                    buyer: unitid,
                    payer: company,
                    planid: plan.id,
                    disabled: false,
                    totalprice,
                    description: `Registration of ${domain}`,
                    additionalfeatures,
                    totalfeatures
                  },
                  { transaction: ta }
                );

                registerRes.boughtPlan = boughtPlan;
                partnerLogs.successful.push(registerRes);
                let dns = ["NS1.VIPFY.COM", "NS2.VIPFY.COM", "NS3.VIPFY.COM"];

                if (process.env.ENVIRONMENT == "development") {
                  dns = ["NS1.VIPFY.NET", "NS2.VIPFY.NET", "NS3.VIPFY.NET"];
                }

                const p4 = models.Domain.create(
                  {
                    domainname: domain,
                    contactid,
                    whoisprivacy,
                    dns,
                    status: "ACTIVE",
                    boughtplanid: boughtPlan.dataValues.id,
                    accountemail: "domains@vipfy.com",
                    renewalmode: domainItem.renewalmode,
                    renewaldate:
                      registerRes["property[registration expiration date][0]"],
                    unitid: company
                  },
                  { transaction: ta }
                );

                const p5 = createNotification(
                  {
                    receiver: unitid,
                    message: `${domain} successfully registered.`,
                    icon: "laptop",
                    link: "domains",
                    changed: ["domains"]
                  },
                  ta
                );

                await Promise.all([p4, p5]);
              } catch (error) {
                console.log(error);
                createNotification({
                  receiver: unitid,
                  message: `Registration of ${domainItem.domain} failed.`,
                  icon: "bug",
                  link: "domains",
                  changed: ["domains"]
                });
              }
            });
          } catch (error) {
            partnerLogs.transactionFailed = error;
          }
        }

        await createLog(ip, "registerDomains", partnerLogs, unitid, null);

        const allDomains = await models.Domain.findAll({
          where: { unitid: company }
        });

        return allDomains;
      } catch (err) {
        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }
  ),

  /**
   * Transfer-In a Domain from another provider
   *
   * @param {string} domain The full domain name
   * @param {string} auth The Authcode
   *
   * @returns {object} ok
   */
  transferInDomain: requiresRights(["create-domains"]).createResolver(
    async (parent, { domain, auth }, { models, token }) => {
      try {
        const {
          user: { unitid, company }
        } = decode(token);

        const res = await transferIn(domain, auth);

        if (res.code != "200") {
          throw new Error(res.description);
        }

        const [, tld] = domain.split(".");

        const plan = await models.Plan.findAll({
          where: {
            appid: 11,
            name: tld,
            enddate: {
              [models.Op.or]: {
                [models.Op.eq]: null,
                [models.Op.gt]: models.sequelize.fn("NOW")
              }
            }
          },
          raw: true
        });

        const boughtPlan = await models.BoughtPlan.create({
          buyer: unitid,
          payer: company,
          planid: plan.id,
          disabled: false,
          totalprice: plan.price,
          description: `Transfer-In of ${domain}`,
          additionalfeatures: {},
          totalfeatures: {}
        });

        await models.Domain.create({
          domainname: domain,
          status: "PENDING",
          renewalmode: "AUTORENEW",
          whoisprivacy: false,
          external: false,
          dns: [],
          acountemail: "domains@vifpy.com",
          boughtplanid: boughtPlan.id,
          unitid: company
        });

        return true;
      } catch (err) {
        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }
  ),

  registerExternalDomain: requiresRights(["create-domains"]).createResolver(
    async (parent, { domainData }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);

        const boughtPlan = await models.BoughtPlan.create(
          {
            planid: 106,
            disabled: false,
            buyer: unitid,
            payer: company,
            usedby: company
          },
          { transaction: ta }
        );

        try {
          const domain = await models.Domain.create(
            {
              ...domainData,
              domainname: domainData.domain,
              boughtplanid: boughtPlan.id,
              external: true,
              accountid: "external",
              accountemail: "external@vipfy.com",
              renewalmode: "AUTODELETE",
              unitid: company
            },
            { transaction: ta }
          );

          const p1 = createLog(
            ip,
            "registerExternalDomain",
            { domain, boughtPlan },
            unitid,
            ta
          );

          const p2 = createNotification(
            {
              receiver: unitid,
              message: `${domainData.domain} successfully added.`,
              icon: "laptop",
              link: "domains",
              changed: ["domains"]
            },
            ta
          );

          await Promise.all([p1, p2]);

          return domain;
        } catch (err) {
          createNotification({
            receiver: unitid,
            message: `Couldn't add external Domain ${domainData.domain}.`,
            icon: "bug",
            link: "domains",
            changed: ["domains"]
          });

          throw new NormalError({
            message: err.message,
            internalData: { err, partner: "RRP Proxy" }
          });
        }
      })
  ),

  /**
   * Deletes an external Domain from our database
   *
   * @param {number} id The domains id
   *
   * @returns {object} ok
   */
  deleteExternalDomain: async (parent, { id }, { models, token, ip }) =>
    models.sequelize.transaction(async ta => {
      const {
        user: { unitid }
      } = decode(token);

      try {
        const domain = await models.Domain.findById(id, { raw: true });

        await models.Domain.destroy({ where: { id } });

        const p1 = createLog(
          ip,
          "registerExternalDomain",
          {
            domain
          },
          unitid,
          ta
        );

        const p2 = createNotification(
          {
            receiver: unitid,
            message: `${domain.domainname} successfully deleted.`,
            icon: "laptop",
            link: "domains",
            changed: ["domains"]
          },
          ta
        );

        await Promise.all([p1, p2]);

        return { ok: true };
      } catch (err) {
        createNotification({
          receiver: unitid,
          message: `Couldn't delete external Domain.`,
          icon: "bug",
          link: "domains",
          changed: ["domains"]
        });

        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }),

  /**
   * Update Whois Privacy
   *
   * @param whoisPrivacy: {integer}
   *
   * @returns {any}
   */
  setWhoisPrivacy: requiresRights(["edit-domains"]).createResolver(
    async (_parent, { id, status }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);

        try {
          const p1 = models.Domain.findOne({
            where: { id, unitid: company },
            raw: true,
            transaction: ta
          });

          const p2 = models.Plan.findOne({
            where: { name: { [models.Op.like]: "WHOIS%" } },
            raw: true,
            transaction: ta
          });

          const [domainToUpdate, whoisPlan] = await Promise.all([p1, p2]);
          const { domainname, totalfeatures, boughtplanid } = domainToUpdate;

          const plan = await models.Plan.findOne({
            where: { name: domainname.split(".")[1] },
            raw: true,
            transaction: ta
          });

          const additionalfeatures = {
            ...domainToUpdate.additionalfeatures,
            whoisprivacy: status
          };

          const newTotalfeatures = { ...totalfeatures, whoisprivacy: status };

          let totalprice = parseFloat(plan.price);

          if (status) {
            totalprice += parseFloat(whoisPlan.price);
          }

          const res = await toggleWhoisPrivacy(domainname, status);

          if (res.code != 200) {
            console.log(res);
            throw new Error(res.description);
          }

          const oldBP = await models.BoughtPlan.findOne({
            where: { id: boughtplanid },
            transaction: ta,
            raw: true
          });

          await models.BoughtPlan.update(
            { endtime: models.sequelize.fn("NOW") },
            { where: { id: boughtplanid, payer: company }, transaction: ta }
          );

          const newBP = await models.BoughtPlan.create(
            {
              buyer: unitid,
              payer: company,
              predecessor: oldBP.id,
              planid: oldBP.planid,
              disabled: false,
              description: `Updated Plan for ${domainname}`,
              totalfeatures: newTotalfeatures,
              additionalfeatures,
              totalprice,
              whoisprivacy: status
            },
            { transaction: ta }
          );

          await models.Domain.update(
            {
              whoisprivacy: status,
              boughtplanid: newBP.dataValues.id
            },
            {
              where: { id: domainToUpdate.id, unitid: company },
              transaction: ta
            }
          );

          const p3 = createNotification({
            receiver: unitid,
            message: `Whois Privacy ${
              status ? "successfully applied" : "cancelled"
            } for ${domainname}`,
            icon: "laptop",
            link: "domains",
            changed: ["domains"]
          });

          const p4 = createLog(ip, "setWhoisPrivacy", { res }, unitid, ta);

          await Promise.all(p3, p4);

          return { ...domainToUpdate, whoisprivacy: status ? true : false };
        } catch (err) {
          await createNotification({
            receiver: unitid,
            message: `Updating Whois Privacy failed`,
            icon: "bug",
            link: "domains",
            changed: ["domains"]
          });

          throw new PartnerError({
            message: err.message,
            internalData: { err, partner: "RRP Proxy" }
          });
        }
      })
  ),

  /**
   * Update Renewal Mode of a domain
   *
   * @param {ID} id
   * @param {String} renewalmode An enum which can be AUTORENEW or AUTODELETE
   *
   * @returns {any}
   */
  setRenewalMode: async (parent, { id, renewalmode }, { models, token, ip }) =>
    models.sequelize.transaction(async ta => {
      const {
        user: { unitid, company }
      } = decode(token);

      try {
        const domain = await models.Domain.findOne({
          where: { id, unitid: company },
          raw: true
        });

        const res = await toggleRenewalMode(domain.domainname, renewalmode);

        if (res.code != 200) {
          console.log(res);
          throw new Error(res.description);
        }

        const boughtPlan = await models.BoughtPlan.findOne(
          { where: { id: domain.boughtplanid } },
          { raw: true }
        );

        let endtime = null;

        if (renewalmode == "AUTODELETE") {
          endtime = domain.renewaldate;
        }

        const p1 = models.BoughtPlan.update(
          { endtime },
          { where: { id: boughtPlan.id, payer: company }, transaction: ta }
        );

        const p2 = models.Domain.update(
          { renewalmode },
          { where: { id, unitid: company } }
        );

        await Promise.all([p1, p2]);

        const p3 = createNotification({
          receiver: unitid,
          message: `Renewalmode of ${
            domain.domainname
          } changed to ${renewalmode}`,
          icon: "laptop",
          link: "domains",
          changed: ["domains"]
        });

        const p4 = createLog(ip, "setRenewalMode", { res }, unitid, ta);

        await Promise.all([p3, p4]);

        return { ...domain, renewalmode };
      } catch (err) {
        await createNotification({
          receiver: unitid,
          message: `Updating Renewalmode failed`,
          icon: "bug",
          link: "domains",
          changed: ["domains"]
        });

        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }),

  /**
   * Update Whois Privacy or Renewal Mode of a domain. Updating both at the
   *
   * @param {ID} id
   * @param {string[]} dns The new nameservers for the domain
   *
   * @returns {any}
   */
  updateDns: requiresRights(["edit-domains"]).createResolver(
    (parent, { ns, id, action }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);

        try {
          const domain = await models.Domain.findOne(
            { where: { id, unitid: company } },
            { raw: true, transaction: ta }
          );
          console.log("FIRE!");

          if (!domain) {
            throw new Error("Domain not found");
          }

          let res = null;
          let newDns = null;

          if (!domain.dns) {
            domain.dns = [];
          }
          if (domain.dns.length == 0) {
            res = await setNs(domain.domainname, ns);
            newDns = [...domain.dns, ns];
          } else if (action == "ADD") {
            res = await addNs(domain.domainname, ns);
            newDns = [...domain.dns, ns];
          } else if (action == "REMOVE") {
            res = await removeNs(domain.domainname, ns);
            newDns = domain.dns.filter(item => item != ns);
          } else {
            throw new Error("Action not supported!");
          }

          if (res && res.code != 200) {
            throw new Error(res.description);
          }

          await models.Domain.update(
            { dns: newDns },
            { transaction: ta, where: { id }, returning: true }
          );

          const log = await createLog(ip, "updateDns", { res, ns }, unitid, ta);

          const notification = createNotification(
            {
              receiver: unitid,
              message: `DNS update of ${domain.domainname} was successful`,
              icon: "laptop",
              link: "domains",
              changed: ["domains"]
            },
            ta
          );

          await Promise.all([log, notification]);

          return { ...domain.dataValues, dns: newDns };
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "DNS Update failed",
              icon: "laptop",
              link: "domains",
              changed: ["domains"]
            },
            ta
          );

          throw new PartnerError({
            message: err.message,
            internalData: { err, partner: "RRP Proxy" }
          });
        }
      })
  )
};
