import dd24Api from "../../services/dd24";
// import { requiresRight("A") } from "../../helpers/permissions";

export default {
  domainCommands: async (parent, { command, params }) => {
    try {
      if (command == "AddDomain") {
        const result = await dd24Api(command, params);

        return result;
      } else if (command == "CheckDomain") {
        const res = await dd24Api(command, params);

        return res;
      }

      throw new Error("Not implemented now!");
    } catch (err) {
      throw new Error(err.message);
    }
  }
};
