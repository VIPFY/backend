/* eslint-disable no-undef, array-callback-return */

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

export const implementJSON = {
  name: "JSON",
  description:
    "The `JSON` scalar type represents JSON values as specified by " +
    "[ECMA-404](http://www.ecma-international.org/" +
    "publications/files/ECMA-ST/ECMA-404.pdf).",
  parseValue(value) {
    return value;
  },
  serialize(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT: {
        const value = Object.create(null);
        ast.fields.forEach(field => {
          value[field.name.value] = parseLiteral(field.value);
        });

        return value;
      }
      case Kind.LIST:
        return ast.values.map(parseLiteral);
      case Kind.NULL:
        return null;
      default:
        return undefined;
    }
  }
};

export const find = data => {
  const searches = {};
  Object.keys(data).map(search => {
    searches[search] = async (parent, args, { models }, info) => {
      switch (data[search]) {
        case "Human":
        case "Department":
          return models[data[search]].findOne({
            where: { unitid: parent.dataValues[search] }
          });

        default: {
          if (data[search][0] == "[") {
            // return array of objects
            const modelName = data[search].substring(
              1,
              data[search].length - 1
            );
            return models[modelName].findAll({
              where: { id: { $in: parent[search] } }
            });
          } else {
            // single object
            /*console.error(
              "FIND",
              search,
              data[search],
              parent[search],
              "INFO",
              info,
              "SET",
              info.fieldNodes[0].selectionSet,
              "S",
              info.fieldNodes[0].selectionSet.selections
            );*/
            models[data[search]].findById(parent[search], { raw: true }).then(a => console.error(parent[search], a));
            if (
              info.fieldNodes[0].selectionSet.selections.filter(
                selection =>
                  !selection.name || (selection.name.value != "id" && selection.name.value != "__typename")
              ).length == 0
            ) {
              return { id: parent[search] };
            }
            return models[data[search]].findById(parent[search]);
          }
        }
      }
    };
  });

  return searches;
};
