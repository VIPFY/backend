import axios from "axios";

/**
 * Makes a request to Freshdesk
 * @exports
 * @param {string} method GET or POST
 * @param {string} url The endpoint to talk to. For Example "organization"
 * @param {object} [data={}] The request body when making a POST request and the url parameters when making a GET request
 */
export default (method, url, data = {}) => {
  const options = {
    method,
    withCredentials: true,
    baseURL: "https://vipfydesk.freshdesk.com/api/v2/",
    url,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: Buffer.from(process.env.FRESHDESK).toString("base64")
    }
  };

  if (method == "GET") {
    options.params = data;
  } else {
    options.data = data;
  }

  return axios(options);
};
