import userQueries from "./queries/user";
import appQueries from "./queries/app";
import companyQueries from "./queries/company";
import messageQueries from "./queries/message";
import reviewQueries from "./queries/review";

import dd24Mutations from "./mutations/dd24";
import messageMutations from "./mutations/message";
import userMutations from "./mutations/user";
import reviewMutations from "./mutations/review";

import {
  findUser,
  findApp,
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
  Employee: findUser,
  Plan: findApp,
  Review: findUser,
  UserRight: findUser,
  Notification: findNotification("Notification"),
  AppNotification: findNotification("AppNotification"),
  Message: implementMessage,
  Date: implementDate
};
