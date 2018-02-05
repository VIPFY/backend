import dd24Api from "../../services/dd24";
import { requiresAuth } from "../../helpers/permissions";

export default {
  domainCommands: requiresAuth.createResolver(async (parent, { command, params, agb }) => {
    try {
      if (command != "AddDomain" || (command == "AddDomain" && agb)) {
        const result = await dd24Api(command, params);
        console.log(result);
        return result;
      }
      return {
        error: "AGB's not accepted!",
        code: 600,
        description: ""
      };
    } catch (err) {
      return {
        code: 404,
        error: err.message
      };
    }
  })
};
