const graphql = require('graphql');
const axios = require('axios');
//These are the Types which GraphQL will use, like String, Object, ...
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLSchema
} = graphql;

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
    // livingaddress [{country, city, street, number, ordernumber}],
    // payingaddress [{country, city, street, number, ordernumber}],
    // deliveryaddress [{country, city, street, number, normaltime{from,to}, ordernumber}],
    // payingoption [{type, number, name, limit, ordernumber}]
    // birthday {date, month, year},
    sex: { type: GraphQLString },
    profilepicture: { type: GraphQLString },
    // nationality [],
    companyname: { type: GraphQLString },
    companylogo: { type: GraphQLString },
    companylegalform: { type: GraphQLString },
    // companyaddress {country, city, street, number, ordernumber},
    // companypayingaddress [{country, city, street, number, ordernumber}],
    // companydeliveryaddress [{country, city, street, number, ordernumber}],
    // companypayingoption [{type, number, name, limit, ordernumber}],
    // yearsincompany { type: GraphQLInt },
    // position [history],
    // department [history],
    // admin [{type, option}],
    salary: { type: GraphQLInt },
    // likes [{key, value}],
    // dislikes [{key, value}],
    // notifications [{type, text}],
    // phonenumber [],
    recoveryemail: { type: GraphQLString },
    // websites[],
    // languages [],
    // tollskills [],
    // certificates [],
    // socialprofiles [{site, link}],
    // accessgroups [],
    // additionalcompanyapps [],
    // additionalpersonalapps: [ type: GraphQLString ],
    // rights [{key, value}],
    // personalbillhistory [],
    // companybillhistory [],
    // recoveryoptioncompany [], //was erlaubt ist
    recoveryoptionpersonal: { type: GraphQLString }  //was gewählt wurde
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
