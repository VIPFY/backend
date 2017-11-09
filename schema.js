export default `
  type User {
    id: Int!
    email: String!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    allUsers: [User!]!
    getUser(email: String!): User
  }

  type Mutation {
    updateUser(email: String!, newEmail: String!): [Int!]!
    deleteUser(email: String!): Int!
    register(email: String!, passwordHash: String!): User!
    login(email: String!, passwordHash: String!): String!
  }
`;
