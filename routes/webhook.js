const express = require("express");
const crypto = require("crypto");

const router = express.Router();

router.post("/", (req, res) => {
  try {
    const signature = req.headers["x-cedapay-signature"];
    const rawBody = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", process.env.CEDAPAY_API_KEY)
      .update(rawBody)
      .digest("hex");

    if (!signature || signature !== expectedSignature) {
      return res.status(401).json({
        error: "Invalid signature"
      });
    }

    console.log("Verified webhook:", req.body);

    return res.sendStatus(200);
  } catch (error) {
    console.log("Webhook error:", error.message);
    return res.status(500).json({
      error: "Webhook handling failed"
    });
  }
});

module.exports = router;