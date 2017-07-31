const graphql = require('graphql');
const axios = require('axios');
//These are the Types which GraphQL will use, like String, Object, ...
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLSchema,
  GraphQLList
} = graphql;

const BirthdayType = new GraphQLObjectType({
  name: 'Birthday',
  fields: {
    day: { type: GraphQLInt },
    month: { type: GraphQLInt },
    year: { type: GraphQLInt }
  }
});

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: { type: GraphQLString },
    referral: { type: GraphQLBoolean },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    position: { type: GraphQLString },
    email: { type: GraphQLString },
    title: { type: GraphQLString },
    livingAddress: { type: new GraphQLList(GraphQLString) },
    payingAddress: { type: new GraphQLList(GraphQLString) },
    deliveryAddress: { type: new GraphQLList(GraphQLString) },
    payingOption: { type: new GraphQLList(GraphQLString) },
    birthday: { type: BirthdayType },
    sex: { type: GraphQLString },
    profilePicture: { type: GraphQLString },
    nationality: { type: new GraphQLList(GraphQLString) },
    companyName: { type: GraphQLString },
    companyLogo: { type: GraphQLString },
    companyLegalForm: { type: GraphQLString },
    companyAddress: { type: new GraphQLList(GraphQLString) },
    companyPayingAddress: { type: new GraphQLList(GraphQLString) },
    companyDeliveryAddress: { type: new GraphQLList(GraphQLString) },
    companyPayingOption: { type: new GraphQLList(GraphQLString) },
    yearsInCompany: { type: GraphQLInt },
    position: { type: new GraphQLList(GraphQLString) },
    department: { type: new GraphQLList(GraphQLString) },
    admin: { type: new GraphQLList(GraphQLString) },
    salary: { type: GraphQLInt },
    likes: { type: new GraphQLList(GraphQLString) },
    dislikes: { type: new GraphQLList(GraphQLString) },
    notifications: { type: new GraphQLList(GraphQLString) },
    phoneNumber: { type: new GraphQLList(GraphQLString) },
    recoveryEmail: { type: GraphQLString },
    websites: { type: new GraphQLList(GraphQLString) },
    languages: { type: new GraphQLList(GraphQLString) },
    // softskills: { type: new GraphQLList(GraphQLString) },
    certificates: { type: new GraphQLList(GraphQLString) },
    socialProfiles: { type: new GraphQLList(GraphQLString) },
    accessGroups: { type: new GraphQLList(GraphQLString) },
    companyApps: { type: new GraphQLList(GraphQLString) },
    personalApps: { type: new GraphQLList(GraphQLString) },
    rights: { type: new GraphQLList(GraphQLString) },
    personalBillHistory: { type: new GraphQLList(GraphQLString) },
    companyBillHistory: { type: new GraphQLList(GraphQLString) },
    recoveryOptionCompany: { type: new GraphQLList(GraphQLString) },
    recoveryOptionPersonal: { type: GraphQLString }
  }
});
//Defines the entry point into a Graph
const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    user: {
      type: UserType,
      //Graphql wants the id as an argument
      args: { id: { type: GraphQLString } },
      //and will return an user with the corresponding id for it
      resolve(parentValue, args) {
        return axios.get(`http://localhost:3004/users/${args.id}`)
          .then(resp => resp.data);
      }
    }
  }
});

module.exports = new GraphQLSchema({
  query: RootQuery
});
