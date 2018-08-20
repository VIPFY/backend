import { createError } from "apollo-errors";

export const NormalError = createError("NormalError", {
  message: "Sorry, something went wrong!",
  data: { code: 0, id: 1 },
  internalData: { error: "Just a normal error." }
});

export const PartnerError = createError("PartnerError", {
  message: "There was a problem with the partners API",
  data: { code: 1, id: 2 },
  internalData: { error: "Problem with partners API." }
});

export const BillingError = createError("BillingError", {
  message: "There was a problem while purchasing. Please retry.",
  data: { code: 3, id: 3 },
  internalData: { error: "Customer couldn't buy product." }
});

export const AuthError = createError("AuthError", {
  message: "You're not authenticated!",
  internalData: { error: "An auth error." }
});

export const AdminError = createError("AdminError", {
  message: "You're not a Vipfy Admin!",
  internalData: { error: "Someone tried to login as an Admin." }
});
