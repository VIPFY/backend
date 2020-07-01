import { requiresSecondaryAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  testing_fetchAppsWithoutCredentials: requiresSecondaryAuth([]).createResolver(
    async (_parent, _args, { models }) => {
      try {
        return await models.sequelize.query(
          `
              SELECT app_data.*
                  FROM app_data
                  JOIN plan_data ON (plan_data.appid = app_data.id)
                  WHERE app_data.id NOT IN (
                      SELECT app_data.id
                          FROM app_data
                          JOIN plan_data ON (plan_data.appid = app_data.id)
                          JOIN boughtplanperiod_data ON (boughtplanperiod_data.planid = plan_data.id)
                          JOIN boughtplan_data ON (boughtplanperiod_data.boughtplanid = boughtplan_data.id)
                          JOIN licence_data ON (boughtplan_data.id = licence_data.boughtplanid)
                          WHERE boughtplan_data.usedby = 'b6c1adae-ec97-4b22-9196-0ac0be804897'
                            AND (licence_data.endtime > now() OR licence_data.endtime is null)
                  )
                  AND plan_data.options->>'external' = 'true'
          `,
          {
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),
  testing_fetchSSOTestConfig: requiresSecondaryAuth([
    "ssoTesting",
  ]).createResolver(async (_parent, _args, { models }) => {
    try {
      return await models.sequelize.query(
        `
        SELECT
            app_data.name as app,
            COALESCE(licence_data.options->>'loginurl', boughtplan_data.key->>'domain', app_data.loginurl) as url,
            licence_data.key->>'username' as email,
            licence_data.key->>'password' as password,
            boughtplan_data.key || app_data.options || licence_data.options as "options"
        FROM app_data
            JOIN plan_data ON (plan_data.appid = app_data.id)
            JOIN boughtplanperiod_data ON (boughtplanperiod_data.planid = plan_data.id)
            JOIN boughtplan_data ON (boughtplanperiod_data.boughtplanid = boughtplan_data.id)
            JOIN licence_data ON (boughtplan_data.id = licence_data.boughtplanid)
        WHERE boughtplan_data.usedby = 'b6c1adae-ec97-4b22-9196-0ac0be804897'
          AND (licence_data.endtime > now() OR licence_data.endtime is null)
        ORDER BY app_data.name
          `,
        {
          type: models.sequelize.QueryTypes.SELECT,
        }
      );
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),
};
