import axios from "axios";

const encodedToken = Buffer.from(
  `pc@vipfy.com:${process.env.JIRA_SUPPORT}`
).toString("base64");

/**
 * Makes a request to Jira Servicedesk
 * @exports
 * @param {string} method GET or POST
 * @param {string} url The endpoint to talk to. For Example "organization"
 * @param {object} [data={}] The request body when making a POST request
 */
export default (method, url, data = {}) => {
  const options = {
    method,
    withCredentials: true,
    baseURL: "https://vipfy-marketplace.atlassian.net/rest/servicedeskapi/",
    url,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encodedToken}`
    },
    data
  };

  return axios(options);
};
