import test from "../services/weebly";
import Utility from "./createHmac";
import { WEEBLY_KEY, WEEBLY_SECRET } from "../login-data";

// const queryString = JSON.stringify({
//   email: "test@vipfy.com",
//   language: "en",
//   test_mode: "true"
// });
//
// test("GET", "account", "");

import {
  fetchOrganization,
  deleteOrganization,
  createSubscription
} from "../services/pipedrive";

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
