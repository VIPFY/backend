import userQueries from "./queries/user";
import appQueries from "./queries/app";
import companyQueries from "./queries/company";
import messageQueries from "./queries/message";
import reviewQueries from "./queries/review";

import dd24Mutations from "./mutations/dd24";
import messageMutations from "./mutations/message";
import userMutations from "./mutations/user";
import reviewMutations from "./mutations/review";

import Subscription from "./subscriptions";

import {
  find,
  implementMessage,
  findNotification,
  implementDate
} from "./CustomResolvers";

const Query = Object.assign(
  userQueries,
  appQueries,
  companyQueries,
  messageQueries,
  reviewQueries
);

const Mutation = Object.assign(
  dd24Mutations,
  messageMutations,
  userMutations,
  reviewMutations
);

export default {
  Query,
  Mutation,
  Subscription,
  Employee: find(["User", "Company", "Department"]),
  Plan: find(["App"]),
  Review: find(["User", "App"]),
  UserRight: find(["User"]),
  Notification: findNotification("Notification"),
  AppNotification: findNotification("AppNotification"),
  Department: find(["Company"]),
  Message: implementMessage,
  Date: implementDate,
  Speak: find(["User"]),
  UserBill: find(["User", "Plan"])
};
