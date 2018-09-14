import adminQueries from "./queries/admin";
import authQueries from "./queries/auth";
import appQueries from "./queries/app";
import billQueries from "./queries/bill";
import commonQueries from "./queries/common";
import contactQueries from "./queries/contact";
import demoQueries from "./queries/demo";
import domainQueries from "./queries/domain";
import departmentQueries from "./queries/department";
import messageQueries from "./queries/message";
import reviewQueries from "./queries/review";

import adminMutations from "./mutations/admin";
import authMutations from "./mutations/auth";
import appMutations from "./mutations/app";
import billMutations from "./mutations/bill";
import commonMutations from "./mutations/common";
import contactMutations from "./mutations/contact";
import demoMutations from "./mutations/demo";
import departmentMutations from "./mutations/department";
import domainMutations from "./mutations/domain";
import messageMutations from "./mutations/message";
import reviewMutations from "./mutations/review";
import userMutations from "./mutations/unit";

import Subscription from "./subscriptions";

import { find, implementDate, implementJSON } from "./customResolvers";

const Query = Object.assign(
  adminQueries,
  appQueries,
  authQueries,
  billQueries,
  commonQueries,
  contactQueries,
  demoQueries,
  departmentQueries,
  domainQueries,
  messageQueries,
  reviewQueries
);

const Mutation = Object.assign(
  adminMutations,
  appMutations,
  authMutations,
  departmentMutations,
  domainMutations,
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
  AppBoughtPlanResponse: find({ usedby: "Unit", boughtplan: "BoughtPlan" }),
  AppDetails: find(developerAndSupport),
  Bill: find(unit),
  BillPosition: find({ vendor: "Unit", billid: "Bill", planid: "Plan" }),
  BoughtPlan: find({
    buyer: "Unit",
    usedby: "Unit",
    planid: "Plan",
    payer: "Unit"
  }),
  Department: find(unit),
  DepartmentData: find(unit),
  DepartmentEmail: find({ departmentid: "Department", emailownerid: "Unit" }),
  DepartmentEmployee: find({
    id: "Department",
    childid: "Unit",
    employee: "User"
  }),
  Domain: find({
    unitid: "Department",
    boughtplanid: "BoughtPlan"
  }),
  Email: find(unit),
  Human: find(unit),
  Licence: find({ unitid: "Unit", boughtplanid: "BoughtPlan" }),
  Log: find({ user: "User", sudoer: "User" }),
  Message: find({ receiver: "Human" }),
  MessageData: find({ sender: "User", receiver: "MessageGroup" }),
  MessageGroupMembership: find({ groupid: "MessageGroup", unitid: "User" }),
  MessageTag: find({ unitid: "User", messageid: "MessageTag" }),
  MessageGroup: find({
    lastmessage: "MessageData",
    memberships: "[MessageGroupMembership]"
  }),
  MessageResponse: find({ message: "MessageData" }),
  Newsletter: find({ email: "Email" }),
  Notification: find({ receiver: "Unit" }),
  ParentUnit: find({ parentunit: "Unit", childunit: "Unit" }),
  Phone: find(unit),
  Plan: find(plans),
  PlansRunning: find({ appid: "App" }),
  Promo: find(unitAndPlan),
  PromosRunning: find(unitAndPlan),
  Review: find({ unitid: "User", appid: "App", answerto: "Review" }),
  ReviewHelpful: find({ unitid: "User", reviewid: "Review" }),
  Right: find({ holder: "Unit", forunit: "Unit" }),
  StartGroupResponse: find({ messagegroup: "MessageGroup" }),
  User: find({ company: "Department", emails: "[Email]" }),
  Website: find(unit)
};
