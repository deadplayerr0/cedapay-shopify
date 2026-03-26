const express = require("express");
const crypto = require("crypto");
const { getMerchantKeys, getMerchantApiKey } = require("../merchantStore");

const router = express.Router();

router.post("/", (req, res) => {
  try {
    const signature = req.headers["x-cedapay-signature"];
    const rawBody = JSON.stringify(req.body);

    // Try to resolve per-merchant webhook secret
    const shopDomain = req.body?.data?.metadata?.shop || req.body?.metadata?.shop;
    const apiKey = getMerchantApiKey(shopDomain || "");

    if (apiKey && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", apiKey)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.warn("Webhook signature mismatch for shop:", shopDomain);
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const { type, data } = req.body;
    console.log(`[${shopDomain || "unknown"}] Webhook received: ${type}`);

    switch (type) {
      case "payment.completed":
        console.log(`✅ Payment completed: ${data?.payment_id || data?.id}`);
        break;
      case "payment.failed":
        console.log(`❌ Payment failed: ${data?.payment_id || data?.id}`);
        break;
      case "refund.completed":
        console.log(`↩️ Refund completed: ${data?.refund_id || data?.id}`);
        break;
      default:
        console.log(`📨 Webhook type: ${type}`);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(500).json({ error: "Webhook handling failed" });
  }
});

module.exports = router;
