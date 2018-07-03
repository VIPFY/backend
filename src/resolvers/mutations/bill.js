import { decode } from "jsonwebtoken";
import { requiresRight, requiresAuth } from "../../helpers/permissions";
import createInvoice from "../../helpers/createInvoice";
import { createDownloadLink } from "../../services/gcloud";
import { checkDepartment } from "../../helpers/functions";

/* eslint-disable array-callback-return, no-return-await */

export default {
  createPlan: requiresRight(["admin"]).createResolver(async (parent, { plan }, { models }) => {
    try {
      await models.Plan.create({ ...plan });

      return { ok: true };
    } catch (err) {
      throw new Error(err);
    }
  }),

  updatePlan: requiresRight(["admin"]).createResolver(async (parent, { plan, id }, { models }) => {
    try {
      await models.Plan.update({ ...plan }, { where: { id } });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  buyPlan: requiresRight(["admin", "buyApps"]).createResolver(
    async (parent, { planIds }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const billItems = [];
          let boughtPlans = [];
          const {
            user: { unitid, company }
          } = decode(token);

          const plans = await models.Plan.findAll({
            where: { id: planIds },
            attributes: ["price", "id", "appid", "name", "numlicences"],
            raw: true
          });

          plans.forEach(({ price, name, numlicences }) => {
            billItems.push({
              description: name,
              quantity: numlicences,
              unitPrice: price
            });
          });

          const mainPlan = plans.shift();

          const createMainBoughtPlan = await models.BoughtPlan.create(
            {
              buyer: unitid,
              payer: company,
              planid: mainPlan.id,
              disabled: false,
              amount: mainPlan.numlicences,
              totalprice: mainPlan.price
            },
            {
              transaction: ta
            }
          );
          const mainBoughtPlan = createMainBoughtPlan.get();

          if (plans.length > 0) {
            const createSubBoughtPlans = plans.map(
              async plan =>
                await models.BoughtPlan.create(
                  {
                    buyer: unitid,
                    payer: company,
                    planid: plan.id,
                    disabled: false,
                    amount: plan.numlicences,
                    totalprice: plan.price,
                    mainboughtplan: mainBoughtPlan.id
                  },
                  { transaction: ta }
                )
            );

            const boughtPlansData = await Promise.all(createSubBoughtPlans);
            boughtPlans = boughtPlansData.map(bP => bP.get());
          }

          boughtPlans.splice(0, 0, mainBoughtPlan);

          const bill = await models.Bill.create({ unitid: company }, { transaction: ta });
          const createLicences = [];

          await boughtPlans.forEach(plan => {
            for (let i = 0; i < plan.amount; i++) {
              createLicences.push(
                models.Licence.create(
                  {
                    unitid: null,
                    boughtplanid: plan.id,
                    agreed: false,
                    disabled: false
                  },
                  { transaction: ta }
                )
              );
            }
          });

          await Promise.all(createLicences);

          const res = await createInvoice(false, models, company, bill.id, billItems);
          if (res.ok !== true) {
            throw new Error(res.err);
          }

          await models.Bill.update(
            { billname: res.billName },
            { where: { id: bill.id }, transaction: ta }
          );

          const createBillPositions = boughtPlans.map(
            async plan =>
              await models.BillPosition.create(
                {
                  billid: bill.id,
                  positiontext: `Plan ${plan.planid}, Licences ${plan.amount}`,
                  price: plan.totalprice,
                  planid: plan.planid,
                  currency: "USD"
                },
                { transaction: ta }
              )
          );

          await Promise.all(createBillPositions);

          return { ok: true };
        } catch (err) {
          throw new Error(err.message);
        }
      })
  ),

  endPlan: requiresRight("A").createResolver(async (parent, { id, enddate }, { models }) => {
    try {
      await models.Plan.update({ enddate }, { where: { id } });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  createMonthlyBill: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company: unitid }
      } = decode(token);
      const bill = await models.Bill.create({ unitid });
      const billid = bill.get("id");
      const billItems = await models.BillPosition.findAll({ where: { billid } });
      // const billItems = [
      //   {
      //     description: "Some interesting test",
      //     quantity: 5,
      //     unitPrice: 19.99
      //   },
      //   {
      //     description: "Another interesting test",
      //     quantity: 10,
      //     unitPrice: 5.99
      //   },
      //   {
      //     description: "The most interesting one",
      //     quantity: 3,
      //     unitPrice: 9.99
      //   }
      // ];

      const ok = await createInvoice(true, models, unitid, billid, billItems);
      if (ok !== true) {
        throw new Error(ok);
      }

      return { ok };
    } catch (err) {
      throw new Error(err);
    }
  }),

  addBillPos: requiresAuth.createResolver(async (parent, { bill, billid }, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);
      await models.BillPosition.create({ ...bill, billid, unitid: company });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  downloadBill: requiresAuth.createResolver(async (parent, { billid }, { models, token }) => {
    try {
      const {
        user: { company: unitid }
      } = await decode(token);
      const bill = await models.Bill.findOne({
        where: { unitid, id: billid },
        attributes: ["billname", "billtime"]
      });

      if (!bill) {
        throw new Error("Couldn't find invoice!");
      }
      const name = bill.get("billname");
      const time = bill.get("billtime");

      const downloadLink = await createDownloadLink(name, time);

      return downloadLink;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  distributeLicenceToDepartment: async (
    parent,
    { departmentid, boughtplanid, licencetype },
    { models, token }
  ) =>
    await models.sequelize.transaction(async ta => {
      try {
        // const {
        //   user: { company }
        // } = decode(token);
        const company = 14;
        const unitid = 7;

        // const ok = await checkDepartment(models, company, departmentid);
        //
        // if (!ok) {
        //   throw new Error("This department doesn't belong to the users company!");
        // }
        //
        // const departmentBoughtPlan = await models.BoughtPlan.findOne({
        //   where: {
        //     payer: departmentid,
        //     id: boughtplanid
        //   },
        //   raw: true
        // });
        //
        // if (!departmentBoughtPlan) {
        //   throw new Error("This department didn't buy the plan!");
        // }

        // const boughtPlans = await models.sequelize.query(
        //   "SELECT boughtplan_data.*, d2.appid FROM boughtplan_data INNER JOIN " +
        //     "plan_data d2 on boughtplan_data.planid = d2.id AND d2.appid = ? " +
        //     "AND boughtplan_data.payer = ?",
        //   {
        //     // replacements: [appid, departmentid],
        //     replacements: [appid, company],
        //     type: models.sequelize.QueryTypes.SELECT
        //   }
        // );

        const p1 = models.Licence.findAll({
          where: {
            unitid: null,
            endtime: {
              [models.Op.or]: {
                [models.Op.eq]: null,
                [models.Op.gt]: Date.now()
              }
            },
            options: {
              [models.Op.contains]: {
                type: licencetype
              }
            },
            boughtplanid
          },
          raw: true
        });

        const p2 = models.sequelize.query(
          "SELECT DISTINCT employee FROM department_employee_view WHERE id = :company " +
            "and employee NOT IN (SELECT DISTINCT ld.unitid FROM licence_data " +
            "AS ld INNER JOIN department_employee_view dev ON dev.employee = ld.unitid " +
            "AND boughtplanid = :boughtplanid AND (ld.endtime IS NULL OR ld.endtime > NOW()) " +
            "AND ld.options @> :type AND ld.disabled = false AND dev.id = :company)",
          {
            replacements: { boughtplanid, company, type: JSON.stringify({ type: licencetype }) },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        const p3 = models.Right.findOne({
          where: {
            holder: unitid,
            forunit: departmentid,
            type: { [models.Op.or]: ["admin", "distributeapps"] }
          }
        });

        const p4 = models.BoughtPlan.findOne({
          where: { id: boughtplanid },
          raw: true,
          attributes: ["disabled", "endtime"]
        });

        const [openLicences, haveNoLicence, hasRight, validPlan] = await Promise.all([
          p1,
          p2,
          p3,
          p4
        ]);
        const employees = haveNoLicence.map(licence => licence.employee);

        console.log("Plan: ", validPlan);
        console.log("Have no Licence", employees);
        console.log("Open Licences: ", openLicences);
        // Nicht berechtigt Lizenzen zu distributen
        // Nicht genug Lizenzen, keine Berechtigung
        // Nicht genug Lizenen aber Berechtigung für diese Departments

        if (openLicences.length == 0) {
          return {
            error: { code: 1, message: "There are no licences to distribute for this plan." }
          };
        } else if (!hasRight && openLicences.length < employees.length) {
          return {
            error: {
              code: 2,
              message: `There are ${employees.length -
                openLicences.length} Licences missing for this department and you don't have the right to distribute them for this department.`
            }
          };
        } else if (hasRight && openLicences.length < employees.length) {
          return {
            error: {
              code: 3,
              message: `There are ${employees.length -
                openLicences.length} Licences missing for this department.`
            }
          };
        } else if (!hasRight) {
          return {
            error: {
              code: 4,
              message: "The user doesn't have the right to distribute licences."
            }
          };
        } else if (!validPlan || (validPlan && validPlan.disabled)) {
          return {
            error: {
              code: 5,
              message: "The plan is disabled."
            }
          };
        } else if (validPlan && validPlan.endtime && validPlan.endtime < Date.now()) {
          return {
            error: {
              code: 6,
              message: "The plan is expired."
            }
          };
        }

        // const takeLicences = employees.map(
        //   async (employee, i) =>
        //     await models.Licence.update(
        //       {
        //         unitid: employee
        //       },
        //       { where: { id: openLicences[i].id, unitid: null }, raw: true, transaction: ta }
        //     )
        // );
        //
        // await Promise.all(takeLicences);

        return { ok: true };
      } catch (err) {
        throw new Error(err);
      }
    })
};
