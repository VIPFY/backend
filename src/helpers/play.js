import axios from "axios";
import crypto from "crypto";
// import weeblyApi from "../services/weebly";
//
// async function testWeebly() {
//   const email = "dummy@vipfy.com";
//   const userId = "117405276";
//   const domain = "test1.vipfy.com";
//   const siteId = "711807005615386732";
//   const planId = 2;
//
//   const requestData = {
//     language: "en",
//     test_mode: true,
//     email
//   };
//   const method = "POST";
//   const endpoint = "user";
//
//   try {
//     const result = await weeblyApi(requestData, method, endpoint);
//     console.log(result);
//   } catch (err) {
//     console.log(err);
//   }
// }
//
// testWeebly();
// ============================================================================
// import {getVipfyAccountData, createAccount} from "../services/sendinblue"
//
// createAccount("pc@vipfy.com", "Pascal", "Cousland", "Vipfy")
// ============================================================================
// import {
//   fetchOrganization,
//   fetchOrganizations,
//   addOrganization,
//   deleteOrganization,
//   createSubscription,
//   getToken
// } from "../services/pipedrive";
//
// const testCompany = {
//   name: "Another Vipfy Customer Company",
//   visible_to: 1,
// }
//
// getToken("development@vipfy.com", "0892309jJSfjspjf?9f9rewj9fgjwa");
// ============================================================================
// import { SHOPIFY_KEY, SHOPIFY_SECRET } from "../login-data";
//
// const config = {
//   method: "get",
//   url: `https://${SHOPIFY_KEY}:${
//     SHOPIFY_SECRET
//   }@vipfy-test.myshopify.com/admin/products.json`
//   // data: {
//   //   product: {
//   //     title: "App6",
//   //     vendor: "User1",
//   //     product_type: "App"
//   //   }
//   // }
// };
//
// axios(config)
//   .then(res => console.log(res.data.products))
//   .catch(err => console.log(err.response.data));
// ============================================================================
// import {createProduct, createCustomer} from "../services/stripe"
//
// const doStuff = async (name) => {
//   try {
//     const res = await createCustomer({id: 2, lastname: "Jannis Froetest"})
//
//       console.log(res)
//   } catch (err) {
//     console.log(err)
//   }
// }
//    console.log(key);

// doStuff("Pipedrive")
// ============================================================================
// import { attachmentLink } from "../services/gcloud";

// const doStuff = async () => {
//   try {
//     const res = await attachmentLink(
//       "9a6f8a58dd106aec4e05bbca7386fdbcb477855faaa68520ee3e4b60e7f4c711-2664ada43da62875f3ca61a8f53aa02792bfa55cd4c0bec8bbee8809e1d2b802c20f14625d7641de4ded4e4b715d9a06449557dafc26c1d55731fbcb83ba7c91"
//     );
//     console.log(res);
//   } catch (err) {
//     console.log(err);
//   }
// };

// doStuff();
// =============================================================================
// import { Builder, By, Key, until } from "selenium-webdriver";
// import chrome from "selenium-webdriver/chrome";

// let driver = new webdriver.Builder()
//     .forBrowser('chrome')
//     .setChromeOptions(/* ... */)
//     .build();

// (async () => {
//   const driver = await new Builder().forBrowser("chrome").build();
//   try {
//     await driver.get("https://my.freshbooks.com/#/signup");
//     await driver
//       .findElement(By.id("ember563"))
//       .sendKeys("Hallo Lisa, ich beobachte dich");

//     await driver.findElement(By.id("ember566")).sendKeys("password");
//     await driver.wait(until.titleIs("webdriver - Google Search"), 10000);
//   } finally {
//     await driver.quit();
//   }
// })();

(async () => {
  try {
    const password = crypto.randomBytes(15).toString("hex");
    const email = "info@vipfy.store";
    console.log({ email, password });

    const res = await axios({
      method: "POST",
      url: "https://my.freshbooks.com/service/auth/api/v1/smux/registrations",
      headers: {
        Host: "my.freshbooks.com",
        "User-Agent":
          "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:62.0) Gecko/20100101 Firefox/62.0",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://my.freshbooks.com/",
        "Content-Type": "application/json; charset=utf-8",
        Authorization: "Bearer undefined",
        "X-Requested-With": "XMLHttpRequest"
      },
      data: {
        id: "info@vipfy.com",
        company_name: null,
        email,
        password,
        country: "United States",
        currencyCode: "USD",
        access_token: null,
        direct_buy: false,
        skip_system: false,
        skip_business: false,
        send_confirmation_notification: true,
        capacity: null,
        provisioner: "magnum",
        referring_url: null,
        landing_url: "https://www.vipfy.store/",
        referralid: null,
        web_promo: null,
        visitor_id: null,
        optimizely_user_id: null,
        optimizely_buckets: null
      }
    });

    console.log(res.data.response);
    if (
      !res.data.response ||
      !res.data.response.access_token ||
      res.data.response.access_token == null
    ) {
      throw new Error("Botting failed!");
    }
  } catch (error) {
    console.log(error);
  }
})();
