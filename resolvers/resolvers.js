import Employee from "./Employee";
import Review from "./Review";
import Query from "./Queries";
import Mutation from "./Mutations";

const resolvers = {};

resolvers.Employee = Employee;
resolvers.Review = Review;
resolvers.Query = Query;
resolvers.Mutation = Mutation;

export default resolvers;
