import { decode } from "jsonwebtoken";
import punycode from "punycode";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { getDomainSuggestion } from "../../services/rrp";

export default {
  fetchDomains: requiresRights(["view-domains"]).createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const domains = await models.Domain.findAll({
          where: { unitid: company },
          order: [["id", "ASC"]]
        });

        return domains;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchDomain: requiresRights(["view-domains"]).createResolver(
    async (parent, { id }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const domain = await models.Domain.findOne({
          where: { id, unitid: company }
        });

        return domain;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchDomainSuggestions: requiresRights(["view-domains"]).createResolver(
    async (parent, { name }, { models, ip }) => {
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

        const punycodeDomain = punycode.toASCII(name);
        const suggestions = await getDomainSuggestion(punycodeDomain, {
          "ip-address": ip
        });

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

        return suggestionList;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
