const express = require("express");
const { getMerchantKeys } = require("../merchantStore");

const router = express.Router();

router.get("/:shop", (req, res) => {
  const shop = req.params.shop;
  const merchant = getMerchantKeys(shop);

  if (!merchant) {
    return res.json({
      connected: false,
      shop
    });
  }

  return res.json({
    connected: true,
    shop,
    mode: merchant.mode || "test",
    has_test_secret_key: !!merchant.test_secret_key,
    has_test_publishable_key: !!merchant.test_publishable_key,
    has_live_secret_key: !!merchant.live_secret_key,
    has_live_publishable_key: !!merchant.live_publishable_key,
    updated_at: merchant.updated_at
  });
});

module.exports = router;