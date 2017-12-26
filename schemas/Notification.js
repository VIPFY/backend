export const types = `
type Notification {
  id: Int!
  # An Integer
  type: Int!
  # The receiver of the message
  touser: User!
  # The sender of the message
  fromuser: User!
  sendtime: String
  readtime: String!
  deleted: Boolean
  senderdeleted: Boolean
  message: String!
}
`;

export const queries = `
# Fetch all the Notfications associated with an user
fetchSentNotifications(userid: Int!): [Notification]
fetchReceivedNotifications(userid: Int!): [Notification]
`;

export const mutations = `
setDeleteStatus(id: Int!): String!
setSenderDeleteStatus(id: Int!): String!
setReadtime(id: Int!): String!
`;
