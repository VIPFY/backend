import dd24Api from "../../services/dd24";
import { requiresAuth } from "../../helpers/permissions";

export default {
  domainCommands: requiresAuth.createResolver(
    async (parent, { command, params, agb }, { models }) => {
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
    }
  )
};
