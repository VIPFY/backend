import { decode } from "jsonwebtoken";
import moment from "moment";
import {
  checkDomain,
  registerDomain,
  createContact
} from "../../services/dd24";

import { requiresRights } from "../../helpers/permissions";
import {
  recursiveAddressCheck,
  createLog,
  createNotification
} from "../../helpers/functions";
import {
  createSubscription,
  addSubscriptionItem,
  cancelSubscription,
  abortSubscription,
  cancelPurchase,
  reactivateSubscription
} from "../../services/stripe";
import { PartnerError, NormalError } from "../../errors";

export default {
  checkDomain: async (_p, { domain }) => {
    try {
      const res = await checkDomain(domain);
      if (res.code != 210) {
        throw new Error(res.data);
      }

      return true;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },
  /**
   * Register a Domain with our Partner DD24
   *
   * @param {object} domainData Contains the domain as well as the options
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
          const p1 = models.Domain.findOne({
            where: { unitid: company },
            raw: true
          });

          const p2 = models.Department.findOne({
            raw: true,
            where: { unitid: company }
          });

          const p3 = models.Plan.findOne({
            where: { name: domainData.tld, appid: 11 },
            attributes: ["price", "id", "stripedata"],
            raw: true
          });

          const [hasAccount, organization, findPrice] = await Promise.all([
            p1,
            p2,
            p3
          ]);

          const { payingoptions } = organization;

          if (
            !payingoptions ||
            !payingoptions.stripe ||
            !payingoptions.stripe.cards ||
            payingoptions.stripe.cards.length < 1
          ) {
            throw new Error("Missing payment information!");
          }

          let totalprice = findPrice.price;
          const additionalfeatures = {};
          const totalfeatures = {
            domain: domainData.domain,
            renewalmode: "AUTORENEW"
          };

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

          const {
            address: { street, zip, city },
            country,
            phone
          } = accountDataCorrect;

          const contact = {
            firstname: "Domain",
            lastname: "Admin",
            street0: street,
            zip,
            city,
            country,
            phone,
            email: "domains@vipfy.com"
          };

          const partnerLogs = {
            ...domainData,
            unitid: company,
            ...contact
          };

          // if (!hasAccount) {

          // }

          const domainContact = await createContact(contact);
          partnerLogs.domain = register;

          if (register.code == "200") {
            domainData.accountid = register.cid;
          } else {
            throw new Error(register.description);
          }

          if (payingoptions.stripe.subscription) {
            subscription = await addSubscriptionItem(
              payingoptions.stripe.subscription,
              findPrice.stripedata.id
            );

            stripeplan = subscription.id;
          } else {
            subscription = await createSubscription(payingoptions.stripe.id, [
              { plan: findPrice.stripedata.id }
            ]);

            stripeplan = subscription.items.data[0].id;

            await models.DepartmentData.update(
              {
                payingoptions: {
                  ...payingoptions,
                  stripe: {
                    ...payingoptions.stripe,
                    subscription: subscription.id
                  }
                }
              },
              { where: { unitid: company }, transaction: ta }
            );
          }

          const boughtPlan = await models.BoughtPlan.create(
            {
              buyer: unitid,
              payer: company,
              planid: findPrice.id,
              disabled: false,
              totalprice,
              description: `Registration of ${domainData.domain}`,
              additionalfeatures,
              totalfeatures,
              stripeplan
            },
            { transaction: ta }
          );

          const renewaldate = moment(Date.now())
            .add(1, "year")
            .subtract(1, "day");

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

          const p4 = createLog(
            ctx,
            "registerDomain",
            {
              ...partnerLogs,
              subscription,
              domain,
              boughtPlan
            },
            ta
          );

          const p5 = createNotification(
            {
              receiver: unitid,
              message: `${domainData.domain} successfully registered.`,
              icon: "laptop",
              link: "domains",
              changed: ["domains"]
            },
            ta
          );

          await Promise.all([p4, p5]);

          return domain;
        } catch (err) {
          createNotification({
            receiver: unitid,
            message: `Registration of ${domainData.domain} failed.`,
            icon: "bug",
            link: "domains",
            changed: ["domains"]
          });

          if (subscription && stripeplan) {
            const kind = stripeplan.split("_");
            if (kind[0] == "sub") {
              await abortSubscription(stripeplan);
            } else {
              await cancelPurchase(stripeplan, subscription.id);
            }
          }

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
  deleteExternalDomain: async (_p, { id }, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      const { models, token } = ctx;
      const {
        user: { unitid }
      } = decode(token);

      try {
        const domain = await models.Domain.findByPk(id, { raw: true });

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
    (_p, { domainData, id }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, token } = ctx;

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
                ctx,
                "updateDomain",
                { updatedDNS, domainData, oldDomain, updatedDomain },
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
            message = `Whois Privacy for ${domainData.domain} was successfully applied`;

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
              message = `Renewalmode of ${domainData.domain} changed to AUTODELETE`;
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
              ctx,
              "updateDomain",
              { boughtPlan, domainData, oldDomain, updatedDomain, ...addLogs },
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
