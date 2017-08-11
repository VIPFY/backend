'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _postgraphql = require('postgraphql');

var _postgraphql2 = _interopRequireDefault(_postgraphql);

var _loginData = require('./login-data');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)(); // import Express from 'express';
// import expressGraphQL from 'express-graphql';
// import schema from './schema/schema';
//
// const app = Express();
// const port = process.env.PORT || 4000;
//
// app.use('/graphql', expressGraphQL({
//   schema, //The Schema which was created
//   pretty: true,
//   graphiql: true //The GraphQl-Interface
// }));
//
// app.listen(port, () => {
//   console.log(`App listening on port ${port}...`);
//   console.log('Press Ctrl+C to quit.');
// });

var PORT = process.env.PORT || 4000;

app.use((0, _postgraphql2.default)('postgres://postgres:' + _loginData.postgresLogin + '@localhost:5432/postgres', 'public', //Name of the Schema that should be used
{ graphiql: true }));

app.listen(PORT, function () {
  console.log('App listening on PORT ' + PORT + '...');
  console.log('Go to localhost:' + PORT + '/graphql for the GraphQL-Interface.');
  console.log('Press Ctrl+C to quit.');
});
//# sourceMappingURL=server.js.map