import Axios from "axios";
import ini from "ini";

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

export const checkDomain = async domain => {
  try {
    data.domain = domain;
    data.command = "CheckDomain";
    config.params = data;

    const res = await Axios(config);

    return res.data;
  } catch (err) {
    throw new Error(err);
  }
};

export const registerDomain = async (domain, contact) => {
  try {
    data.command = "AddDomain";
    data.domain = domain;
    data.period = 1;
    data.ownercontact0 = contact;
    data.admincontact0 = contact;
    data.techcontact0 = "P-DKA10922";
    data.billingcontact0 = "P-DKA10922";

    config.method = "POST";
    config.data = data;
    const res = await Axios(config);

    return res.data;
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
    const parsedRes = ini.parse(res.data);

    return parsedRes;
  } catch (err) {
    throw new Error(err);
  }
};
