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
    tags: [String]
    messagetext: String!
    receiver: Unit!
  }

# The original table which contains the messages
  type MessageData {
    id: Int!
    sendtime: Date!
    messagetext: String!
    receiver: PublicUser!
    sender: PublicUser!
    payload: JSON
    deletedat: Date
  }

  type MessageGroup {
    id: Int!
    image: String!
    name: String!
    foundingdate: Date!
  }

  type MessageGroupMembership {
    id: Int!
    groupid: MessageGroup!
    unitid: Unit!
    visibletimestart: Date
    visibletimeend: Date
    rights: [String]
    lastreadmessageid: Int
    archived: Boolean
  }

  type MessageTag {
    id: Int!
    unitid: Unit!
    messageid: Message!
    tag: String
    public: Boolean
    createdat: Date
  }

  type PublicUser {
    id: Int!
    firstname: String
    middlename: String
    lastname: String
    title: String
    sex: SEX
    birthday: Date
    language: String
    profilepicture: String
  }

  enum MESSAGE_COLUMN {
    archivetimesender,
    archivetimereceiver
  }
`;

export const queries = `
# All messages an user received - either from apps or other users
  fetchMessages(read: Boolean): [Message]
  fetchLastDialogMessages: [MessageData]
  fetchDialog(groupid: Int!): [MessageData]
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
