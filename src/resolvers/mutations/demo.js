import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { jobQueue, pubsub, TO_WEBSITEWORKER } from "../../constants";
import { NormalError } from "../../errors";
import { createNotification } from "../../helpers/functions";

const randomNumber = require("random-number-csprng");

export default {
  triggerTestJob: requiresAuth.createResolver(
    async (parent, args, { session }) => {
      try {
        const {
          user: { unitid },
        } = decode(session.token);

        const adjectives = [
          "Ablaze",
          "Abrupt",
          "Accomplished",
          "Active",
          "Adored",
          "Adulated",
          "Adventurous",
          "Affectionate",
          "Amused",
          "Amusing",
        ];
        const nouns = ["Llama", "Pony", "Dog", "Cat"];
        const jobtitle =
          adjectives[await randomNumber(0, adjectives.length - 1)] +
          nouns[await randomNumber(0, nouns.length - 1)];

        const notification = await createNotification(
          {
            receiver: unitid,
            message: `Job ${jobtitle} has been created`,
            icon: "tasks",
            link: `dashboard`,
            changed: [],
            options: { autoclose: false, progress: { count: 0 } },
          },
          null
        );

        await jobQueue.add({
          jobtitle,
          notification: notification.id,
          unitid,
        });

        return true;
      } catch (err) {
        console.log(err);
        throw new NormalError(err.message);
      }
    }
  ),

  respondToNotification: requiresAuth.createResolver(
    async (parent, { id, data }, { session }) => {
      try {
        const {
          user: { unitid },
        } = decode(session.token);

        pubsub.publish(TO_WEBSITEWORKER, {
          id,
          data,
          unitid,
        });

        return true;
      } catch (err) {
        console.log(err);
        throw new NormalError(err.message);
      }
    }
  ),
};
