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
import dd24Mutations from "./mutations/dd24";
import departmentMutations from "./mutations/department";
import billMutations from "./mutations/bill";
import contactMutations from "./mutations/contact";
import adminMutations from "./mutations/admin";
import demoMutations from "./mutations/demo";

import Subscription from "./subscriptions";

import { find, findDepartment, implementDate, implementJSON } from "./CustomResolvers";

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
  dd24Mutations,
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
  BoughtPlan: find({ buyer: "Unit", planid: "Plan", payer: "Unit" }),
  Department: find(unit),
  DepartmentData: find(unit),
  DepartmentEmail: find({ departmentid: "Unit", emailownerid: "Unit" }),
  DepartmentEmployee: find({ id: "Unit", childid: "Department", employee: "User" }),
  Email: find(unit),
  Human: find(unit),
  Licence: find({ unitid: "Unit", boughtplanid: "BoughtPlan" }),
  Log: find({ user: "User", sudoer: "User" }),
  Message: find({ receiver: "Unit" }),
  MessageData: find({ sender: "Unit", receiver: "Unit" }),
  Newsletter: find({ email: "Email" }),
  ParentUnit: find({ parentunit: "Unit", childunit: "Unit" }),
  Phone: find(unit),
  Plan: find(plans),
  PlansRunning: find({ appid: "App" }),
  Promo: find(unitAndPlan),
  PromosRunning: find(unitAndPlan),
  Review: find({ reviewer: "User", appid: "App", answerto: "Review" }),
  ReviewHelpful: find({ reviewer: "User", reviewid: "Review" }),
  Right: find({ holder: "User", forunit: "User" }),
  User: findDepartment({ company: "Department" }),
  Website: find(unit)
};
