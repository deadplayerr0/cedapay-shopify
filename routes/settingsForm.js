const express = require("express");
const { saveMerchantKeys } = require("../merchantStore");

const router = express.Router();

router.post("/", (req, res) => {
  const {
    shop,
    host,
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

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Settings Saved</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #f6f6f7;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          padding: 40px;
          text-align: center;
          max-width: 500px;
        }
        .check { font-size: 48px; margin-bottom: 16px; }
        h1 { font-size: 20px; margin-bottom: 8px; }
        p { color: #6d7175; margin-bottom: 4px; font-size: 14px; }
        .badge {
          display: inline-block;
          background: ${mode === "live" ? "#ffecd5" : "#e3f1df"};
          color: ${mode === "live" ? "#b98900" : "#1a7b2d"};
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          margin: 12px 0;
        }
        a {
          display: inline-block;
          margin-top: 20px;
          color: #5c6ac4;
          text-decoration: none;
          font-weight: 500;
        }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="check">✅</div>
        <h1>Settings Saved Successfully</h1>
        <p>Shop: <strong>${shop}</strong></p>
        <div class="badge">${(mode || "test") === "live" ? "🔴 Live Mode" : "🧪 Test Mode"}</div>
        <p>Your CedaPay payment gateway is now configured.</p>
        <br>
        <a href="/settings-page?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host || "")}">← Back to Settings</a>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;
