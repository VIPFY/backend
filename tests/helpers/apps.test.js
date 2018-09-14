import {
  calculatePlanPrice,
  checkPlanInputsSchema
} from "../../src/helpers/apps";

test("test the test framework", () => {
  expect(true).toBeTruthy();
});

describe("calcualtePlanPrice Tests", () => {
  test("test trivial inputs", () => {
    expect(calculatePlanPrice(0, [], {})).toBe(0);
    expect(calculatePlanPrice(1.34, [], {})).toBe(1.34);
  });

  test("test empty inputs", () => {
    expect(() => calculatePlanPrice(undefined, [], {})).toThrow();
    expect(() => calculatePlanPrice(0, undefined, {})).toThrow();
    expect(() => calculatePlanPrice(0, [], undefined)).toThrow();

    expect(() => calculatePlanPrice()).toThrow();
  });

  test("sendgrid example nothing added", () => {
    const price = calculatePlanPrice(
      40,
      [
        {
          section: "important",
          features: [
            {
              key: "limit",
              value: "20,000/month",
              number: 5000,
              precaption: "Email Limit:"
            },
            {
              key: "ips",
              type: "number",
              price: 50,
              value: "each $50/mo extra",
              number: 0,
              addable: true,
              priceper: "month",
              amountper: 1,
              precaption: "Dedicated IP-Adresses:",
              includedvalue: "None included"
            },
            {
              key: "contacts",
              type: "number",
              price: 10,
              value: "$10/mo per extra 5000",
              number: 1000,
              addable: true,
              priceper: "month",
              amountper: 5000,
              precaption: "Contacts for marketing:",
              includedvalue: "1000 included"
            },
            {
              key: "users",
              type: "number",
              price: 3,
              value: "$3/mo per extra User",
              number: 2,
              addable: true,
              priceper: "month",
              amountper: 1,
              precaption: "Users:",
              includedvalue: "Two included"
            }
          ]
        }
      ],
      {}
    );
    expect(price).toBe(40);
  });

  test("sendgrid example stuff added", () => {
    const price = calculatePlanPrice(
      40,
      [
        {
          section: "important",
          features: [
            {
              key: "limit",
              value: "20,000/month",
              number: 5000,
              precaption: "Email Limit:"
            },
            {
              key: "ips",
              type: "number",
              price: 50,
              value: "each $50/mo extra",
              number: 0,
              addable: true,
              priceper: "month",
              amountper: 1,
              precaption: "Dedicated IP-Adresses:",
              includedvalue: "None included"
            },
            {
              key: "contacts",
              type: "number",
              price: 10,
              value: "$10/mo per extra 5000",
              number: 1000,
              addable: true,
              priceper: "month",
              amountper: 5000,
              precaption: "Contacts for marketing:",
              includedvalue: "1000 included"
            },
            {
              key: "users",
              type: "number",
              price: 3,
              value: "$3/mo per extra User",
              number: 2,
              addable: true,
              priceper: "month",
              amountper: 1,
              precaption: "Users:",
              includedvalue: "Two included"
            }
          ]
        }
      ],
      {
        ips: { value: 2, amount: 2 },
        limit: { value: 5000, amount: 0 },
        contacts: { value: 6000, amount: 1 },
        users: { value: 3, amount: 1 }
      }
    );
    expect(price).toBe(153);
  });
});

describe("calcualtePlanPrice Tests", () => {
  test("test trivial inputs", () => {
    expect(checkPlanInputsSchema({}, {})).toBeTruthy();
  });
});
