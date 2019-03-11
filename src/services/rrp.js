import Axios from "axios";

const { RRP_USERNAME, RRP_PASSWORD, ENVIRONMENT } = process.env;
let url = "https://api.rrpproxy.net/api/call";

const data = {
  s_login: RRP_USERNAME,
  s_pw: RRP_PASSWORD
};

if (ENVIRONMENT == "development") {
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
 * Checks whether a domains available
 * @param {string} domain
 *
 * @returns {object}
 */
export const checkDomain = async domain => {
  try {
    data.domain = domain;
    data.command = "CheckDomain";
    config.params = data;

    const res = await Axios(config);

    return parseResponse(res.data);
  } catch (err) {
    throw new Error(err);
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
