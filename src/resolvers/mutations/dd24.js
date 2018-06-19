import dd24Api from "../../services/dd24";
// import { requiresRight("A") } from "../../helpers/permissions";

export default {
  domainCommands: async (parent, { command, params }) => {
    try {
      if (command == "AddDomain") {
        const result = await dd24Api(command, params);
        console.log(result);
        return result;
      }
      throw new Error("Not implemented now!");
    } catch (err) {
      throw new Error(err.message);
    }
  }
};
