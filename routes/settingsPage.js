const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  const shop = req.query.shop || "";

  res.send(`
    <html>
      <head>
        <title>Cedapay Settings</title>
      </head>
      <body style="font-family: Arial; max-width: 700px; margin: 40px auto;">
        <h1>Cedapay Merchant Settings</h1>

        <form method="post" action="/settings-form">
          <label>Shopify Shop</label><br />
          <input
            type="text"
            name="shop"
            value="${shop}"
            ${shop ? "readonly" : ""}
            style="width:100%;padding:10px;margin:8px 0;background:${shop ? "#f5f5f5" : "white"};"
          />

          <h3>Test / Sandbox Keys</h3>
          <label>Test Secret Key</label><br />
          <input type="text" name="test_secret_key" style="width:100%;padding:10px;margin:8px 0;" />

          <label>Test Publishable Key</label><br />
          <input type="text" name="test_publishable_key" style="width:100%;padding:10px;margin:8px 0;" />

          <h3>Live Keys</h3>
          <label>Live Secret Key</label><br />
          <input type="text" name="live_secret_key" style="width:100%;padding:10px;margin:8px 0;" />

          <label>Live Publishable Key</label><br />
          <input type="text" name="live_publishable_key" style="width:100%;padding:10px;margin:8px 0;" />

          <h3>Active Mode</h3>
          <select name="mode" style="width:100%;padding:10px;margin:8px 0;">
            <option value="test">Test / Sandbox</option>
            <option value="live">Live</option>
          </select>

          <br /><br />
          <button type="submit" style="padding:12px 20px;">Save Settings</button>
        </form>
      </body>
    </html>
  `);
});

module.exports = router;