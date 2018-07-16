import SibApiV3Sdk from "sib-api-v3-sdk";
import { times, random } from "lodash";
import { SIB_KEY } from "../login-data";

const defaultClient = SibApiV3Sdk.ApiClient.instance;

const apiKey = defaultClient.authentications["api-key"];

apiKey.apiKey = SIB_KEY;

const password = times(20, () => random(35).toString(36)).join("");

const accountApi = new SibApiV3Sdk.AccountApi();
const resellerApi = new SibApiV3Sdk.ResellerApi();

export const getVipfyAccountData = async () => {
  try {
    const res = await accountApi.getAccount();
    console.log(res);
  } catch (err) {
    console.log(err);
  }
};

// createAccount Kauf den Plan und gib ihm Email credits
export const createAccount = async (email, firstName, lastName, companyName) => {
  try {
    const options = {
      resellerChild: new SibApiV3Sdk.CreateChild(email, firstName, lastName, companyName, password)
    };
    const res = await resellerApi.createResellerChild(options);
    console.log("RES", res);
    return res;
  } catch (err) {
    console.log("ERR", err.response);
    return err.response.text;
  }
};

// changeEmailCredits bei changePlan des Users

// deleteAccount bei Kündigung des plans

// addEmailCredits zum ersten des Monats
