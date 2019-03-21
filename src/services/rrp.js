import Axios from "axios";

const { RRP_USERNAME, RRP_PASSWORD, ENVIRONMENT } = process.env;
let url = "https://api.rrpproxy.net/api/call";

const data = {
  s_login: "mmmhome1",
  s_pw: "3657;S^2wecQ)L,(zCPm&QM3446V-i7"
};

// if (ENVIRONMENT == "development") {
//   url = "https://api-ote.rrpproxy.net/api/call";
//   data.s_opmode = "OTE";
// }

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
    const params = { ...data };
    domains.forEach((domain, key) => {
      params[`domain${key}`] = domain;
    });

    params.command = "CheckDomains";
    config.params = params;
    const res = await Axios(config);

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
    const params = { ...data };

    params.command = "GetNameSuggestion";
    params.name = domain;
    params.type = "SUGGEST";
    params.tld0 = "com,";
    params.tld1 = "de";
    params.tld2 = "net";
    params.tld3 = "org";
    params.tld4 = "ch";
    params["USE-NUMBERS"] = 1;
    params["USE-IDNS"] = 1;
    params["USE-DASHES"] = 1;
    params["SHOW-UNAVAILABLE"] = 0;
    config.params = params;

    const res = await Axios(config);

    return parseResponse(res.data);
  } catch (error) {
    throw new Error({ error });
  }
};

export const registerDomain = async ({ domain, contactid, whoisPrivacy }) => {
  try {
    const params = { ...data };

    params.command = "AddDomain";
    params.domain = domain;
    params.period = 1;
    params["x-whois-privacy"] = whoisPrivacy ? 1 : 0;
    params.ownercontact0 = contactid;
    params.admincontact0 = contactid;
    params.techcontact0 =
      ENVIRONMENT == "development" ? "P-DEA453" : "P-DKA10922";
    params.billingcontact0 =
      ENVIRONMENT == "development" ? "P-DEA453" : "P-DKA10922";
    params.nameserver0 =
      ENVIRONMENT == "development" ? "NS1.VIPFY.NET" : " NS1.VIPFY.COM ";
    params.nameserver1 =
      ENVIRONMENT == "development" ? "NS2.VIPFY.NET" : " NS2.VIPFY.COM ";
    params.nameserver2 =
      ENVIRONMENT == "development" ? "NS3.VIPFY.NET" : " NS3.VIPFY.COM ";

    config.params = params;
    const res = await Axios(config);

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

export const createContact = async contact => {
  try {
    const params = { ...data, command: "AddContact" };

    config.params = { ...params, ...contact };
    const res = await Axios(config);

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

/**
 * Activate or deactivate WHOIS-privacy for a domain
 *
 * @param {number} status 0 for off, 1 for on
 *
 * @returns {object}
 */
export const toggleWhoisPrivacy = async status => {
  try {
    const params = { ...data, command: "ModifyDomain" };
    params["x-whois-privacy"] = status;

    config.params = params;
    const res = await Axios(config);

    return parseResponse(res.data);
  } catch (error) {
    throw new Error(error);
  }
};

export const transferIn = async (domain, auth, contact) => {
  try {
    const [, tld] = domain.split(".");
    const params = { ...data, command: "TransferDomain", domain };
    params.auth = auth;
    params.action = "request";

    if (tld == "de") {
      params.ownercontact0 = contact;
    }

    config.params = params;
    const res = await Axios(config);

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};
