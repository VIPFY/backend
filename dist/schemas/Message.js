"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var types = exports.types = "\n#A notification an user receives from an app\n  enum MESSAGE_COLUMN {\n    deleted,\n    senderdeleted\n  }\n\n  enum MESSAGE_MODEL {\n    Notification,\n    AppNotification\n  }\n\n# The messages an User receives from Apps and other Users\n  interface Message {\n    id: Int!\n    # An Integer\n    type: Int!\n    sendtime: Date!\n    touser: User!\n    message: String!\n    readtime: Date\n    deleted: Boolean\n    senderdeleted: Boolean\n  }\n\n  type Notification implements Message {\n    fromuser: User!\n    id: Int!\n    # An Integer\n    type: Int!\n    touser: User!\n    sendtime: Date!\n    message: String!\n    readtime: Date\n    deleted: Boolean\n    senderdeleted: Boolean\n  }\n\n  type AppNotification implements Message {\n    fromapp: App!\n    id: Int!\n    # An Integer\n    type: Int!\n    touser: User!\n    sendtime: Date!\n    message: String!\n    readtime: Date\n    deleted: Boolean\n    senderdeleted: Boolean\n  }\n\n  type MessageSubscription implements Message {\n    fromuser: User!\n    id: Int!\n    # An Integer\n    type: Int!\n    touser: User!\n    sendtime: Date!\n    message: String!\n    readtime: Date\n    deleted: Boolean\n    senderdeleted: Boolean\n  }\n";

var queries = exports.queries = "\n# All messages an user received - either from apps or other users\n  fetchMessages(id: Int!, read: Boolean): [Message]\n";

var mutations = exports.mutations = "\n# The time an user opened a message\n  setReadtime(id: Int!, model: MESSAGE_MODEL!): MessageResponse!\n\n# Sender or Receiver can delete a message here\n  setDeleteStatus(id: Int!, model: MESSAGE_MODEL!, type: MESSAGE_COLUMN!): Response!\n\n# Send a message to another user\n  sendMessage(fromuser: Int!, touser: Int!, message: String!): MessageResponse!\n";

var subscriptions = exports.subscriptions = "\n  newMessage(toUser: Int!): Message!\n";