const express = require("express");
const { saveMerchantKeys, getMerchantKeys } = require("../merchantStore");

const router = express.Router();

router.post("/", (req, res) => {
  try {
    const {
      shop,
      test_secret_key,
      test_publishable_key,
      live_secret_key,
      live_publishable_key,
      mode
    } = req.body;

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: "Missing shop"
      });
    }

    const saved = saveMerchantKeys(shop, {
      test_secret_key: test_secret_key || "",
      test_publishable_key: test_publishable_key || "",
      live_secret_key: live_secret_key || "",
      live_publishable_key: live_publishable_key || "",
      mode: mode || "test"
    });

    return res.json({
      success: true,
      message: "Merchant keys saved",
      data: {
        shop,
        mode: saved.mode,
        has_test_secret_key: !!saved.test_secret_key,
        has_test_publishable_key: !!saved.test_publishable_key,
        has_live_secret_key: !!saved.live_secret_key,
        has_live_publishable_key: !!saved.live_publishable_key
      }
    });
  } catch (error) {
    console.log("Settings save error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to save merchant settings"
    });
  }
});

router.get("/:shop", (req, res) => {
  try {
    const shop = req.params.shop;
    const merchant = getMerchantKeys(shop);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: "Merchant settings not found"
      });
    }

    return res.json({
      success: true,
      data: {
        shop,
        mode: merchant.mode || "test",
        has_test_secret_key: !!merchant.test_secret_key,
        has_test_publishable_key: !!merchant.test_publishable_key,
        has_live_secret_key: !!merchant.live_secret_key,
        has_live_publishable_key: !!merchant.live_publishable_key,
        updated_at: merchant.updated_at
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to get merchant settings"
    });
  }
});

module.exports = router;