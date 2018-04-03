import userQueries from "./queries/user";
import appQueries from "./queries/app";
import messageQueries from "./queries/message";
import reviewQueries from "./queries/review";
import billQueries from "./queries/bill";

import messageMutations from "./mutations/message";
import userMutations from "./mutations/user";
import reviewMutations from "./mutations/review";
import commonMutations from "./mutations/common";
import dd24Mutations from "./mutations/dd24";
import weeblyMutations from "./mutations/weebly";
import billMutations from "./mutations/bill";
import contactMutations from "./mutations/contact";

import Subscription from "./subscriptions";

import { find, implementDate, implementJSON, findUnit } from "./CustomResolvers";

const Query = Object.assign(userQueries, appQueries, messageQueries, reviewQueries, billQueries);

const Mutation = Object.assign(
  messageMutations,
  userMutations,
  reviewMutations,
  commonMutations,
  dd24Mutations,
  weeblyMutations,
  billMutations,
  contactMutations
);

const unit = { unitid: "Unit" };
const app = { appid: "App" };
const unitAndPlan = { sponsor: "Unit", planid: "Plan" };
const developerAndSupport = { developer: "Unit", supportunit: "Unit" };

export default {
  Query,
  Mutation,
  Subscription,
  Date: implementDate,
  JSON: implementJSON,
  Address: find(unit),
  App: find(developerAndSupport),
  AppDetails: find(developerAndSupport),
  Bill: find(unit),
  BillPosition: find({ vendor: "Unit", billid: "Bill", planid: "Plan" }),
  BoughtPlan: find({ buyer: "Unit", buyfor: "Unit", planid: "Plan" }),
  Department: find(unit),
  Email: find(unit),
  HumanUnit: find({ unitid: "Unit", humanid: "Human" }),
  Licence: find({ unitid: "Unit", boughtplanid: "BoughtPlan" }),
  Message: find({ receiver: "Unit" }),
  MessageData: find({ sender: "Unit", receiver: "Unit" }),
  Newsletter: find({ email: "Email" }),
  Phone: find(unit),
  Plan: find(app),
  PlansRunning: find(app),
  Promo: find(unitAndPlan),
  PromosRunning: find(unitAndPlan),
  Review: find({ unitid: "Unit", appid: "App", answerto: "Review", humanid: "Human" }),
  Unit: find({ parentunit: "Unit" }),
  User: findUnit(unit),
  Website: find(unit)
};
