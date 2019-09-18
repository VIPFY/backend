import moment from "moment";
import DataLoader from "dataloader";
import { NormalError } from "../errors";
import logger from "../loggers";
import { EMAIL_VERIFICATION_TIME } from "../constants";
/* eslint-disable no-undef, array-callback-return */

export const implementDate = {
  name: "Date",
  description: "Date custom scalar type. Returns a large integer",
  parseValue: value => new Date(value), // value from the client
  serialize(value) {
    if (value === Number.POSITIVE_INFINITY) {
      return new Date(8640000000000000).getTime();
    }

    if (value === Number.NEGATIVE_INFINITY) {
      return new Date(-8640000000000000).getTime();
    }

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
    if (fields.includes("verifyuntil") && !value.verified) {
      const verifyuntil = moment(value.createdat).subtract(
        EMAIL_VERIFICATION_TIME
      );
      value.verifyuntil = new Date(verifyuntil.format());
    }
    return value;
  },
  Licence: async (value, fields) => {
    if (value) {
      if (value.options) {
        if (value.options.teamlicence) {
          value.teamlicence = value.options.teamlicence;
        }
        if (value.options.teamaccount) {
          value.teamaccount = value.options.teamaccount;
        }
      }
    }
    return value;
  },
  // Wird das benötigt?
  CompanyService: async (value, fields) => {
    if (value) {
      if (value.options) {
        if (value.options.teamlicence) {
          value.teamlicence = value.options.teamlicence;
        }
        if (value.options.teamaccount) {
          value.teamaccount = value.options.teamaccount;
        }
      }
    }
    return value;
  },
  TeamBoughtPlan: async (value, fields) => {
    if (value) {
      if (value.options) {
        if (value.options.teamlicence) {
          value.teamlicence = value.options.teamlicence;
        }
        if (value.options.teamaccount) {
          value.teamaccount = value.options.teamaccount;
        }
      }
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
      const query = `
        SELECT json_agg(r.*) AS data FROM (
          SELECT * FROM "${ctx.models[datatype].getTableName()}"
            WHERE "${key}" IN (:keys)
        ) r`;
      const { data } = await ctx.models.sequelize.query(query, {
        replacements: { keys },
        type: ctx.models.sequelize.QueryTypes.SELECT,
        plain: true
      });

      if (data) {
        return keys.map(id => data.find(r => r[key] == id));
      }

      return keys.map(() => null);
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
        const loadMultiple = data[search][0] == "[";
        const datatype = loadMultiple
          ? data[search].substring(1, data[search].length - 1)
          : data[search];

        const key = datatype in specialKeys ? specialKeys[datatype] : "id";
        const value = parent[search];
        const requiresPostprocessing = datatype in postprocessors;

        const fields = info.fieldNodes[0].selectionSet.selections
          .filter(
            selection =>
              selection.name &&
              selection.name.value &&
              selection.name.value != "__typename"
          )
          .map(selection => selection.name.value);

        if (loadMultiple) {
          let result;

          if (value == null || value == undefined) {
            return [];
          }

          if (
            typeof value === "object" &&
            value.length === 1 &&
            value[0] === null
          ) {
            return [null];
          }

          // load data if it's not trivial
          if (fields.length == 1 && fields[0] == key) {
            result = value.map(v =>
              v === null || v === undefined ? null : { [key]: v }
            );
          } else if (value == null) {
            result = null;
          } else {
            const dataloader = getDataLoader(datatype, key, ctx);
            result = await dataloader.loadMany(value);
          }

          if (requiresPostprocessing) {
            return await Promise.all(
              result.map(v => postprocess(datatype, v, fields, models))
            );
          } else {
            return result;
          }
        } else {
          let result;

          // load data if it's not trivial
          if (fields.length == 1 && fields[0] == key) {
            result =
              value === null || value === undefined ? null : { [key]: value };
          } else if (value == null) {
            result = null;
          } else {
            const dataloader = getDataLoader(datatype, key, ctx);
            result = await dataloader.load(value);
          }

          if (requiresPostprocessing) {
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
