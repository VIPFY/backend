/* eslint-disable max-len */
import Axios from "axios";

const { RRP_USERNAME, RRP_PASSWORD, ENVIRONMENT } = process.env;
let url = "https://api.rrpproxy.net/api/call";
let verisignUrl = "https://sugapi.verisign-grs.com/ns-api/2.0";

const data = {
  s_login: RRP_USERNAME,
  s_pw: RRP_PASSWORD
  // s_pw:"3657;S^2wecQ)L,(zCPm&QM3446V-i7"
};

const envCheck = ENVIRONMENT == "development";
if (envCheck) {
  url = "https://api-ote.rrpproxy.net/api/call";
  data.s_opmode = "OTE";
  verisignUrl = "https://ote-sugapi.verisign-grs.com/ns-api/2.0";
}

const config = {
  method: "GET",
  url
};

const ns0 = envCheck ? "NS1.VIPFY.NET" : " NS1.VIPFY.COM ";
const ns1 = envCheck ? "NS2.VIPFY.NET" : " NS2.VIPFY.COM ";
const ns2 = envCheck ? "NS3.VIPFY.NET" : " NS3.VIPFY.COM ";

/**
 * Translates a string to a JSON object
 * @param {string} res The shitty text response we get from RRP
 *
 * @returns {object} An object built out of the shitty response
 */
const parseResponse = res => {
  const parsedRes = res.split("\n").filter(pRes => pRes.length > 0);
  // Remove unneccessary text from response
  parsedRes.pop();
  parsedRes.pop();
  parsedRes.shift();

  const jsonRes = {};

  parsedRes.forEach(item => {
    const [key, value] = item.split("=");

    jsonRes[key.trim()] = value.trim();
  });

  if (jsonRes.code != 200) {
    throw new Error(jsonRes.description);
  }

  return jsonRes;
};

/**
 * Checks whether a domain is available for different tlds
 * @param {string[]} domains
 *
 * @returns {object}
 */
export const checkDomain = async domains => {
  try {
    const params = { ...data, command: "CheckDomains" };
    domains.forEach((domain, key) => {
      params[`domain${key}`] = domain;
    });

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

/**
 * Suggests different domains for a name. Goes to Verisign instead of RRP
 *
 * @param {string} domain Seed domain name (Unicode or Punycode). If the seed domain name includes a TLD(e.g. seeddomain.example), then that TLDwill also be used for suggestions.
 * @param {object} options
 * {string} lang Language of the 'name' used for normalization.
 * {string} ip-address Include suggestions based on theapproximate geolocation of the provided IPaddress.
 *
 * @returns {object}
 */
export const getDomainSuggestion = async (domain, options) => {
  try {
    const res = await Axios({
      method: "GET",
      baseURL: verisignUrl,
      url: "/suggest",
      headers: { "X-NAMESUGGESTION-APIKEY": process.env.VERISIGN_API_KEY },
      params: {
        name: domain,
        tlds: "com,de,net,org,ch,shop,store,tech,app,club,blog,cloud",
        lang: options.lang || "eng",
        ...options
      }
    });

    if (!res.data && !res.data.results) {
      throw new Error("Received no data!");
    }

    return res.data.results;
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Returns the full zone of the domain
 *
 * @param {string} dnszone Per default the domain name
 */
export const checkZone = async dnszone => {
  try {
    const params = {
      ...data,
      command: "QueryDNSZoneRRList",
      dnszone
    };

    const res = await Axios({ ...config, params });
    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Returns all forwardings of the domain
 *
 * @param {string} dnszone Per default the domain name
 */
export const checkWebforwarding = async dnszone => {
  try {
    const params = {
      ...data,
      command: "QueryWebFwdList",
      wide: 1,
      dnszone
    };

    const res = await Axios({ ...config, params });
    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Creates a zone for a domain. Uses the ns of RRP Proxy
 *
 * @param {string} name Name of the new Zone, should be the domain name
 * @param {string} record Optional record to use
 *
 * @returns {object}
 */
export const addZone = async (name, record) => {
  try {
    const params = {
      ...data,
      command: "AddDNSZone",
      dnszone: name,
      SOAMINTTL: 3600
    };

    if (record) {
      params.rr0 = record;
    } else {
      params.rr0 = "@ IN A 188.165.164.79";
      params.rr1 = "@ IN A 94.23.156.143";
      params.rr2 = "@ IN A 192.95.19.39";
    }

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Modifies a zone for a domain
 *
 * @param {string} name Name of the new Zone to modify
 * @param {string} record The record which should be modified
 * @param {enum} action ADD or DEL
 * @returns {object}
 */
export const modifyZone = async (name, record, action) => {
  try {
    const params = {
      ...data,
      command: "ModifyDNSZone",
      dnszone: name,
      [`${action}RR0`]: record
    };

    if (action != "DEL" && action != "ADD") {
      throw new Error("Action must either be DEL or ADD");
    }

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Adds a webforwarding for a domain
 *
 * @param {string} source Zone to be forwarded
 * @param {string} target Target of the forwarding
 * @param {string} type Type of forward: RD 301 redirect | MRD frame redirect | SELF static content; When TYPE is SELF it can not be used with TARGET
 * @returns {object}
 */
export const addWebforwarding = async (source, target, type) => {
  try {
    const params = {
      ...data,
      command: "AddWebFwd",
      source,
      target,
      type
    };

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Deletes a webforwarding for a domain
 *
 * @param {string} source Redirected zone to be deleted
 * @returns {object}
 */
export const deleteWebforwarding = async source => {
  try {
    const params = {
      ...data,
      command: "DeleteWebFwd",
      source
    };

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Registers a Domain with RRPProxy
 *
 * @param {object} domainData
 *
 * @returns {object}
 */
export const registerDomain = async ({ domain, contactid, whoisprivacy }) => {
  try {
    const params = {
      ...data,
      command: "AddDomain",
      domain,
      period: 1,
      "x-whois-privacy": whoisprivacy ? 1 : 0,
      ownercontact0: contactid,
      admincontact0: contactid,
      techcontact0: envCheck ? "P-DEA453" : "P-DKA10922",
      billingcontact0: envCheck ? "P-DEA453" : "P-DKA10922",
      nameserver0: ns0,
      nameserver1: ns1,
      nameserver2: ns2
    };

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

export const createContact = async contact => {
  try {
    const params = { ...data, ...contact, command: "AddContact" };

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

/**
 * Activate or deactivate WHOIS-privacy for a domain
 *
 * @param {number} status 0 for off, 1 for on
 * @param {string} domain
 *
 * @returns {object}
 */
export const toggleWhoisPrivacy = async (domain, status) => {
  try {
    const params = { ...data, command: "ModifyDomain", domain };
    params["x-whois-privacy"] = status;

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

export const toggleRenewalMode = async (domain, mode) => {
  try {
    const params = { ...data, command: "SetDomainRenewalMode", domain };
    params.renewalmode = mode;

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

export const addNs = async (domain, ns) => {
  try {
    const params = { ...data, command: "ModifyDomain", domain };

    params.addnameserver0 = ns;
    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

export const setNs = async (domain, ns) => {
  try {
    const params = { ...data, command: "ModifyDomain", domain };

    params.nameserver0 = ns;
    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

export const removeNs = async (domain, ns) => {
  try {
    const params = { ...data, command: "ModifyDomain", domain };

    params.delnameserver0 = ns;
    console.log(params);
    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

export const transferIn = async (domain, auth, contact) => {
  try {
    const [, tld] = domain.split(".");
    const params = { ...data, command: "TransferDomain", domain, auth };
    params.action = "request";

    if (tld == "de") {
      params.ownercontact0 = contact;
    }

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

/**
 * Returns the data of a contact in RRP
 *
 * @param {string} contact The contact handle
 */
export const statusContact = async contact => {
  try {
    const params = { ...data, command: "StatusContact", contact };
    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

export const statusDomain = async domain => {
  try {
    const params = { ...data, command: "StatusDomain", domain };
    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

export const checkDomainTransfer = async domain => {
  try {
    const params = { ...data, command: "CheckDomainTransfer", domain };
    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

export const setAuthcode = async (domain, auth) => {
  try {
    const params = { ...data, command: "SetAuthCode", domain, auth, type: 1 };
    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};
