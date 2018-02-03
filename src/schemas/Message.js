export const types = `
#A notification an user receives from an app
  enum MESSAGE_COLUMN {
    deleted,
    senderdeleted
  }

  enum MESSAGE_MODEL {
    Notification,
    AppNotification
  }

# The messages an User receives from Apps and other Users
  interface Message {
    id: Int!
    # An Integer
    type: Int!
    sendtime: Date!
    touser: User!
    message: String!
    readtime: Date
    deleted: Boolean
    senderdeleted: Boolean
  }

  type Notification implements Message {
    fromuser: User!
    id: Int!
    # An Integer
    type: Int!
    touser: User!
    sendtime: Date!
    message: String!
    readtime: Date
    deleted: Boolean
    senderdeleted: Boolean
  }

  type AppNotification implements Message {
    fromapp: App!
    id: Int!
    # An Integer
    type: Int!
    touser: User!
    sendtime: Date!
    message: String!
    readtime: Date
    deleted: Boolean
    senderdeleted: Boolean
  }

  type MessageSubscription implements Message {
    fromuser: User!
    id: Int!
    # An Integer
    type: Int!
    touser: User!
    sendtime: Date!
    message: String!
    readtime: Date
    deleted: Boolean
    senderdeleted: Boolean
  }
`;

export const queries = `
# All messages an user received - either from apps or other users
  fetchMessages(read: Boolean, type: MESSAGE_MODEL): [Message]
`;

export const mutations = `
# The time an user opened a message
  setReadtime(id: Int!, model: MESSAGE_MODEL!): MessageResponse!

# Sender or Receiver can delete a message here
  setDeleteStatus(id: Int!, model: MESSAGE_MODEL!, type: MESSAGE_COLUMN!): Response!

# Send a message to another user
  sendMessage(touser: Int!, message: String!): MessageResponse!
`;

export const subscriptions = `
  newMessage: Message!
`;
