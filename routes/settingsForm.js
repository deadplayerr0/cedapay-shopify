const express = require("express");
const { saveMerchantKeys } = require("../merchantStore");

const router = express.Router();

router.post("/", (req, res) => {
  const {
    shop,
    test_secret_key,
    test_publishable_key,
    live_secret_key,
    live_publishable_key,
    mode
  } = req.body;

  if (!shop) {
    return res.status(400).send("Missing shop");
  }

  saveMerchantKeys(shop, {
    test_secret_key: test_secret_key || "",
    test_publishable_key: test_publishable_key || "",
    live_secret_key: live_secret_key || "",
    live_publishable_key: live_publishable_key || "",
    mode: mode || "test"
  });

  return res.send(`
    <html>
      <body style="font-family: Arial; max-width: 700px; margin: 40px auto;">
        <h1>Settings saved successfully</h1>
        <p>Shop: ${shop}</p>
        <p>Mode: ${mode || "test"}</p>
        <p>Your Cedapay account is now connected.</p>
        <a href="/settings-page?shop=${encodeURIComponent(shop)}">Back to settings</a>
      </body>
    </html>
  `);
});

module.exports = router;