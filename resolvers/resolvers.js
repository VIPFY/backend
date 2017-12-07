import { findUser } from "./CommonResolvers";
import Query from "./Queries";
import Mutation from "./Mutations";

const resolvers = {};

resolvers.Employee = findUser;
resolvers.Review = findUser;
resolvers.UserRight = findUser;
resolvers.Query = Query;
resolvers.Mutation = Mutation;

export default resolvers;
