import test from "../services/weebly";

const queryString = JSON.stringify({
  email: "test@vipfy.com",
  language: "en",
  test_mode: "true"
});
console.log(queryString);
test("GET", "/account", "");
