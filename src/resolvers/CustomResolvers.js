/* eslint-disable no-undef, array-callback-return */

// Necessary to implement interfaces
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

// export const find = data => {
//   const searches = {};
//
//   data.map(search => {
//     const id = `${search.toLowerCase()}id`;
//     searches[id] = (parent, args, { models }) => models[search].findById(parent.dataValues[id]);
//   });
//
//   return searches;
// };

export const find = data => {
  const searches = {};

  Object.keys(data).map(search => {
    searches[search] = (parent, args, { models }) =>
      models[data[search]].findById(parent.dataValues[id]);
  });

  return searches;
};

export const findMessage = () => {
  const searcher = {
    sender: ({ sender }, args, { models }) => models.Unit.findById(sender),
    receiver: ({ receiver }, args, { models }) => models.Unit.findById(receiver)
  };

  return searcher;
};
