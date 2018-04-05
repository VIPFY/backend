export const types = `
# The messages an User receives from Apps and other Users. This is a View
  type Message {
    id: Int!
    sendtime: Date!
    readtime: Date
    senderpicture: String
    sendername: String!
    archivetimesender: Date
    archivetimereceiver: Date
    tag: [String]
    messagetext: String!
    receiver: Unit!
  }

# The original table which contains the messages
  type MessageData {
    id: Int!
    sendtime: Date!
    readtime: Date
    archivetimesender: Date
    archivetimereceiver: Date
    tag: [String]
    messagetext: String!
    receiver: Unit!
    sender: Unit!
  }

  enum MESSAGE_COLUMN {
    archivetimesender,
    archivetimereceiver
  }
`;

export const queries = `
# All messages an user received - either from apps or other users
  fetchMessages(read: Boolean): [Message]
`;

export const mutations = `
# Sender or Receiver can delete a message here
  setDeleteStatus(id: Int!, type: MESSAGE_COLUMN!): Response!

# The time an user opened a message
  setReadtime(id: Int!): MessageResponse!

# Send a message to another user
  sendMessage(touser: Int!, message: String!): MessageResponse!
`;

export const subscriptions = `
  newMessage: MessageData!
`;
