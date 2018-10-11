/**
 * This is the payment provider we use. The component contains methods to create
 * plans and products. To create a Plan, we must first create a product with which it
 * will be associated.
 */

import stripePackage from "stripe";
import moment from "moment";

const stripe = stripePackage(process.env.STRIPE_SECRET_KEY);

export const createProduct = async app => {
  try {
    const res = await stripe.products.create({
      name: app,
      type: "service"
    });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createPlan = async data => {
  try {
    const res = await stripe.plans.create(data);

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

// The plan’s ID, amount, currency, or billing cycle can't be changed
export const updatePlan = async (id, data) => {
  try {
    const res = await stripe.plans.update(id, data);

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

// Deleting plans means new subscribers can’t be added. Existing subscribers aren’t affected.
export const deletePlan = async id => {
  try {
    const res = await stripe.plans.delete(id);

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Creates a customer object in Stride
 * @exports
 * source should be a token passed on from the Frontend through a Stripe Library
 * @param customer: object
 * @param source: object A representation of the credit card data of the customer.
 * @param address: object Contains the users address.
 *
 * @returns {object} res
 */
export const createCustomer = async ({ customer, address, source }) => {
  try {
    const res = await stripe.customers.create({
      description: `${customer.id} ${customer.name}`,
      tax_info: {
        tax_id: customer.vatid,
        type: "vat"
      },
      shipping: {
        name: customer.name,
        address: {
          line1: address.street,
          city: address.city,
          country: address.country,
          postal_code: address.zip
        }
      },
      source
    });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * List the cards from a stripe customer
 * @exports
 * @param id: string
 */
export const listCards = async id => {
  try {
    const res = await stripe.customers.listCards(id);

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Adds a card to a stripe customer
 * @exports
 * The source is a token created from a Stripe library in the Frontend
 * @param id: string
 * @param source: string
 */
export const addCard = async (id, source) => {
  try {
    const res = await stripe.customers.createSource(id, { source });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Creates a subscription for a customer in Stripe
 * @exports
 *
 * Starts with the first of next month
 * @param customer: object
 * @param items: object[] items should contain an array of plans the customer gets
 * subscribed to.
 */
export const createSubscription = async (customer, items) => {
  try {
    const nextMonth = moment()
      .add(1, "months")
      .startOf("month")
      .unix();

    const res = await stripe.subscriptions.create({
      customer,
      items,
      billing_cycle_anchor: nextMonth
    });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Fetches a customer from Stripe
 * @exports
 * @param {number} id
 */
export const fetchCustomer = async id => {
  try {
    const res = await stripe.customers.retrieve(id);

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Lists all invoices from a customer from Stripe
 * @exports
 */
export const listInvoices = async () => {
  try {
    const res = await stripe.invoiceItems.list();

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Changes the default Card
 *
 * @exports
 * @param {string} customer Id of the customer at Stripe
 * @param {string} card ID of the card to make it the customer’s new default.
 * @returns {object} Returns the customer object
 */
export const changeDefaultCard = async (customer, card) => {
  try {
    const res = await stripe.customers.update(customer, {
      default_source: card
    });

    return res;
  } catch (err) {
    throw new Error({ message: err.message });
  }
};
