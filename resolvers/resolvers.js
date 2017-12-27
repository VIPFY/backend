import {
  findUser,
  findApp,
  findUserNotification,
  findAppNotification,
  findMessages
} from "./CommonResolvers";
import Query from "./Queries";
import Mutation from "./Mutations";

const resolvers = {};

resolvers.Query = Query;
resolvers.Mutation = Mutation;
resolvers.Employee = findUser;
resolvers.Plan = findApp;
resolvers.Review = findUser;
resolvers.UserRight = findUser;
resolvers.Notification = findUserNotification;
resolvers.AppNotification = findAppNotification;
resolvers.Message = findMessages;

export default resolvers;
