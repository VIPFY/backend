import { MAILJET_KEY, MAILJET_SECRET } from "../login-data";

const Mailjet = require("node-mailjet").connect(MAILJET_KEY, MAILJET_SECRET);

const sendMailjetEmail = async options => {
  try {
    const res = await Mailjet.post("send").request(options);
    console.log(res.body);

    return true;
  } catch (err) {
    throw new Error(err);
  }
};

export const sendRegistrationEmail = (email, password) => {
  const options = {
    FromEmail: "office@vipfy.com",
    FromName: "Vipfy Office",
    "MJ-TemplateID": "298815",
    "MJ-TemplateLanguage": "true",
    Recipients: [{ Email: email }]
  };

  sendMailjetEmail(options);
};

export const sendEmailToVipfy = data => {
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

  sendMailjetEmail(options);
};
