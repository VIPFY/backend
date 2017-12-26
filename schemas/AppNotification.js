export const types = `
#A notification an user receives from an app
type AppNotification {
  id: Int!
  # An Integer
  type: Int!
  # The receiver of the message
  touser: User!
  # The sender of the message
  fromapp: App!
  sendtime: String!
  readtime: String
  deleted: Boolean
  senderdeleted: Boolean
  message: String!
}
`;

export const queries = `
# Fetch all the Notfications associated with an user
fetchReceivedNotifications(userid: Int!, sender: String!): [AppNotification]
`;

export const mutations = `
setDeleteStatus(id: Int!): String!
setSenderDeleteStatus(id: Int!): String!
setReadtime(id: Int!): String!
`;
