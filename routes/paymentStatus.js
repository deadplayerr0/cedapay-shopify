const express = require("express");
const axios = require("axios");
const { getMerchantApiKey } = require("../merchantStore");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const paymentId = req.query.payment_id;
    const shop = req.query.shop || "";

    if (!paymentId) {
      return res.status(400).json({ error: "Missing payment_id" });
    }

    const apiKey = getMerchantApiKey(shop);

    const response = await axios.get(
      `${process.env.CEDAPAY_BASE_URL}/get-payment-status`,
      {
        params: { payment_id: paymentId },
        headers: { "x-api-key": apiKey }
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error("Status error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to get payment status" });
  }
});

module.exports = router;
