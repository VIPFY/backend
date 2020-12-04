import models from "@vipfy-private/sequelize-setup";
import { VIPFYPlanError, VIPFYPlanLimit } from "../errors";

export const checkVipfyPlanUsers = async ({
  company,
  transaction,
  userid,
  noCheck,
}) => {
  const vipfyPlan = await models.sequelize.query(
    `SELECT * from vipfy_plans where payer = :company AND (endtime is null or endtime > now()) AND starttime <= now();`,
    {
      replacements: { company },
      transaction,
      type: models.sequelize.QueryTypes.SELECT,
    }
  );

  if (!vipfyPlan || vipfyPlan.length == 0) {
    throw new VIPFYPlanError();
  }

  if (!noCheck) {
    if (
      vipfyPlan[0].options.maxUsers != undefined &&
      vipfyPlan.length >= vipfyPlan[0].options.maxUsers
    ) {
      throw new VIPFYPlanLimit({
        data: {
          limiter: "Users",
          maxUsers: vipfyPlan[0].options.maxUsers,
        },
      });
    }

    const calcAmount = (accumulator, currentValue) =>
      accumulator + (currentValue.edit ? 1 : 0);

    if (
      vipfyPlan[0].options.maxAdmins != undefined &&
      vipfyPlan.reduce(calcAmount, 0) >= vipfyPlan[0].options.maxAdmins
    ) {
      throw new VIPFYPlanLimit({
        data: {
          limiter: "Admins",
          amount: vipfyPlan[0].options.maxAdmins,
        },
      });
    }
  }

  let assignmentid;
  if (userid) {
    const filtered = vipfyPlan.find(v => userid == v.userid);
    if (filtered) {
      assignmentid = filtered.id;
    }
  }

  return {
    vipfyaccount: vipfyPlan[0].vipfyaccountid,
    assignmentid,
    members: vipfyPlan.map(v => {
      return { userid: v.userid, admin: v.edit ? true : undefined };
    }),
  };
};

export const checkVipfyPlanAssignments = async ({
  assignmentid,
  userid,
  transaction,
  noCheck,
}) => {
  let userId = userid;
  if (!userid) {
    if (!assignmentid) {
      throw Error("No Assignmentid given");
    }
    {
      const licence = await models.sequelize.query(
        `SELECT * from licence_view where assignmentid = :assignmentid AND (endtime is null or endtime > now()) AND starttime <= now();`,
        {
          replacements: { assignmentid },
          transaction,
          type: models.sequelize.QueryTypes.SELECT,
        }
      );
      if (!licence || !licence[0]) {
        throw Error("No valid Assignment with the given Id");
      }
      userId = licence[0].unitid;
    }
  }
  const vipfyPlan = await models.sequelize.query(
    `SELECT * from vipfy_plans where userid = :userId AND (endtime is null or endtime > now()) AND starttime <= now();`,
    {
      replacements: { userId },
      transaction,
      type: models.sequelize.QueryTypes.SELECT,
    }
  );

  if (!vipfyPlan || vipfyPlan.length == 0) {
    throw new VIPFYPlanError();
  }

  const userLicences = await models.sequelize.query(
    `SELECT * from licence_view where unitid = :userId AND (endtime is null or endtime > now()) AND starttime <= now();`,
    {
      replacements: { userId },
      transaction,
      type: models.sequelize.QueryTypes.SELECT,
    }
  );

  if (!noCheck) {
    // VIPFY Assignment is also counted so maxOwnAssignments + 1
    if (
      vipfyPlan[0].options.maxOwnAssignments != undefined &&
      userLicences.length > vipfyPlan[0].options.maxOwnAssignments
    ) {
      throw new VIPFYPlanLimit({
        data: {
          limiter: "OwnAssignments",
          amount: vipfyPlan[0].options.maxOwnAssignments,
        },
      });
    }
  }

  return {
    userid: userId,
    assignments: userLicences.map(uL => uL.assignmentid),
  };
};

export const checkVipfyPlanTeams = async ({
  teamid,
  company,
  transaction,
  noCheck,
}) => {
  let companyId = company;

  if (!company && !teamid) {
    throw Error("No enough data provided");
  }
  if (!company) {
    const companyReturn = await models.sequelize.query(
      `SELECT * FROM team_view
          JOIN parentunit_data p ON (p.parentunit = team_view.unitid)
        WHERE childunit = :teamid and team_view.iscompany = true`,
      {
        replacements: { teamid },
        type: models.sequelize.QueryTypes.SELECT,
      }
    );

    companyId = companyReturn[0].id;
  }

  const vipfyPlan = await models.sequelize.query(
    `SELECT * from vipfy_plans where payer = :companyId AND (endtime is null or endtime > now()) AND starttime <= now();`,
    {
      replacements: { companyId },
      transaction,
      type: models.sequelize.QueryTypes.SELECT,
    }
  );

  if (!vipfyPlan || vipfyPlan.length == 0) {
    throw new VIPFYPlanError();
  }

  const teams = await models.sequelize.query(
    `SELECT * FROM team_view
      JOIN parentunit_data p ON (p.childunit = team_view.unitid)
    WHERE parentunit = :companyId`,
    {
      replacements: { companyId },
      type: models.sequelize.QueryTypes.SELECT,
    }
  );

  if (!noCheck) {
    if (
      vipfyPlan[0].options.maxTeams != undefined &&
      teams.length >= vipfyPlan[0].options.maxTeams
    ) {
      throw new VIPFYPlanLimit({
        data: {
          limiter: "OwnAssignments",
          amount: vipfyPlan[0].options.maxTeams,
        },
      });
    }
  }

  return teams.map(t => t.id);
};
