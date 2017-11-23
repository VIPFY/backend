import axios from "axios";
import { SHOPIFY_KEY, SHOPIFY_SECRET } from "../login-data";

const config = {
  method: "post",
  url: `https://${SHOPIFY_KEY}:${
    SHOPIFY_SECRET
  }@vipfy-test.myshopify.com/admin/products/434758582314.json`,
  data: {
    product: {
      title: "App6",
      vendor: "User1",
      product_type: "App"
    }
  }
};

axios(config)
  .then(res => console.log(res.data))
  .catch(err => console.log(err.response.data));
