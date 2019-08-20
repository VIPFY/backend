/* eslint-disable no-lone-blocks */
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
  setNs,
  checkDomainTransfer,
  statusDomain,
  setAuthcode,
  addZone,
  modifyZone,
  checkZone,
  addWebforwarding,
  checkWebforwarding,
  deleteWebforwarding,
  checkMailforwarding,
  addMailforwarding,
  deleteMailforwarding,
  checkTransferStatus
} from "../../services/rrp";
import { requiresRights } from "../../helpers/permissions";
import {
  recursiveAddressCheck,
  createLog,
  createNotification
} from "../../helpers/functions";
import { PartnerError, NormalError } from "../../errors";

export default {
  checkDomain: async (_p, { domain }, { models, ip }) => {
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
      const p2 = getDomainSuggestion(punycodeDomain, {
        "ip-address": ip
      });

      const [domainCheck, suggestions] = await Promise.all([p1, p2]);

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

      const suggestionList = Object.values(suggestions)
        .filter(item => item.availability == "available")
        .map(item => {
          const [, tld] = item.name.split(".");
          const plan = domainPlans.find(el => el.name == tld);

          return {
            domain: punycode.toUnicode(item.name),
            availability: "210",
            price: plan.price,
            currency: plan.currency,
            description: "available"
          };
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
  registerDomain: requiresRights(["create-domains"]).createResolver(
    async (_p, { domainData }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, token } = ctx;

        const {
          user: { unitid, company }
        } = decode(token);
        let subscription = null;
        let stripeplan = null;

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

          if (oldDomain && oldDomain.contactid) {
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
            contactid = contact["property[contact][0]"];
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
                    console.error(registerRes);
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
                  const dns = {
                    nameservers: [
                      "NS1.VIPFY.COM",
                      "NS2.VIPFY.COM",
                      "NS3.VIPFY.COM"
                    ]
                  };

                  if (process.env.ENVIRONMENT == "development") {
                    dns.nameservers = [
                      "NS1.VIPFY.NET",
                      "NS2.VIPFY.NET",
                      "NS3.VIPFY.NET"
                    ];
                  }

                  try {
                    await addZone(domain);

                    dns.zone = {
                      dnszone: domain,
                      records: [
                        "@ IN A 188.165.164.79",
                        "@ IN A 94.23.156.143",
                        "@ IN A 192.95.19.39"
                      ],
                      ttl: 3600
                    };
                  } catch (error) {
                    console.error(error);
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
                        registerRes[
                          "property[registration expiration date][0]"
                        ],
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
                  console.error(error);
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
      })
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

        await transferIn(domain, auth);

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
          dns: {},
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
    async (_p, { domainData }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, token } = ctx;
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
            ctx,
            "registerExternalDomain",
            { domain, boughtPlan },
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
  deleteExternalDomain: async (_p, { id }, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      const { models, token } = ctx;
      const {
        user: { unitid }
      } = decode(token);

      try {
        const domain = await models.Domain.findById(id, { raw: true });

        await models.Domain.destroy({ where: { id } });

        const p1 = createLog(ctx, "registerExternalDomain", { domain }, ta);

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
            { whoisprivacy: status, boughtplanid: newBP.dataValues.id },
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

          const p4 = createLog(ip, "setWhoisPrivacy", res, unitid, ta);

          await Promise.all([p3, p4]);
          return { ...domainToUpdate, whoisprivacy: status == "1" };
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
  setRenewalMode: async (_p, { id, renewalmode }, { models, token, ip }) =>
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
   * Update Nameservers of a domain
   *
   * @param {ID} id
   * @param {string[]} dns The new nameservers for the domain
   * @param {enum} action Either ADD or REMOVE
   *
   * @returns {any}
   */
  updateNs: requiresRights(["edit-domains"]).createResolver(
    // Removed transaction because it prevented the update to be successful
    async (parent, { ns, id, action }, { models, token, ip }) => {
      const {
        user: { unitid, company }
      } = decode(token);

      try {
        const domain = await models.Domain.findOne({
          where: { id, unitid: company },
          raw: true
        });

        if (!domain) {
          throw new Error("Domain not found");
        }

        const res = await statusDomain(domain.domainname);

        const nameservers = [];
        Object.keys(res).forEach(property => {
          if (property.includes("nameserver")) {
            nameservers.push(res[property]);
          }
        });

        const options = { dns: { ...domain.dns } };

        if (nameservers.length == 0) {
          await setNs(domain.domainname, ns);
          options.dns.nameservers = [ns.toUpperCase()];
        } else if (action == "ADD") {
          await addNs(domain.domainname, ns);
          options.dns.nameservers = [...nameservers, ns.toUpperCase()];
        } else if (action == "REMOVE") {
          await removeNs(domain.domainname, ns);
          options.dns.nameservers = nameservers.filter(
            item => item.toUpperCase() != ns.toUpperCase()
          );
        } else {
          throw new Error("Action not supported!");
        }
        await models.Domain.update(options, {
          where: { id }
        });

        const log = createLog(ip, "updateDns", { ns }, unitid);
        const notification = createNotification({
          receiver: unitid,
          message: `DNS update of ${domain.domainname} was successful`,
          icon: "laptop"
          // link: "domains",
          // changed: ["domains"]
        });

        await Promise.all([log, notification]);

        return { ...domain, ...options };
      } catch (err) {
        await createNotification(
          {
            receiver: unitid,
            message: "DNS Update failed",
            icon: "laptop"
            // link: "domains",
            // changed: ["domains"]
          },
          ta
        );

        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }
  ),

  updateZone: requiresRights(["edit-domains"]).createResolver(
    async (parent, { id, zoneRecord, action }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const domain = await models.Domain.findOne({
          where: { id, unitid: company },
          raw: true
        });

        if (!domain) {
          throw new Error("Domain not found");
        }

        let records = [];
        const res = await checkZone(domain.domainname);
        Object.keys(res)
          .filter(item => item.includes("[rr]"))
          .map(item => records.push(res[item]));

        const zone =
          domain.dns && domain.dns.zone
            ? domain.dns.zone
            : { dnszone: domain.domainname };

        switch (action) {
          case "ADD":
            {
              await addZone(domain.domainname);

              records = [
                "@ IN A 188.165.164.79",
                "@ IN A 94.23.156.143",
                "@ IN A 192.95.19.39"
              ];
            }
            break;

          case "UPDATE":
            {
              if (!zone.records) {
                await addZone(domain.domainname, zoneRecord);
                records = [zoneRecord];
              } else {
                await modifyZone(domain.domainname, zoneRecord, "ADD");
                records = [...records, zoneRecord];
              }
            }
            break;

          case "DELETE":
            {
              await modifyZone(domain.domainname, zoneRecord, "DEL");

              records = zone.records.filter(record => record != zoneRecord);
            }
            break;

          default:
            throw new Error("Action not supported!");
        }

        const dns = { ...domain.dns, zone: { ...zone, records } };
        await models.Domain.update({ dns }, { where: { id: domain.id } });

        return { ...domain, dns };
      } catch (err) {
        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }
  ),

  addWebforwarding: requiresRights(["edit-domains"]).createResolver(
    async (_, args, { models, token }) => {
      try {
        const { id, ...data } = args;
        const {
          user: { company }
        } = decode(token);

        const domain = await models.Domain.findOne({
          where: { id, unitid: company },
          raw: true
        });

        if (!domain) {
          throw new Error("Domain not found");
        }

        const res = await checkWebforwarding(domain.domainname);
        const forwardings = [];
        const forwards = res["property[total][0]"];

        for (let i = 0; i < forwards; i++) {
          forwardings[i] = {
            source: res[`property[source][${i}]`],
            target: res[`property[target][${i}]`],
            type: res[`property[type][${i}]`]
          };
        }

        const source = `${data.source}.${domain.domainname}`;

        await addWebforwarding(source, data.target, data.type);

        const records = [];
        const zone = await checkZone(domain.domainname);

        Object.keys(zone).forEach(item => {
          if (item.includes("[rr]")) {
            records.push(zone[item]);
          }
        });

        const webforwardings = [...forwardings, { ...data, source }];

        const dns = {
          ...domain.dns,
          zone: { ...domain.dns.zone, records, webforwardings }
        };

        await models.Domain.update({ dns }, { where: { id: domain.id } });

        return { ...domain, dns };
      } catch (err) {
        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }
  ),

  deleteWebforwarding: requiresRights(["edit-domains"]).createResolver(
    async (_, { id, source }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const domain = await models.Domain.findOne({
          where: { id, unitid: company },
          raw: true
        });

        if (!domain) {
          throw new Error("Domain not found");
        }

        await deleteWebforwarding(source);

        const webforwardings = domain.dns.zone.webforwardings.filter(
          forwarding => forwarding.source != source
        );

        const dns = {
          ...domain.dns,
          zone: { ...domain.dns.zone, webforwardings }
        };

        await models.Domain.update({ dns }, { where: { id: domain.id } });

        return { ...domain, dns };
      } catch (err) {
        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }
  ),

  addMailforwarding: async (_, { id, source, to }, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);

      const domain = await models.Domain.findOne({
        where: { id, unitid: company },
        raw: true
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      const res = await checkMailforwarding(domain.domainname);
      const forwardings = [];
      const forwards = res["property[total][0]"];

      for (let i = 0; i < forwards; i++) {
        forwardings[i] = {
          from: res[`property[from][${i}]`],
          to: res[`property[to][${i}]`]
        };
      }

      const from = `${source}${domain.domainname}`;

      await addMailforwarding(from, to);

      const records = [];
      const zone = await checkZone(domain.domainname);

      Object.keys(zone).forEach(item => {
        if (item.includes("[rr]")) {
          records.push(zone[item]);
        }
      });

      const mailforwardings = [...forwardings, { from, to }];

      const dns = {
        ...domain.dns,
        zone: { ...domain.dns.zone, records, mailforwardings }
      };

      await models.Domain.update({ dns }, { where: { id: domain.id } });

      return { ...domain, dns };
    } catch (err) {
      throw new PartnerError({
        message: err.message,
        internalData: { err, partner: "RRP Proxy" }
      });
    }
  },

  deleteMailforwarding: requiresRights(["edit-domains"]).createResolver(
    async (_, { id, from, to }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const domain = await models.Domain.findOne({
          where: { id, unitid: company },
          raw: true
        });

        if (!domain) {
          throw new Error("Domain not found");
        }

        await deleteMailforwarding(from, to);

        const mailforwardings = domain.dns.zone.mailforwardings.filter(
          forwarding => forwarding.from != from && forwarding.to != to
        );

        const dns = {
          ...domain.dns,
          zone: { ...domain.dns.zone, mailforwardings }
        };

        await models.Domain.update({ dns }, { where: { id: domain.id } });

        return { ...domain, dns };
      } catch (err) {
        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }
  ),

  checkTransferReq: async (_p, { domain }) => {
    try {
      const [, tld] = domain.split(".");

      switch (tld) {
        case "de":
        case "ch":
        case "at":
        case "io": {
          const res = await checkDomain([domain]);
          const code = res["property[domaincheck][0]"].split(" ")[0];
          return { noCheck: true, code };
        }

        default: {
          const res = await checkDomainTransfer(domain);
          console.log("LOG: res", res);
          const response = {
            noCheck: false,
            code: res.code,
            description: res.description,
            age: res["property[age in days][0]"],
            registrar: res["property[registrar][0]"],
            transferLock: res["property[transfer lock][0]"],
            whoisServer: res["property[whois server][0]"]
          };

          return response;
        }
      }
    } catch (err) {
      throw new PartnerError({
        message: err.message,
        internalData: { err, partner: "RRP Proxy" }
      });
    }
  },

  requestAuthCode: requiresRights(["edit-domains"]).createResolver(
    async (_p, { id }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);
        let authCode = "";

        const { domainname } = await models.Domain.findOne({
          where: { id, unitid: company },
          raw: true
        });

        const res = await statusDomain(domainname);

        if (res.code != 200) {
          throw new Error(res.description);
        } else if (!res["property[auth][0]"]) {
          const validCharacters =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789+-/*";
          let auth = "";

          for (let i = 0; i < 13; i++) {
            auth += validCharacters.charAt(
              Math.floor(Math.random() * validCharacters.length)
            );
          }

          const res2 = await setAuthcode(domainname, auth);
          if (res2.code != 200) {
            throw new Error(res2.description);
          } else {
            authCode = res2["property[auth][0]"];
          }
        } else {
          authCode = res["property[auth][0]"];
        }

        return authCode;
      } catch (err) {
        throw new PartnerError({
          message: err.message,
          internalData: { err, partner: "RRP Proxy" }
        });
      }
    }
  ),

  checkZone: async (_p, { domain }) => {
    try {
      return await checkZone(domain);
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }
};
