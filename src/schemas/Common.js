export const types = `
# This three sexes are possible
enum SEX {
  m,
  f,
  u
}

# An user must have one of these stati
enum USER_STATUS {
  toverify,
  normal,
  banned,
  onlynews
}

# Directions for sorting
enum ORDER {
  ASC,
  DESC
}

# Custom Scalar Date
  scalar Date

# Custom Scalar JSON
  scalar JSON

type Notification {
  id: Int!
  receiver: User!
  sendtime: String!
  readtime: String!
  message: String
  icon: String
  link: String
}

type Newsletter {
  email: Email!
  activesince: String!
  activeuntil: String
}

type Log {
  id: Int!
  time: String!
  eventtype: String!
  eventdata: JSON!
  ip: String
  user: User!
  sudoer: User!
}

# Necessary to upload pictures
input File {
  name: String!
  type: String!
  size: Int!
  path: String!
}

# Interval
input Interval {
  years: String,
  months: String,
  weeks: String,
  days: String
}

input SortOptions {
  name: String!
  order: ORDER!
}

input Options {
  domain: String
  whoisPrivacy: Int
}
`;

export const mutations = `
  # Sends an email from an user to office@vipfy.com
  newContactEmail(name: String!, email: String!, phone: String, message: String): Response!

  # Checks whether an email already exists in our database
  checkEmail(email: String): Response!

  # Checks whether a name of an app already exists in our database
  checkName(name: String): Response!
  
  readNotification(id: Int!): Boolean!
  readAllNotifications: Boolean!
`;

export const queries = `
  fetchNotifications: [Notification]!
`;

export const subscriptions = `
  newNotification(receiver: Int!): Notification!
`;
