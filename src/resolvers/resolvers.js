import departmentQueries from "./queries/department";
import appQueries from "./queries/app";
import messageQueries from "./queries/message";
import reviewQueries from "./queries/review";
import billQueries from "./queries/bill";
import contactQueries from "./queries/contact";
import authQueries from "./queries/auth";
import adminQueries from "./queries/admin";
import demoQueries from "./queries/demo";

import appMutations from "./mutations/app";
import messageMutations from "./mutations/message";
import authMutations from "./mutations/auth";
import userMutations from "./mutations/unit";
import reviewMutations from "./mutations/review";
import commonMutations from "./mutations/common";
import departmentMutations from "./mutations/department";
import billMutations from "./mutations/bill";
import contactMutations from "./mutations/contact";
import adminMutations from "./mutations/admin";
import demoMutations from "./mutations/demo";

import Subscription from "./subscriptions";

import { find, implementDate, implementJSON } from "./CustomResolvers";

const Query = Object.assign(
  authQueries,
  adminQueries,
  departmentQueries,
  contactQueries,
  appQueries,
  messageQueries,
  reviewQueries,
  billQueries,
  demoQueries
);

const Mutation = Object.assign(
  appMutations,
  adminMutations,
  authMutations,
  departmentMutations,
  messageMutations,
  userMutations,
  reviewMutations,
  commonMutations,
  billMutations,
  contactMutations,
  demoMutations
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
  BoughtPlan: find({ buyer: "Unit", usedby: "Unit", planid: "Plan", payer: "Unit" }),
  Department: find(unit),
  DepartmentData: find(unit),
  DepartmentEmail: find({ departmentid: "Department", emailownerid: "Unit" }),
  DepartmentEmployee: find({ id: "Department", childid: "Unit", employee: "User" }),
  Email: find(unit),
  Human: find(unit),
  Licence: find({ unitid: "Unit", boughtplanid: "BoughtPlan" }),
  Log: find({ user: "User", sudoer: "User" }),
  Message: find({ receiver: "Human" }),
  MessageData: find({ sender: "User", receiver: "MessageGroup" }),
  MessageGroupMembership: find({ groupid: "MessageGroup", unitid: "User" }),
  MessageTag: find({ unitid: "User", messageid: "MessageTag" }),
  MessageGroup: find({ lastmessage: "MessageData", memberships: "[MessageGroupMembership]" }),
  MessageResponse: find({ message: "MessageData" }),
  StartGroupResponse: find({ messagegroup: "MessageGroup" }),
  Newsletter: find({ email: "Email" }),
  ParentUnit: find({ parentunit: "Unit", childunit: "Unit" }),
  Phone: find(unit),
  Plan: find(plans),
  PlansRunning: find({ appid: "App" }),
  Promo: find(unitAndPlan),
  PromosRunning: find(unitAndPlan),
  Review: find({ reviewer: "User", appid: "App", answerto: "Review" }),
  AppBoughtPlanResponse: find({ usedby: "Unit", boughtplan: "BoughtPlan" }),
  ReviewHelpful: find({ reviewer: "User", reviewid: "Review" }),
  Right: find({ holder: "Unit", forunit: "Unit" }),
  User: find({ company: "Department" }),
  Website: find(unit)
};
