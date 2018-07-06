// import weeblyApi from "../services/weebly";
//
// async function testWeebly() {
//   const email = "dummy@vipfy.com";
//   const userId = "117405276";
//   const domain = "test1.vipfy.com";
//   const siteId = "711807005615386732";
//   const planId = 2;
//
//   const requestData = {
//     language: "en",
//     test_mode: true,
//     email
//   };
//   const method = "POST";
//   const endpoint = "user";
//
//   try {
//     const result = await weeblyApi(requestData, method, endpoint);
//     console.log(result);
//   } catch (err) {
//     console.log(err);
//   }
// }
//
// testWeebly();
// ===========================================================================
import {
  fetchOrganization,
  fetchOrganizations,
  addOrganization,
  deleteOrganization,
  createSubscription,
} from "../services/pipedrive";

const testCompany = {
  name: "Another Vipfy Customer Company",
  visible_to: 1,
}

fetchOrganizations();
//=============================================================================
// import axios from "axios";
// import { SHOPIFY_KEY, SHOPIFY_SECRET } from "../login-data";
//
// const config = {
//   method: "get",
//   url: `https://${SHOPIFY_KEY}:${
//     SHOPIFY_SECRET
//   }@vipfy-test.myshopify.com/admin/products.json`
//   // data: {
//   //   product: {
//   //     title: "App6",
//   //     vendor: "User1",
//   //     product_type: "App"
//   //   }
//   // }
// };
//
// axios(config)
//   .then(res => console.log(res.data.products))
//   .catch(err => console.log(err.response.data));
