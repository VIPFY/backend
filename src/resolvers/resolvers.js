import userQueries from "./queries/user";
import appQueries from "./queries/app";
import messageQueries from "./queries/message";
import reviewQueries from "./queries/review";
import billQueries from "./queries/bill";
import contactQueries from "./queries/contact";

import appMutations from "./mutations/app";
import messageMutations from "./mutations/message";
import authMutations from "./mutations/auth";
import userMutations from "./mutations/user";
import reviewMutations from "./mutations/review";
import commonMutations from "./mutations/common";
import dd24Mutations from "./mutations/dd24";
import weeblyMutations from "./mutations/weebly";
import billMutations from "./mutations/bill";
import contactMutations from "./mutations/contact";

import Subscription from "./subscriptions";

import { find, implementDate, implementJSON } from "./CustomResolvers";

const Query = Object.assign(
  userQueries,
  contactQueries,
  appQueries,
  messageQueries,
  reviewQueries,
  billQueries
);

const Mutation = Object.assign(
  appMutations,
  authMutations,
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
const unitAndPlan = { sponsor: "Unit", planid: "Plan" };
const developerAndSupport = { developer: "Unit", supportunit: "Unit" };
const plans = { appid: "App", gotoplan: "Plan", mainplan: "Plan" };

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
  BoughtPlan: find({ buyer: "Unit", planid: "Plan" }),
  Department: find(unit),
  DepartmentData: find(unit),
  Email: find(unit),
  Human: find(unit),
  Licence: find({ unitid: "Unit", boughtplanid: "BoughtPlan" }),
  Log: find({ user: "User", sudoer: "User" }),
  Message: find({ receiver: "Unit" }),
  MessageData: find({ sender: "Unit", receiver: "Unit" }),
  Newsletter: find({ email: "Email" }),
  Phone: find(unit),
  Plan: find(plans),
  PlansRunning: find({ appid: "App" }),
  Promo: find(unitAndPlan),
  PromosRunning: find(unitAndPlan),
  Review: find({ reviewer: "User", appid: "App", answerto: "Review" }),
  ReviewHelpful: find({ reviewer: "User", reviewid: "Review" }),
  Website: find(unit)
};
