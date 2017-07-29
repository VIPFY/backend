const express = require('express');
const expressGraphQL = require('express-graphql');
const schema = require('./schema/schema');

const app = express();
const port = process.env.PORT || 4000;

app.use('/graphql', expressGraphQL({
  schema, //The Schema which was created
  graphiql: true //The GraphQl-Interface
}));

app.listen(port, () => {
  console.log(`App listening on port ${port}...`);
  console.log('Press Ctrl+C to quit.');
});
