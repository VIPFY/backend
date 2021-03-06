export const types = `
# The messages an User receives from Apps and other Users. This is a View
  type Message {
    id: ID!
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
  fetchDialog(groupid: ID!, limit: Int, cursor: String): [MessageData]
  fetchGroups: [MessageGroup]
  fetchPublicUser(userid: ID!, canbedeleted: Boolean): PublicUser
`;

export const mutations = `
# Sender or Receiver can delete a message here
  setDeleteStatus(id: ID!, type: MESSAGE_COLUMN!): Response!

# Send a message to another user
  sendMessage(groupid: ID!, message: String, file: Upload): MessageResponse!

  startConversation(receiver: ID!, defaultrights: [String]!): StartGroupResponse!
  startGroup(receivers: [ID], defaultrights: [String]!, groupname: String!): StartGroupResponse!
`;

export const subscriptions = `
  newMessage(groupid: ID!): MessageData!
`;
