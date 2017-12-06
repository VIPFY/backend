import test from "../services/weebly";
import Utility from "./createHmac";
import { WEEBLY_KEY, WEEBLY_SECRET } from "../login-data";

const queryString = JSON.stringify({
  email: "test@vipfy.com",
  language: "en",
  test_mode: "true"
});

test("GET", "account", "");
