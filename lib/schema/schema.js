'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fields;

var _graphql = require('graphql');

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var BirthdayType = new _graphql.GraphQLObjectType({
  name: 'Birthday',
  description: 'The format will be dd/mm/yyyy',
  fields: {
    day: { type: _graphql.GraphQLInt },
    month: { type: _graphql.GraphQLInt },
    year: { type: _graphql.GraphQLInt }
  }
});

var UserType = new _graphql.GraphQLObjectType({
  name: 'User',
  description: 'A natural person which can work for several companies.',
  fields: (_fields = {
    id: { type: _graphql.GraphQLID },
    referral: { type: _graphql.GraphQLBoolean },
    firstName: { type: _graphql.GraphQLString },
    lastName: { type: _graphql.GraphQLString },
    position: { type: _graphql.GraphQLString },
    email: { type: _graphql.GraphQLString },
    title: { type: _graphql.GraphQLString },
    livingAddress: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
    payingAddress: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
    deliveryAddress: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
    payingOption: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
    birthday: { type: BirthdayType },
    sex: { type: _graphql.GraphQLString },
    profilePicture: { type: _graphql.GraphQLString },
    nationality: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
    companyName: { type: _graphql.GraphQLString },
    companyLogo: { type: _graphql.GraphQLString },
    companyLegalForm: { type: _graphql.GraphQLString },
    companyAddress: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
    companyPayingAddress: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
    companyDeliveryAddress: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
    companyPayingOption: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
    yearsInCompany: { type: _graphql.GraphQLInt }
  }, _defineProperty(_fields, 'position', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'department', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'admin', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'salary', { type: _graphql.GraphQLInt }), _defineProperty(_fields, 'likes', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'dislikes', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'notifications', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'phoneNumber', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'recoveryEmail', { type: _graphql.GraphQLString }), _defineProperty(_fields, 'websites', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'languages', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'certificates', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'socialProfiles', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'accessGroups', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'companyApps', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'personalApps', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'rights', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'personalBillHistory', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'companyBillHistory', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'recoveryOptionCompany', { type: new _graphql.GraphQLList(_graphql.GraphQLString) }), _defineProperty(_fields, 'recoveryOptionPersonal', { type: _graphql.GraphQLString }), _fields)
});
//Defines the entry point into a Graph
var RootQuery = new _graphql.GraphQLObjectType({
  name: 'RootQueryType',
  description: 'This is the Root Query',
  fields: {
    users: {
      type: UserType,
      //Graphql wants the id as an argument
      args: { id: { type: _graphql.GraphQLID } },
      //and will return an user with the corresponding id for it
      resolve: function resolve(parentValue, args) {
        return _axios2.default.get('http://localhost:5432/users/' + args.id).then(function (resp) {
          return resp.data;
        });
      }
    }
  }
});

var Schema = new _graphql.GraphQLSchema({
  query: RootQuery
});

exports.default = Schema;
//# sourceMappingURL=schema.js.map