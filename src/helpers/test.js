import test from "../services/weebly";

const queryString = {
  email: "jf@vipfy.com"
};

test("POST", "user", queryString);

// ===========================================================================
// import {
//   fetchOrganization,
//   deleteOrganization,
//   createSubscription
// } from "../services/pipedrive";

// const testCompany = {
//   initiator: {
//     ref: "bla",
//     email: "test@tester.de",
//     phone: "3458908234234",
//     fullName: "Text company"
//   },
//   primaryUser: {
//     ref: "bla",
//     email: "testUser@test.com",
//     phone: "3463452345345",
//     fullName: "Test User"
//   },
//   company: {
//     country: "DE",
//     name: "New Company"
//   },
//   order: {
//     subscriptionPlan: "silver",
//     seats: 0
//   }
// }
//
// createSubscription(testCompany);
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
