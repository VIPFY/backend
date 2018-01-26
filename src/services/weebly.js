/*
This component contains a method to generate a request hash which must be
provided for every request to Weebly and several functions to make requests
to their API.

The workflow is that we create an user (Email is needed), a site for this user,
then a payment plan and finally generating a single sign-on link for him to
access his account.
*/
import { WEEBLY_KEY, WEEBLY_SECRET } from "../login-data";
import Utility from "../helpers/createHmac";
import axios from "axios";

export const createRequestHash = async (callType, endpoint, requestData) => {
  // The request string consists of:
  // Type of call (for example POST or PUT)
  // The endpoint URL (for example, user/234256/loginLink)
  // Any request data (for example, { 'plan_id': 34 }).
  // (Don't include data in the hash if the request doesn't require it)
  const requestString = `${callType}\n${endpoint}\n${JSON.stringify(
    requestData
  )}`;

  try {
    const requestHash = await Utility.generateHmac(
      requestString,
      WEEBLY_SECRET
    );

    return requestHash;
  } catch (err) {
    return err;
  }
};

export const createWeeblyUser = async email => {
  const requestData = {
    language: "en",
    test_mode: true,
    email
  };

  try {
    const requestHash = await createRequestHash("POST", "user", requestData);
    const options = {
      method: "POST",
      url: "user",
      baseURL: "https://api.weeblycloud.com/",
      headers: {
        "Content-type": "application/json",
        "X-Public-Key": WEEBLY_KEY,
        "X-Signed-Request-Hash": requestHash
      },
      data: JSON.stringify(requestData)
    };

    axios(options)
      .then(res => res.data.user)
      .catch(err => err.response.statusText);
  } catch (err) {
    return err;
  }
};

export const createWeeblySite = async site => {};

export const test = async (callType, endpoint, requestData) => {
  try {
    const requestHash = await createRequestHash(
      callType,
      endpoint,
      requestData
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
      .then(res => console.log(res.status, res.statusText, res.data))
      .catch(err => {
        console.log(`Error: ${err.response.status}`);
        console.log(err.response.statusText);
      });
  } catch (err) {
    console.log(err);
  }
};
