const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  const shop = req.query.shop || "";

  // If we have the shop domain, redirect back to the cart page
  if (shop) {
    const shopUrl = shop.includes(".myshopify.com")
      ? `https://${shop}`
      : `https://${shop}.myshopify.com`;

    return res.redirect(`${shopUrl}/cart`);
  }

  // Fallback
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Cancelled</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f6f6f7;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          padding: 40px;
          text-align: center;
          max-width: 500px;
        }
        .icon { font-size: 48px; margin-bottom: 16px; }
        h1 { font-size: 22px; color: #b98900; margin-bottom: 8px; }
        p { color: #6d7175; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">⚠️</div>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. No charges were made. You can return to the store and try again.</p>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;
