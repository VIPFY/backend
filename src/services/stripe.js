/**
 * This is the payment provider we use. The component contains methods to create
 * plans and products. To create a Plan, we must first create a product with which it
 * will be associated.
 */

import stripePackage from "stripe";
import { STRIPE_SECRET_KEY } from "../login-data";

const stripe = stripePackage(STRIPE_SECRET_KEY);

export const createProduct = async app => {
  try {
    const res = await stripe.products.create({
      name: `Product for ${app}`,
      type: "service"
    });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createPlan = async data => {
  try {
    const res = await stripe.plans.create({ ...data });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Creates a customer object in Stride
 * source should be a token passed on from the Frontend through a Stripe Library
 * @param customer: object
 * @param source: object
 */
export const createCustomer = async (customer, source) => {
  try {
    const res = await stripe.customers.create({
      description: `${customer.id} ${customer.lastname}`,
      source
    });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Creates a subscription for a customer in Stride
 * items should contain an array of plans the customer gets subscribed to
 * @param customer: object
 * @param items: object[]
 */
export const createSubscription = async (customer, items) => {
  try {
    const res = await stripe.subscriptions.create({
      customer,
      items
    });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};
