"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var types = exports.types = "\n# The basic Response\n  type Response {\n    ok: Boolean!\n    message: String\n    error: String\n  }\n\n# If the registration was successful, a boolean will be given back\n  type RegisterResponse {\n    ok: Boolean!\n    error: String\n    email: String\n  }\n\n# The user receives tokens upon a successful login\n  type LoginResponse {\n    ok: Boolean!\n    token: String\n    refreshToken: String\n    user: User!\n    error: String\n  }\n\n# This three sexes are possible\n  enum SEX {\n    m,\n    w,\n    t\n  }\n\n# An user must have one of these stati\n  enum USER_STATUS {\n    toverify,\n    normal,\n    banned,\n    onlynews\n  }\n\n# Custom Scalar Date\n  scalar Date\n\n";