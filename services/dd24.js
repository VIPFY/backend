import soap from "soap";
import { DD24_KEY, DD24_SECRET } from "../login-data";
import _ from "lodash";

const apiWSDL = "https://api-ote-2.domaindiscount24.com:4424/?wsdl";
const auth = {
  params: {
    reseller: DD24_KEY,
    password: DD24_SECRET
  }
};

export default async (command, parameter) => {
  const args = _.merge({ params: parameter }, auth);
  // Eleminate copying mistakes
  console.log(args);
  const properCommand = command + "Async";
  const result = await soap
    .createClientAsync(apiWSDL)
    .then(client => {
      return client[properCommand](args)
        .then(res => {
          console.log(res[command + "Result"]);
          return res[command + "Result"];
        })
        .catch(err => console.log(`Error: ${err}`));
    })
    .catch(err => console.log(err));
  return result;
};
