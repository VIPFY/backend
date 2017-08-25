// import Express from 'express';
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

import Express from 'express';
import postgraphql from 'postgraphql';
import { postgresLogin } from './login-data';

const app = Express();
const PORT = process.env.PORT || 4000;

app.use(postgraphql(
  `postgres://postgres:${postgresLogin}@localhost:5432/postgres`,
  'public', //Name of the Schema that should be used
  {
    graphiql: true,
    enableCors: true
    }
));

app.listen(PORT, () => {
  console.log(`App listening on PORT ${PORT}...`);
  console.log(`Go to localhost:${PORT}/graphiql for the GraphQL-Interface.`);
  console.log('Press Ctrl+C to quit.');
});
