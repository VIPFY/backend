import { WEEBLY_KEY, WEEBLY_SECRET } from "../login-data";
import Utility from "../helpers/createHmac";
import axios from "axios";

export default async (callType, endpoint, requestData) => {
  //The request string consists of:
  // Type of call (for example POST or PUT)
  // The endpoint URL (for example, user/234256/loginLink)
  // Any request data (for example, { 'plan_id': 34 }).
  // (Don't include data in the hash if the request doesn't require it)
  const requestString = `${callType}\n${endpoint}\n${JSON.stringify(
    requestData
  )}`;

  console.log(requestString);
  const requestHash = await Utility.generateHmac(requestString, WEEBLY_SECRET);
  console.log(requestHash);

  const vString = Utility.validateHmac(
    requestHash,
    requestString,
    WEEBLY_SECRET
  );

  const options = {
    method: callType,
    url: `${endpoint}`,
    baseURL: "https://api.weeblycloud.com/",
    headers: {
      "Content-type": "application/json",
      "X-Public-Key": WEEBLY_KEY,
      "X-Signed-Request-Hash": requestHash
    },
    data: JSON.stringify(requestData)
  };

  axios(options)
    .then(res => console.log(res))
    .catch(err => {
      console.log(`Error: ${err.response.status}`);
      console.log(err.response.statusText);
      //console.log(err);
    });
};