import { requiresAuth } from "../../helpers/permissions";
import { createProduct, createPlan } from "../../services/stripe";

export default {
  createPlan: requiresAuth.createResolver(async (parent, { name, productid, amount }) => {
    let product;
    if (name && !productid) {
      try {
        const newProduct = await createProduct(name);
        product = newProduct.id;
        console.log(newProduct);
      } catch ({ message }) {
        throw new Error(message);
      }
    } else product = productid;

    try {
      const plan = await createPlan(product, amount);
      console.log(plan);
      return {
        ok: true
      };
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
