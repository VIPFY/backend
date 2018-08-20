import { createError } from "apollo-errors";

export const NormalError = createError("NormalError", {
  message: "Sorry, something went wrong!"
});

export const AuthError = createError("AuthError", {
  message: "You're not authenticated!"
});

export const AdminError = createError("AdminError", {
  message: "You're not a Vipfy Admin!"
});
