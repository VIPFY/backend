import moment from "moment";
import DataLoader from "dataloader";
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
    //console.log("VALUE Time", value.getTime());
    //return value.getTime(); // value sent to the client
    return new Date(value).getTime();
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
  Email: "email"
};

const postprocessors = {
  Department: async (value, fields, models) => {
    //logger.debug("postprocessing department", { value, fields, models });
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
    //logger.debug("postprocessing Email", { value, fields });
    if (fields.includes("verifyuntil") && !value.verified) {
      const verifyuntil = moment(value.createdat).subtract(
        EMAIL_VERIFICATION_TIME
      );
      value.verifyuntil = new Date(verifyuntil.format());
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

const getDataLoader = (datatype, key, ctx) => {
  if (!("dataloaders" in ctx)) {
    ctx.dataloaders = {};
  }
  if (!ctx.dataloaders[datatype]) {
    ctx.dataloaders[datatype] = new DataLoader(async keys => {
      const data = await ctx.models[datatype].findAll({
        where: { [key]: { [ctx.models.Op.in]: keys } },
        raw: true
      });
      return keys.map(id => data.find(r => r[key] == id) || null);
    });
  }
  return ctx.dataloaders[datatype];
};

export const find = data => {
  const searches = {};
  Object.keys(data).map(search => {
    searches[search] = async (parent, args, ctx, info) => {
      const { models } = ctx;
      try {
        let datatype = data[search];
        const value = parent[search];

        const fields = info.fieldNodes[0].selectionSet.selections
          .filter(
            selection =>
              selection.name &&
              selection.name.value &&
              selection.name.value != "__typename"
          )
          .map(selection => selection.name.value);

        if (datatype[0] == "[") {
          // return array of objects
          datatype = datatype.substring(1, datatype.length - 1);
          const key = datatype in specialKeys ? specialKeys[datatype] : "id";

          let result;

          // load data if it's not trivial
          if (fields == [key]) {
            result = value.map(v => (v === null ? null : { [key]: v }));
          } else {
            const dataloader = getDataLoader(datatype, key, ctx);
            result = await dataloader.loadMany(value);
          }

          // postprocess if nessesary
          if (datatype in postprocessors) {
            return await Promise.all(
              result.map(v => postprocess(datatype, v, fields, models))
            );
          } else {
            return result;
          }
        } else {
          const key = datatype in specialKeys ? specialKeys[datatype] : "id";

          let result;

          if (fields == [key]) {
            result = value === null ? null : { [key]: value };
          } else {
            const dataloader = getDataLoader(datatype, key, ctx);
            result = await dataloader.load(value);
          }

          // postprocess if nessesary
          if (datatype in postprocessors) {
            return await postprocess(datatype, result, fields, models);
          } else {
            return result;
          }
        }
      } catch (err) {
        console.error(err);
        throw new NormalError({
          message: err.message,
          internalData: { error: "A resolver didn't function properly", data }
        });
      }
    };
  });

  return searches;
};
