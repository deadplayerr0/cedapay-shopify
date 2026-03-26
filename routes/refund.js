const express = require("express");
const axios = require("axios");
const { getMerchantApiKey } = require("../merchantStore");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { payment_id, amount, reason, shop } = req.body;

    if (!payment_id) {
      return res.status(400).json({ error: "Missing payment_id" });
    }

    const apiKey = getMerchantApiKey(shop || "");

    const response = await axios.post(
      `${process.env.CEDAPAY_BASE_URL}/process-refund`,
      { payment_id, amount, reason },
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error("Refund error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Refund failed" });
  }
});

module.exports = router;
