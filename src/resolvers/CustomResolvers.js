/* eslint-disable no-undef, array-callback-return */

// Necessary to implement interfaces
export const implementMessage = {
  __resolveType(obj, context, info) {
    if (info.parentType == "Subscription") {
      return "MessageSubscription";
    }

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

export const find = data => {
  const searches = {};

  data.map(search => {
    const id = `${search.toLowerCase()}id`;
    searches[search.toLowerCase()] = (parent, args, { models }) =>
      models[search].findById(parent.dataValues[id]);
  });

  return searches;
};

export const findNotification = model => {
  const searcher = {
    touser: ({ touser }, args, { models }) => models.User.findById(touser)
  };

  if (model == "Notification") {
    searcher.fromuser = ({ dataValues }, args, { models }) =>
      models.User.findById(dataValues.fromuser);
  } else {
    searcher.fromapp = ({ fromapp }, args, { models }) => models.App.findById(fromapp);
  }
  return searcher;
};
