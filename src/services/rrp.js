import Axios from "axios";

const { RRP_USERNAME, RRP_PASSWORD, ENVIRONMENT } = process.env;
let url = "https://api.rrpproxy.net/api/call";

const data = {
  s_login: RRP_USERNAME,
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

export const registerDomain = async ({ domain, contact, whoisprivacy }) => {
  try {
    data.command = "AddDomain";
    data.domain = domain;
    data.period = 1;
    data["x-whois-privacy"] = whoisprivacy ? 1 : 0;
    data.ownercontact0 = contact;
    data.admincontact0 = contact;
    data.techcontact0 =
      ENVIRONMENT == "development" ? "P-DEA453" : "P-DKA10922";
    data.billingcontact0 =
      ENVIRONMENT == "development" ? "P-DEA453" : "P-DKA10922";

    config.method = "GET";
    config.params = data;
    const res = await Axios(config);

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};

export const createContact = async contact => {
  try {
    data.command = "AddContact";
    config.method = "GET";
    config.params = { ...data, ...contact };
    const res = await Axios(config);

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
  }
};
