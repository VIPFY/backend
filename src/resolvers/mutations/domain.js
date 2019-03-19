import { decode } from "jsonwebtoken";
import punycode from "punycode";
import {
  checkDomain,
  registerDomain,
  createContact,
  getDomainSuggestion
} from "../../services/rrp";
import { requiresRights } from "../../helpers/permissions";
import {
  recursiveAddressCheck,
  createLog,
  createNotification
} from "../../helpers/functions";
import {
  cancelSubscription,
  reactivateSubscription
} from "../../services/stripe";
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
                const { domain, whoisPrivacy } = domainItem;

                const register = await registerDomain({
                  domain,
                  contactid,
                  whoisPrivacy
                });

                partnerLogs.successful.push(register);
                if (register.code != "200") {
                  console.log(register);
                  partnerLogs.failed.push(register);
                  throw new Error(register.description);
                }

                const tld = domain.split(".")[1];
                const plan = await models.Plan.findOne({
                  where: { name: tld, appid: 11 },
                  raw: true,
                  transaction: ta
                });

                const additionalfeatures = {};
                const totalfeatures = { ...domainItem };

                if (domain.whoisprivacy) {
                  additionalfeatures.whoisPrivacy = true;
                  totalfeatures.whoisPrivacy = true;
                }

                const boughtPlan = await models.BoughtPlan.create(
                  {
                    buyer: unitid,
                    payer: company,
                    planid: plan.id,
                    disabled: false,
                    totalprice: domain.price,
                    description: `Registration of ${domain}`,
                    additionalfeatures,
                    totalfeatures
                  },
                  { transaction: ta }
                );

                register.boughtPlan = boughtPlan;
                partnerLogs.successful.push(register);

                const p5 = models.Domain.create(
                  {
                    domainname: domain,
                    contactid,
                    boughtplanid: boughtPlan.dataValues.id,
                    accountemail: "domains@vipfy.com",
                    renewalmode: domainItem.renewalmode,
                    renewaldate: register["property[renewal date][0]"],
                    unitid: company
                  },
                  { transaction: ta }
                );

                const p4 = createNotification(
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
          internalData: {
            err,
            partner: "RRP Proxy"
          }
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
            internalData: {
              err
            }
          });
        }
      })
  ),

  /**
   * Deletes an external Domain from our database
   *
   * @param {number} id The domains id
   *
   * @returns {obj} ok
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

        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }),

  /**
   * Update Whois Privacy or Renewal Mode of a domain. Updating both at the
   * same time is not possible!
   *
   * @param id: {integer}
   * @param domainData: {object}
   * domainData can contain the properties:
   * @param domain: {string}
   * @param renewalmode: {enum}
   * @param whoisPrivacy: {integer}
   * @param cid: {string}
   * @param dns: {object[]}
   * @returns {any}
   */
  updateDomain: requiresRights(["edit-domains"]).createResolver(
    (parent, { domainData, id }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);
        let cancelledDomain = null;

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

          const predecessor = await models.BoughtPlan.findOne(
            { where: { id: oldDomain.boughtplanid } },
            { raw: true }
          );

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
            const updatedDNS = await rrpApi("UpdateDomain", domainData);

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
                  link: "domains",
                  changed: ["domains"]
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

            const bpOld = models.BoughtPlan.update(
              { endtime, planid: 25 },
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
                totalfeatures,
                stripeplan: predecessor.stripeplan
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

            if (toUpdate.renewalmode == "AUTODELETE") {
              cancelledDomain = await cancelSubscription(
                predecessor.stripeplan
              );

              p1 = models.BoughtPlan.update(
                {
                  endtime: new Date(cancelledDomain.current_period_end * 1000),
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
              addLogs.cancelledDomain = cancelledDomain;
              message = `Renewalmode of ${
                domainData.domain
              } changed to AUTODELETE`;
            } else {
              message = `Renewal of ${domainData.domain} was successful`;
            }
          }
          const updateDomain = await rrpApi("UpdateDomain", domainData);

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
                link: "domains",
                changed: ["domains"]
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
              link: "domains",
              changed: ["domains"]
            },
            ta
          );

          if (cancelledDomain) {
            await reactivateSubscription(cancelledDomain.id);
          }

          throw new PartnerError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  )
};
