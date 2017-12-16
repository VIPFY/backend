import { findUser, findApp } from "./CommonResolvers";
import Query from "./Queries";
import Mutation from "./Mutations";

const resolvers = {};

resolvers.Employee = findUser;
resolvers.Plan = findApp;
resolvers.Review = findUser;
resolvers.UserRight = findUser;
resolvers.Query = Query;
resolvers.Mutation = Mutation;

export default resolvers;
