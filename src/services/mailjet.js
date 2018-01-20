import { MAILJET_KEY, MAILJET_SECRET } from "../login-data";

export default (email, hash) => {
  const Mailjet = require("node-mailjet").connect(MAILJET_KEY, MAILJET_SECRET);

  const con_link = `https://vipfy-148316.appspot.com/signup/${hash}`;
  const options = {
    FromEmail: "office@vipfy.com",
    FromName: "Vipfy Office",
    "MJ-TemplateID": "197442",
    "MJ-TemplateLanguage": "true",
    Recipients: [{ Email: email }],
    Vars: { confirmation_link: con_link }
  };

  const request = Mailjet.post("send").request(options);

  request
    .then(res => {
      console.log(res.body);
    })
    .catch(err => {
      console.log(err.statusCode);
      console.log(err);
    });
};
