import Query from "./Queries";
import Mutation from "./Mutations";
import {
  findUser,
  findApp,
  implementMessage,
  findNotification,
  implementDate
} from "./CustomResolvers";

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
  Date: implementDate,
  LoginResponse: findUser
};
