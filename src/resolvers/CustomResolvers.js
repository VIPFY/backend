export const find = data => {
  const searches = {};

  data.map(search => {
    let id = search.toLowerCase() + "id";
    searches[search.toLowerCase()] = ({ id }, args, { models }) =>
      models[search].findById(id);
  });

  return searches;
};

export const findNotification = model => {
  const searcher = {
    touser: ({ touser }, args, { models }) => models.User.findById(touser)
  };
  model == "Notification"
    ? (searcher.fromuser = ({ fromuser }, args, { models }) =>
        models.User.findById(fromuser))
    : (searcher.fromapp = ({ fromapp }, args, { models }) =>
        models.App.findById(fromapp));

  return searcher;
};

// Necessary to implement interfaces
export const implementMessage = {
  __resolveType(obj, context, info) {
    if (obj.fromuser) {
      return "Notification";
    }

    if (obj.fromapp) {
      return "AppNotification";
    }

    return null;
  }
};

export const implementDate = {
  name: "Date",
  description: "Date custom scalar type. Returns a large integer",
  parseValue(value) {
    return new Date(value); // value from the client
  },
  serialize(value) {
    return value.getTime(); // value sent to the client
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return parseInt(ast.value, 10); // ast value is always in string format
    }
    return null;
  }
};
