import { GraphQLUpload } from "graphql-upload";
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
import tutorialQueries from "./queries/tutorial";
import teamQueries from "./queries/team";

import twoFA from "./mutations/2FA";
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
import tutorialMutations from "./mutations/tutorial";
import teamMutations from "./mutations/team";

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
  reviewQueries,
  tutorialQueries,
  teamQueries
);

const Mutation = Object.assign(
  twoFA,
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
  demoMutations,
  tutorialMutations,
  teamMutations
);

const unit = { unitid: "Unit" };
const unitAndPlan = { sponsor: "Unit", planid: "Plan" };
const developerAndSupport = {
  developer: "Unit",
  supportunit: "Unit",
  owner: "Unit"
};
const plans = { appid: "App", gotoplan: "Plan" };

export default {
  Query,
  Mutation,
  Date: implementDate,
  JSON: implementJSON,
  Address: find({}),
  App: find(developerAndSupport),
  AppBoughtPlanResponse: find({ usedby: "Unit", boughtplan: "BoughtPlan" }),
  AppDetails: find(developerAndSupport),
  AppUsage: find({ app: "App" }),
  Bill: find(unit),
  BillPosition: find({ billid: "Bill" }),
  BoughtPlan: find({
    buyer: "Unit",
    usedby: "Unit",
    planid: "Plan",
    payer: "Unit"
  }),
  BoughtplanUsagePerUser: find({ boughtplan: "BoughtPlan", unit: "User" }),
  Department: find({ ...unit, adminkey: "Key" }),
  DepartmentData: find(unit),
  DepartmentEmail: find({ departmentid: "Department", emailownerid: "Unit" }),
  DepartmentEmployee: find({
    id: "Department",
    childid: "Unit",
    employee: "User"
  }),
  Domain: find({ boughtplanid: "BoughtPlan" }),
  Email: find(unit),
  TempLicence: find({ licenceid: "Licence", unitid: "User", owner: "User" }),
  Licence: find({
    unitid: "User",
    boughtplanid: "BoughtPlan",
    teamlicence: "Team",
    teamaccount: "Team"
  }),
  Log: find({ user: "User", sudoer: "User" }),
  Key: find({ unitid: "User" }),
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
  Phone: find({}),
  Plan: find(plans),
  PlansRunning: find({ appid: "App" }),
  Promo: find(unitAndPlan),
  PromosRunning: find(unitAndPlan),
  PublicLicence: find({ unitid: "SemiPublicUser", boughtplanid: "BoughtPlan" }),
  Review: find({ unitid: "User", appid: "App", answerto: "Review" }),
  ReviewHelpful: find({ unitid: "User", reviewid: "Review" }),
  Right: find({ holder: "Unit", forunit: "Unit" }),
  SimpleStats: find({ usedby: "Unit", boughtplan: "BoughtPlan" }),
  StartGroupResponse: find({ messagegroup: "MessageGroup" }),
  Team: find({
    unitid: "Unit",
    employees: "[User]",
    licences: "[Licence]",
    services: "[BoughtPlan]"
  }),
  ServiceLicence: find({
    licence: "Licence"
  }),
  CompanyService: find({
    app: "App",
    licences: "[Licence]"
  }),
  TeamBoughtPlan: find({
    departmentid: "Team",
    boughtplanid: "BoughtPlan"
  }),
  Upload: GraphQLUpload,
  User: find({ company: "Department", emails: "[Email]", phones: "[Phone]" }),
  SemiPublicUser: find({
    company: "Department",
    emails: "[Email]",
    addresses: "[Address]",
    phones: "[Phone]"
  }),
  UserSecurityOverview: find({ unitid: "User" }),
  Website: find({})
};
