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
    receiver: PublicUser!
  }

# The original table which contains the messages
  type MessageData {
    id: ID!
    receiver: MessageGroup!
    sender: PublicUser
    sendtime: Date!
    messagetext: String!
    payload: JSON
    deletedat: Date
    modifiedat: Date
  }

  type MessageGroupMembership {
    id: ID!
    groupid: MessageGroup!
    unitid: PublicUser!
    visibletimestart: Date
    visibletimeend: Date
    lastreadmessageid: ID
  }

  type MessageTag {
    id: ID!
    unitid: PublicUser!
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
    ok: Boolean!
    messagegroup: MessageGroup
  }

  type MessageResponse {
    ok: Boolean!
    message: ID
  }
`;

export const queries = `
# All messages an user received - either from apps or other users
  fetchMessages(read: Boolean): [Message]
  fetchDialog(groupid: ID!): [MessageData]
  fetchGroups: [MessageGroup]
  fetchPublicUser(userid: ID!): PublicUser
`;

export const mutations = `
# Sender or Receiver can delete a message here
  setDeleteStatus(id: ID!, type: MESSAGE_COLUMN!): Response!

# Send a message to another user
  sendMessage(groupid: ID!, message: String!): MessageResponse!

  startConversation(receiver: ID!, defaultrights: [String]!): StartGroupResponse!
  startGroup(receivers: [ID], defaultrights: [String]!, groupname: String!): StartGroupResponse!
`;

export const subscriptions = `
  newMessage(groupid: ID!): MessageData!
`;
