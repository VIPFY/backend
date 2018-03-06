/*
This is the payment provider we use. The component contains methods to create
plans and products. To create a Plan, we must first create a product with which it
will be associated.
*/

import stripePackage from "stripe";
import { STRIPE_SECRET_KEY } from "../login-data";

const stripe = stripePackage(STRIPE_SECRET_KEY);

export const createPlan = async (product, amount) => {
  try {
    const res = await stripe.plans.create({
      currency: "USD",
      interval: "month",
      product,
      amount
    });

    return res;
  } catch ({ message }) {
    throw new Error(message);
  }
};

export const createProduct = async name => {
  try {
    const res = await stripe.products.create({
      name,
      type: "service"
    });

    return res;
  } catch ({ message }) {
    throw new Error(message);
  }
};
