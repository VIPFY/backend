import axios from "axios";
import { Client } from "pipedrive";
import { PIPEDRIVE_KEY } from "../login-data";

// Connect to Pipedrive via their custom library
const pipedrive = new Client(PIPEDRIVE_KEY, { strictMode: true });

export const addOrganization = organization => {
  pipedrive.Organizations.add(organization, (err, res) => {
    if (err) throw err;

    console.log(res);
  });
};

export const fetchOrganization = organization => {
  pipedrive.Organizations.get(organization.id, (err, res) => {
    if (err) throw err;

    console.log(res);
  });
};

export const fetchOrganizations = (params = {}) => {
  pipedrive.Organizations.getAll(params, (err, res) => {
    if (err) throw err;

    console.log(res);
  });
};

export const deleteOrganization = organization => {
  pipedrive.Organizations.remove(organization.id, (err, res) => {
    if (err) throw err;

    console.log(res);
  });
};

export const createSubscription = ({ initiator, primaryUser, company, order }) => {
  const options = {
    method: "POST",
    baseURL: "https://provisioning-api.pipedrive.com/v1",
    url: "/subscriptions",
    headers: {
      "Content-type": "application/json",
      Authorization: PIPEDRIVE_KEY
    },
    data: {
      initiator,
      primaryUser,
      company,
      order
    }
  };

  axios(options)
    .then(res => console.log(res))
    .catch(err => {
      console.log(`Error ${err.response.status}: ${err.response.statusText}`);
      console.log("Headers:", err.response.headers);
    });
};
