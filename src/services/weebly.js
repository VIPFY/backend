/*
This component contains a method to generate a request hash which must be
provided for every request to Weebly and several functions to make requests
to their API.

The workflow is that we create an user (Email is needed), a site for this user,
then a payment plan and finally generating a single sign-on link for him to
access his account.
*/
import axios from "axios";
import { WEEBLY_KEY, WEEBLY_SECRET } from "../login-data";
import Utility from "../helpers/createHmac";

function createOptions(method, endpoint, requestHash, requestData) {
  return {
    method,
    url: `${endpoint}`,
    baseURL: "https://api.weeblycloud.com/",
    headers: {
      "Content-type": "application/json",
      "X-Public-Key": WEEBLY_KEY,
      "X-Signed-Request-Hash": requestHash
    },
    data: JSON.stringify(requestData)
  };
}

async function createRequestHash(callType, endpoint, requestData) {
  // The request string consists of:
  // Type of call (for example POST or PUT)
  // The endpoint URL (for example, user/234256/loginLink)
  // Any request data (for example, { 'plan_id': 34 }).
  // (Don't include data in the hash if the request doesn't require it)
  const requestString = `${callType}\n${endpoint}\n${JSON.stringify(requestData)}`;

  try {
    const requestHash = await Utility.generateHmac(requestString, WEEBLY_SECRET);

    return requestHash;
  } catch (err) {
    return err;
  }
}

export default async (method, endpoint, requestData) => {
  try {
    const requestHash = await createRequestHash(method, endpoint, requestData);
    const options = createOptions(method, endpoint, requestHash, requestData);
    const res = await axios(options);

    return res.data;
  } catch (err) {
    return err.response.data.error.message;
  }
};
