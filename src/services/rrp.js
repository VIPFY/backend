import Axios from "axios";

const { RRP_USERNAME, RRP_PASSWORD, ENVIRONMENT } = process.env;
let url = "https://api.rrpproxy.net/api/call";

const data = {
  s_login: RRP_USERNAME,
  s_pw: RRP_PASSWORD
};

const envCheck = ENVIRONMENT == "development";
if (envCheck) {
  url = "https://api-ote.rrpproxy.net/api/call";
  data.s_opmode = "OTE";
}

const config = {
  method: "GET",
  url
};

/**
 * Translates a string to a JSON object
 * @param {string} res The shitty text response we get from RRP
 *
 * @returns {object} An object built out of the shitty response
 */
const parseResponse = res => {
  const parsedRes = res.split("\n");
  // Remove unneccessary text from response
  parsedRes.pop();
  parsedRes.pop();
  parsedRes.shift();

  const jsonRes = {};

  parsedRes.forEach(item => {
    const [key, value] = item.split("=");

    jsonRes[key.trim()] = value.trim();
  });

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
 * Suggests different domains for a name
 * @param {string} domain
 *
 * @returns {object}
 */
export const getDomainSuggestion = async domain => {
  try {
    const params = {
      ...data,
      command: "GetNameSuggestion",
      name: domain,
      type: "SUGGEST",
      tld0: "com,",
      tld1: "de",
      tld2: "net",
      tld3: "org",
      tld4: "ch",
      "USE-NUMBERS": 1,
      "USE-IDNS": 1,
      "USE-DASHES": 1,
      "SHOW-UNAVAILABLE": 0
    };

    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (error) {
    throw new Error({ error });
  }
};

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
      nameserver0: envCheck ? "NS1.VIPFY.NET" : " NS1.VIPFY.COM ",
      nameserver1: envCheck ? "NS2.VIPFY.NET" : " NS2.VIPFY.COM ",
      nameserver2: envCheck ? "NS3.VIPFY.NET" : " NS3.VIPFY.COM "
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

export const statusDomain = async domain => {
  try {
    const params = { ...data, command: "StatusDomain", domain };
    const res = await Axios({ ...config, params });

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};
