import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import _ from "lodash";
import { tryLogin } from "../services/auth";
import { requiresAuth } from "../helpers/permissions";
import mailjet from "../services/mailjet";
import dd24Api from "../services/dd24";

export default {
  updateUser: requiresAuth.createResolver(
    (parent, { firstname, newFirstName }, { models }) =>
      models.User.update({ firstname: newFirstName }, { where: { firstname } })
  ),

  deleteUser: requiresAuth.createResolver(
    async (parent, { id }, { models }) => {
      await models.User.destroy({ where: { id } });
      return "User was deleted";
    }
  ),

  signUp: async (parent, { email, newsletter }, { models }) => {
    //Check whether the email is already in use
    const emailInUse = await models.User.findOne({ where: { email } });
    if (emailInUse) throw new Error("Email already in use!");

    try {
      //A password musst be created because otherwise the not null rule of the
      //database is violated
      const passwordHash = await bcrypt.hash(email, 5);

      //Change the given hash to improve security
      const start = _.random(3, 8);
      const newHash = passwordHash.replace("/", 2).substr(start);

      const user = await models.User.create({
        email,
        newsletter,
        password: newHash
      });

      mailjet(user.email, newHash);
      return {
        ok: true,
        user
      };
    } catch (err) {
      console.log(err);
      return {
        ok: false
      };
    }
  },

  signUpConfirm: async (parent, { email, password }, { models }) => {
    const emailExists = await models.User.findOne({ where: { email } });
    if (!emailExists) return { ok: false, error: "Email not found!" };

    const isVerified = await models.User.findOne({
      where: { email, userstatus: "normal" }
    });
    if (isVerified) return { ok: false, error: "User already verified!" };

    try {
      const passwordHash = await bcrypt.hash(password, 12);

      const activate = await models.User.update(
        { password: passwordHash, userstatus: "normal" },
        { where: { email } }
      );

      return {
        ok: true
      };
    } catch (err) {
      return {
        ok: false,
        error: "Couldn't activate user!"
      };
    }
  },

  signIn: (parent, { email, password }, { models, SECRET, SECRETTWO }) =>
    tryLogin(email, password, models, SECRET, SECRETTWO),

  forgotPassword: async (parent, { email }, { models }) => {
    const emailExists = await models.User.findOne({ where: { email } });
    if (!emailExists)
      return {
        ok: false,
        error: "Email doesn't exist!"
      };

    //Change the given hash to improve security
    const start = _.random(3, 8);
    const newHash = await emailExists.dataValues.password
      .replace("/", 2)
      .substr(start);

    models.User.update({ password: newHash }, { where: { email } });

    try {
      mailjet(email, newHash);
      //Exchange this for a new solution when a proper mailjet template exists
      models.User.update({ userstatus: "toverify" }, { where: { email } });

      return {
        ok: true,
        email
      };
    } catch (err) {
      return {
        ok: false,
        error: err
      };
    }
  },

  domainCommands: async (parent, { command, params, agb }, { models }) => {
    if (command != "AddDomain" || (command = "AddDomain" && agb)) {
      const result = await dd24Api(command, params);
      console.log(result);
      return result;
    } else {
      return {
        error: "AGB's not accepted!",
        code: 600,
        description: ""
      };
    }
  },

  setDeleteStatus: requiresAuth.createResolver(
    async (parent, { id, model, type }, { models }) => {
      const messageExists = await models[model].findById(id);
      if (messageExists) {
        try {
          const deleted = await models[model].update(
            { [type]: true },
            { where: { id } }
          );
          return {
            ok: true
          };
        } catch (err) {
          return {
            ok: false,
            error: err.message
          };
        }
      } else {
        return {
          ok: false,
          error: "Message doesn't exist!"
        };
      }
    }
  ),

  setReadtime: requiresAuth.createResolver(
    async (parent, { id, model }, { models }) => {
      try {
        const read = await models[model].findById(id);

        if (!read.readtime) {
          const now = Date.now();
          await models[model].update({ readtime: now }, { where: { id } });
          return {
            ok: true,
            message: now
          };
        } else {
          return {
            ok: false,
            error: "Message already read"
          };
        }
      } catch (err) {
        return {
          ok: false,
          error: err.message
        };
      }
    }
  ),

  sendMessage: async (parent, { fromuser, touser, message }, { models }) => {
    const sender = await models.User.findById(fromuser);
    const receiver = await models.User.findById(touser);

    if (sender.id == receiver.id) {
      return {
        ok: false,
        error: "Sender and Receiver can't be the same User!"
      };
    } else if (!sender || !receiver) {
      return {
        ok: false,
        error: "User doesn't exist!"
      };
    } else if (message && sender && receiver) {
      try {
        const save = await models.Notification.create({
          fromuser,
          touser,
          type: 1,
          message
        });

        return {
          ok: true,
          message
        };
      } catch (err) {
        return {
          ok: false,
          error: err.message
        };
      }
    } else {
      return {
        ok: false,
        error: "Empty Message!"
      };
    }
  }
};
