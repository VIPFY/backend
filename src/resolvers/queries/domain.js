import { decode } from "jsonwebtoken";
import punycode from "punycode";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import {
  getDomainSuggestion,
  statusDomain,
  statusContact,
  checkTransferStatus
} from "../../services/rrp";
import { normalizeDomainContact } from "../../helpers/functions";

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
  ),

  fetchWHOISData: requiresRights(["view-domains"]).createResolver(
    async (parent, { id }, { models, token }) => {
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

        const res = await statusDomain(domain.domainname);

        const nameservers = [];
        Object.keys(res).forEach(property => {
          if (property.includes("nameserver")) {
            nameservers.push(res[property]);
          }
        });

        const p1 = statusContact(res["property[owner contact][0]"]);
        const p2 = statusContact(res["property[admin contact][0]"]);

        const [o, a] = await Promise.all([p1, p2]);

        const owner = normalizeDomainContact(o);
        const admin = normalizeDomainContact(a);

        return {
          domain: res["property[domain][0]"],
          domainIdn: res["property[domain idn][0]"],
          created: res["property[created date][0]"],
          updated: res["property[updated date][0]"],
          expiration: res["property[registration expiration date][0]"],
          transfermode: res["property[transfermode][0]"],
          renewalmode: res["property[renewalmode][0]"],
          status: res["property[status][0]"],
          transferLock: res["property[transfer lock][0]"] == "1",
          nameservers,
          owner,
          admin
        };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  checkTransferStatus: requiresRights(["show-domains"]).createResolver(
    async (parent, { id }, { models, token }) => {
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

        const res = await checkTransferStatus(domain.domainname);

        return res["property[TRANSFERSTATUS][0]"];
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
