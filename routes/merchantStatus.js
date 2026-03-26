const express = require("express");
const { getMerchantKeys } = require("../merchantStore");

const router = express.Router();

router.get("/:shop", (req, res) => {
  const shop = req.params.shop;
  const merchant = getMerchantKeys(shop);

  if (!merchant) {
    return res.json({ connected: false, shop });
  }

  const mode = merchant.mode || "test";
  const hasKey = mode === "live" ? !!merchant.live_secret_key : !!merchant.test_secret_key;

  return res.json({
    connected: true,
    configured: hasKey,
    shop,
    mode,
    has_access_token: !!merchant.shopify_access_token,
    updated_at: merchant.updated_at
  });
});

module.exports = router;
