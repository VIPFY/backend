import soap from "soap";
import { merge } from "lodash";

const { RRP_USERNAME, RRP_PASSWORD } = process.env;
// const apiWSDL = "https://api-ote-2.domaindiscount24.com:4424/?wsdl";
const apiWSDL = "https://api-ote.rrpproxy.net:8082/soap";
const auth = {
  params: {
    s_login: RRP_USERNAME,
    s_pw: RRP_PASSWORD,
    s_opmode: "OTE"
  }
};

export default async (command, params) => {
  try {
    // Copy bad inside good, otherwise => End of days!
    const args = merge(auth, { params });
    // Eliminate copying mistakes
    const result = await soap.createClientAsync(apiWSDL).then(client =>
      client[command](args)
        .then(res => {
          console.log(res);
          return res[0][`${command}Result`];
        })
        .catch(err => {
          console.log(err);
          throw new Error(err);
        })
    );

    return result;
  } catch (err) {
    return err;
  }
};
