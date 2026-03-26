const express = require("express");
const axios = require("axios");
const { getMerchantKeys } = require("../merchantStore");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const order = req.body;
    const shop = order.shop;

    if (!shop) {
      return res.status(400).json({ success: false, error: "Missing shop" });
    }

    const merchant = getMerchantKeys(shop);

    if (!merchant) {
      return res.status(400).json({ success: false, error: "Merchant settings not found. Please configure your CedaPay keys first." });
    }

    const mode = merchant.mode || "test";
    const secretKey = mode === "live" ? merchant.live_secret_key : merchant.test_secret_key;

    if (!secretKey) {
      return res.status(400).json({ success: false, error: `Missing ${mode} secret key for this merchant` });
    }

    const CEDAPAY_BASE_URL = process.env.CEDAPAY_BASE_URL;

    const response = await axios.post(
      `${CEDAPAY_BASE_URL}/create-payment`,
      {
        amount: order.amount,
        currency: order.currency || "USD",
        description: "Shopify Order " + (order.order_id || ""),
        customer_email: order.customer_email || "",
        customer_name: order.customer_name || "",
        customer_phone: order.customer_phone || "",
        return_url: `${process.env.APP_URL}/return?shop=${encodeURIComponent(shop)}&order_id=${encodeURIComponent(order.order_id || "")}`,
        cancel_url: `${process.env.APP_URL}/cancel?shop=${encodeURIComponent(shop)}`,
        webhook_url: `${process.env.APP_URL}/webhook`,
        metadata: {
          order_id: order.order_id,
          shop,
          mode,
          source: "shopify"
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
      checkout_url: response.data.checkout_url,
      cedapay_response: response.data
    });
  } catch (error) {
    console.error("Payment error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

module.exports = router;
