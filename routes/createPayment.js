const express = require("express");
const axios = require("axios");
const { getMerchantApiKey } = require("../merchantStore");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const order = req.body;
    const shop = order.shop || "";
    const apiKey = getMerchantApiKey(shop);

    if (!apiKey) {
      return res.status(400).json({ error: "No CedaPay API key configured for this store" });
    }

    const response = await axios.post(
      `${process.env.CEDAPAY_BASE_URL}/create-payment`,
      {
        amount: order.amount,
        currency: order.currency,
        description: "Order " + order.order_id,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        return_url: `${process.env.APP_URL}/return?shop=${encodeURIComponent(shop)}&order_id=${encodeURIComponent(order.order_id || "")}`,
        cancel_url: `${process.env.APP_URL}/cancel?shop=${encodeURIComponent(shop)}`,
        metadata: {
          order_id: order.order_id,
          shop,
          source: "shopify"
        }
      },
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        }
      }
    );

    const checkout = response.data.checkout_url;
    if (checkout) {
      return res.redirect(checkout);
    }

    return res.json(response.data);
  } catch (error) {
    console.error("Payment error:", error.response?.data || error.message);
    res.status(500).send("Payment creation failed");
  }
});

module.exports = router;
