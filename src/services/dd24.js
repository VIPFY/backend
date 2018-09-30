import soap from "soap";
import { merge } from "lodash";

const { DD24_KEY, DD24_SECRET } = process.env;
const apiWSDL = "https://api-ote-2.domaindiscount24.com:4424/?wsdl";
const auth = {
  params: {
    reseller: DD24_KEY,
    password: DD24_SECRET
  }
};

export default async (command, params) => {
  try {
    // Copy bad inside good, otherwise => End of days!
    const args = merge(auth, { params });
    // Eliminate copying mistakes
    const properCommand = `${command}Async`;
    const result = await soap.createClientAsync(apiWSDL).then(client =>
      client[properCommand](args)
        .then(res => res[0][`${command}Result`])
        .catch(err => {
          throw new Error(err);
        })
    );

    return result;
  } catch (err) {
    return err;
  }
};
