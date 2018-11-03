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
      description: customer.name,
      email: customer.email,
      metadata: {
        ip: customer.ip
      },
      tax_info: {
        tax_id: customer.vatId,
        type: "vat"
      },
      shipping: {
        name: customer.name,
        address: {
          line1: address.address_line1,
          city: address.address_city,
          country: address.address_country,
          postal_code: address.address_zip
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
 * @param {string} id
 * @param {string} source Token created from a Stripe library in the Frontend
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
 *  Fetches a subscription.
 *
 * @param {string} id Id of the subscription at Stripe
 *
 * @returns {object}
 */
const fetchSubscription = async id => {
  try {
    const res = await stripe.subscriptions.retrieve(id);

    return res;
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Creates a subscription for a customer in Stripe
 * @exports
 *
 * Starts with the first of next month
 * @param customer: string
 * @param items: object[] items should contain an array of plans the customer gets
 * subscribed to.
 */
export const createSubscription = async (customer, items) => {
  try {
    const nextMonth = moment()
      .add(1, "months")
      .startOf("month")
      .unix();

    // const inTenMinutes = moment()
    //   .add(10, "minutes")
    //   .unix();
    const res = await stripe.subscriptions.create({
      customer,
      items,
      billing_cycle_anchor: nextMonth
      // trial_end: inTenMinutes
      // tax_percent: tax
    });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};
/**
 * Cancels a running subscription at the end of it's lifecycle. Case is if the
 * customer doesn't want to use the product anymore
 *
 * @exports
 * @param {string} id The id of the subscription
 *
 *  @returns {object}
 */
export const cancelSubscription = async id => {
  try {
    const res = await stripe.subscriptions.update(id, {
      cancel_at_period_end: true
    });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Directly aborts the subscription and refunds the customer
 * @exports
 * @param {string} subscriptionId The id of the subscription
 * @param {string} invoiceId The id of the invoice to refund
 *
 *  @returns {object}
 */
export const abortSubscription = async subscriptionId => {
  try {
    const abort = await stripe.subscriptions.del(subscriptionId);

    return { abort };
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Switches the customer to another plan at Stripe
 *
 * @exports
 * @param {string} id The id of the subscription at Stripe
 * @param {string} plan The id of the plan which should be
 * switched to at Stripe
 *
 * @returns {object}
 */
export const updateSubscription = async (id, items) => {
  try {
    const res = await stripe.subscriptions.update(id, {
      cancel_at_period_end: false,
      items
    });

    return res;
  } catch (error) {
    throw new Error(err.message);
  }
};

/**
 * Adds an item to the customers subscription
 *
 * @exports
 * @param {string} subscription The id of the Subscription at Stripe
 * @param {string} plan The Stripe Plan
 *
 * @returns {object}
 */
export const addSubscriptionItem = async (subscription, plan) => {
  try {
    const res = await stripe.subscriptionItems.create({
      subscription,
      plan
    });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Removes an item from the customers subscription
 *
 * @exports
 * @param {string} item The subscription item
 * @param {string} subscriptionId
 *
 * @returns {object}
 */
export const removeSubscriptionItem = async (item, subscriptionId) => {
  try {
    const lastItem = await fetchSubscription(subscriptionId);
    let res;

    if (lastItem.items.data.length < 2) {
      res = await cancelSubscription(subscriptionId);
    } else {
      res = await stripe.subscriptionItems.del(item);
    }
    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const cancelPurchase = async (item, subscriptionId) => {
  try {
    const lastItem = await fetchSubscription(subscriptionId);
    let res;

    if (lastItem.items.data.length < 2) {
      res = await abortSubscription(subscriptionId);
    } else {
      res = await stripe.subscriptionItems.del(item);
    }
    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Updates a subscription at Stripe
 *
 * @exports
 * @param {string} item The subscription item
 * @param {string} plan The id of the plan at Stripe
 *
 * @exports {object}
 */
export const updateSubscriptionItem = async (item, plan) => {
  try {
    const res = await stripe.subscriptionItems.update(item, { plan });

    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * Reactivates a Subscription at Stripe
 *
 * @exports
 * @param {string} id The id of the Plan
 *
 * @returns {object}
 */
export const reactivateSubscription = async id => {
  try {
    const res = await stripe.subscriptions.update(id, {
      cancel_at_period_end: false
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
