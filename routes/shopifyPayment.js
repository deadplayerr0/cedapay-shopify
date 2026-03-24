const express = require("express");
const axios = require("axios");
const { getMerchantKeys } = require("../merchantStore");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const order = req.body;
    const shop = order.shop;

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: "Missing shop"
      });
    }

    const merchant = getMerchantKeys(shop);

    if (!merchant) {
      return res.status(400).json({
        success: false,
        error: "Merchant settings not found"
      });
    }

    const mode = merchant.mode || "test";

    const secretKey =
      mode === "live"
        ? merchant.live_secret_key
        : merchant.test_secret_key;

    if (!secretKey) {
      return res.status(400).json({
        success: false,
        error: `Missing ${mode} secret key for this merchant`
      });
    }

    const response = await axios.post(
      `${process.env.CEDAPAY_BASE_URL}/create-payment`,
      {
        amount: order.amount,
        currency: order.currency,
        description: "Shopify Order " + order.order_id,
        customer_email: order.customer_email,
        customer_name: order.customer_name || "",
        customer_phone: order.customer_phone || "",
        return_url: `${process.env.APP_URL}/return`,
        cancel_url: `${process.env.APP_URL}/cancel`,
        metadata: {
          order_id: order.order_id,
          shop,
          mode
        }
      },
      {
        headers: {
          "x-api-key": secretKey,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      success: true,
      mode,
      cedapay_response: response.data
    });
  } catch (error) {
    console.log(
      "Payment error:",
      error.response ? error.response.data : error.message
    );

    return res.status(500).json({
      success: false,
      error: error.response ? error.response.data : error.message
    });
  }
});

module.exports = router;