const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  const shop = req.query.shop || "";
  const orderId = req.query.order_id || "";
  const paymentId = req.query.payment_id || "";

  // If we have the shop domain, redirect back to the Shopify store
  if (shop) {
    // Redirect to the Shopify order status / thank you page
    const shopUrl = shop.includes(".myshopify.com")
      ? `https://${shop}`
      : `https://${shop}.myshopify.com`;

    // Shopify order status page
    if (orderId) {
      return res.redirect(`${shopUrl}/pages/order-confirmation?order_id=${orderId}`);
    }
    return res.redirect(shopUrl);
  }

  // Fallback: show a success page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Successful</title>
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
        h1 { font-size: 22px; color: #1a7b2d; margin-bottom: 8px; }
        p { color: #6d7175; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✅</div>
        <h1>Payment Completed Successfully</h1>
        <p>Your payment has been processed. You can close this window and return to the store.</p>
        ${paymentId ? `<p style="margin-top:12px;font-size:12px;color:#999;">Payment ID: ${paymentId}</p>` : ""}
      </div>
    </body>
    </html>
  `);
});

module.exports = router;
