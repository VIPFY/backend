import { moment } from "moment";
import { NormalError } from "../errors";
import logger from "../loggers";
import { EMAIL_VERIFICATION_TIME } from "../constants";
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

const specialKeys = {
  Human: "unitid",
  Department: "unitid",
  Email: "unitid"
};

const postprocessors = {
  Department: async (value, fields, models) => {
    logger.debug("postprocessing department", { value, fields, models });
    if (fields.includes("domains")) {
      value.domains = await models.sequelize.query(
        `SELECT ld.id, ld.key->'domain' as domainname FROM licence_data ld INNER JOIN
      boughtplan_data bpd on ld.boughtplanid = bpd.id WHERE
      bpd.planid IN (25, 48, 49, 50, 51, 52, 53) AND ld.unitid = :unitid;`,
        {
          replacements: { unitid: value.unitid },
          type: models.sequelize.QueryTypes.SELECT,
          raw: true
        }
      );
    }
    return value;
  },
  Email: async (value, fields) => {
    if (fields.includes("verifyuntil")) {
      console.log("FIELDS: ", fields);
      console.log("VALUE: ", value);
      value.verifyuntil = moment(value.createdat) - EMAIL_VERIFICATION_TIME;
    }
    return value;
  }
};

const postprocess = async (datatype, value, fields, models) => {
  if (datatype in postprocessors) {
    return postprocessors[datatype](value, fields, models);
  } else {
    return value;
  }
};

export const find = data => {
  const searches = {};
  Object.keys(data).map(search => {
    searches[search] = async (parent, args, { models }, info) => {
      try {
        const datatype = data[search];
        const value = parent[search];
        let key = datatype in specialKeys ? specialKeys[datatype] : "id";

        // prettier-ignore
        const fields = info.fieldNodes[0].selectionSet.selections
          .map(selection => (
            selection.name && selection.name.value != "__typename"
              ? selection.name.value
              : null
          ))
          .filter(s => s != null);

        logger.debug(`running resolver for ${datatype}`);

        if (datatype[0] == "[") {
          // return array of objects
          const modelName = datatype.substring(1, datatype.length - 1);
          key = modelName in specialKeys ? specialKeys[modelName] : "id";
          return Promise.all(
            (await models[modelName].findAll({
              where: { [key]: { [models.Op.in]: value } },
              raw: true
            })).map(v => postprocess(datatype, v, fields, models))
          );
        } else {
          if (fields == ["id"]) {
            if (parent[search] === null) {
              return null;
            } else {
              return { [key]: value };
            }
          }
          return postprocess(
            datatype,
            await models[datatype].findOne({
              where: { [key]: value },
              raw: true
            }),
            fields,
            models
          );
        }
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { error: "A resolver didn't function properly", data }
        });
      }
    };
  });

  return searches;
};
