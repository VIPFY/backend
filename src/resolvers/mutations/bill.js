import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { createProduct, createPlan } from "../../services/stripe";

export default {
  createStripePlan: requiresAuth.createResolver(async (parent, { name, productid, amount }) => {
    let product;
    if (name && !productid) {
      try {
        const newProduct = await createProduct(name);
        product = newProduct.id;
        console.log({ newProduct });
      } catch ({ message }) {
        throw new Error(message);
      }
    } else product = productid;

    try {
      const plan = await createPlan(product, amount);
      console.log({ plan });
      return {
        ok: true
      };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  buyPlan: requiresAuth.createResolver(async (parent, { planid, buyFor }, { models, token }) => {
    const { user: { unitid } } = decode(token);
    const buyfor = buyFor || unitid;

    const userExists = await models.Unit.findById(buyfor);
    if (userExists) {
      return models.sequelize.transaction(async ta => {
        try {
          await models.BoughtPlan.create(
            {
              buyer: unitid,
              buyfor,
              planid
            },
            { transaction: ta }
          );
          //
          // await models.Licence.create(
          //   {
          //     boughtplanid: boughtPlan.id,
          //     unitid: buyfor
          //   },
          //   { transaction: ta }
          // );

          return { ok: true };
        } catch ({ message }) {
          throw new Error(message);
        }
      });
    }
    throw new Error("User doesn't exist!");
  })
};
