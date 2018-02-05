import { MAILJET_KEY, MAILJET_SECRET } from "../login-data";

const Mailjet = require("node-mailjet").connect(MAILJET_KEY, MAILJET_SECRET);

export const sendEmail = email => {
  const options = {
    FromEmail: "office@vipfy.com",
    FromName: "Vipfy Office",
    "MJ-TemplateID": "298815",
    "MJ-TemplateLanguage": "true",
    Recipients: [{ Email: email }]
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
  console.log(data);
  const options = {
    FromEmail: "office@vipfy.com",
    FromName: "Vipfy Office",
    "MJ-TemplateID": "299321",
    "MJ-TemplateLanguage": "true",
    Recipients: [{ Email: "office@vipfy.com" }],
    Vars: {
      fromname: data.name,
      fromemail: data.email,
      fromphone: data.phone,
      contactmessage: data.message
    }
  };

  Mailjet.post("send")
    .request(options)
    .then(res => {
      console.log(res.body);
      return true;
    })
    .catch(err => {
      throw new Error(err.message);
    });
};
