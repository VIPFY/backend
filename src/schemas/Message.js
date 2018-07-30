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
    id: ID!
    receiver: MessageGroup!
    sender: PublicUser!
    sendtime: Date!
    messagetext: String!
    payload: JSON
    deletedat: Date
    modifiedat: Date
  }

  type MessageGroupMembership {
    id: ID!
    groupid: MessageGroup!
    unitid: Unit!
    visibletimestart: Date
    visibletimeend: Date
    lastreadmessageid: Int
  }

  type MessageTag {
    id: ID!
    unitid: Unit!
    messageid: Message!
    tag: String
    public: Boolean
    createdat: Date
  }

  type PublicUser {
    id: ID!
    firstname: String
    middlename: String
    lastname: String
    title: String
    sex: SEX
    birthday: Date
    language: String
    profilepicture: String
  }

  type MessageGroup {
    id: ID!
    name: String
    image: String
    foundingdate: Date!
    lastmessage: MessageData
    memberships: [MessageGroupMembership]
  }

  enum MESSAGE_COLUMN {
    archivetimesender,
    archivetimereceiver
  }

  type StartGroupResponse {
    ok: Bool!
    messagegroup: MessageGroup
  }
`;

export const queries = `
# All messages an user received - either from apps or other users
  fetchMessages(read: Boolean): [Message]
  fetchLastDialogMessages: [MessageData]
  fetchDialog(groupid: Int!): [MessageData]
  fetchGroups: [MessageGroup]
`;

export const mutations = `
# Sender or Receiver can delete a message here
  setDeleteStatus(id: Int!, type: MESSAGE_COLUMN!): Response!

# The time an user opened a message
  setReadtime(id: Int!): MessageResponse!

# Send a message to another user
  sendMessage(groupid: Int!, message: String!): MessageResponse!

  startConversation(receiver: Int!, defaultrights: [String]!): StartGroupResponse!
  startGroup(receivers: [Int], defaultrights: [String]!, groupname: String!): StartGroupResponse!
`;

export const subscriptions = `
  newMessage: MessageData!
`;
