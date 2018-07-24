import soap from "soap";
import _ from "lodash";
import { DD24_KEY, DD24_SECRET } from "../login-data";

const apiWSDL = "https://api-ote-2.domaindiscount24.com:4424/?wsdl";
const auth = {
  params: {
    reseller: DD24_KEY,
    password: DD24_SECRET
  }
};

export default async (command, parameter) => {
  // Copy bad inside good, otherwise => End of days!
  const args = _.merge(auth, { params: parameter });
  // Eleminate copying mistakes
  const properCommand = `${command}Async`;
  try {
    const result = await soap.createClientAsync(apiWSDL).then(client =>
      client[properCommand](args)
        .then(res => {
          console.log(res[0][`${command}Result`]);
          return res[0][`${command}Result`];
        })
        .catch(err => {
          console.log(err);
          return err;
        })
    );

    return result;
  } catch (err) {
    return err;
  }
};
