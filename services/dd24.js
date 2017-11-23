import soap from "soap";
import { DD24_KEY, DD24_SECRET } from "../login-data";

const apiWSDL = "https://api-ote-2.domaindiscount24.com:4424/?wsdl";
const args = {
  reseller: DD24_KEY,
  password: DD24_SECRET
};

const arg = { name: "Germany" };
const test = "http://www.webservicex.com/globalweather.asmx?WSDL";
// soap
//   .createClientAsync(test)
//   .then(client => {
//     client.describe();
//     return client.GetCitiesByCountry(arg);
//   })
//   .then(res => {
//     console.log(res);
//   })
//   .catch(err => {
//     console.log(err);
//     client.describe();
//   });

soap.createClient(apiWSDL, (err, client) => {
  client.Ping(args, (err, res) => {
    if (err) console.log(err);
    console.log("Result:", res);
    client.describe();
  });
});
