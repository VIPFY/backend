import { MAILJET_KEY, MAILJET_SECRET } from "../login-data";

const Mailjet = require("node-mailjet").connect(MAILJET_KEY, MAILJET_SECRET);

export const sendEmail = (email, hash) => {
  const con_link = `https://vipfy-148316.appspot.com/signup/${hash}`;
  const options = {
    FromEmail: "office@vipfy.com",
    FromName: "Vipfy Office",
    "MJ-TemplateID": "197442",
    "MJ-TemplateLanguage": "true",
    Recipients: [{ Email: email }],
    Vars: { confirmation_link: con_link }
  };

  Mailjet.post("send")
    .request(options)
    .then(res => {
      console.log(res.body);
    })
    .catch(err => {
      console.log(err.statusCode);
      console.log(err.message);
    });
};

export const sendEmailToVipfy = data => {
  const options = {
    FromEmail: data.email,
    FromName: data.name,
    "MJ-TemplateID": "197442",
    "MJ-TemplateLanguage": "true",
    Recipients: [{ Email: "office@vipfy.com" }],
    Vars: { confirmation_link: data.message }
  };

  Mailjet.post("send")
    .request(options)
    .then(res => {
      console.log(res.body);
      return true;
    })
    .catch(err => {
      console.log(err.statusCode);
      console.log(err.message);
      return err.message;
    });
};
