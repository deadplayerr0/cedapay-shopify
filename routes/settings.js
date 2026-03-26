const express = require("express");
const { getMerchantKeys } = require("../merchantStore");

const router = express.Router();

router.get("/", (req, res) => {
  const shop = req.query.shop || "";
  const host = req.query.host || "";
  const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";

  // Load existing merchant data to pre-fill form
  const merchant = getMerchantKeys(shop) || {};

  const hasKeys = !!(merchant.test_secret_key || merchant.live_secret_key);
  const isConnected = !!merchant.shopify_access_token;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="shopify-api-key" content="${SHOPIFY_API_KEY}">
      <title>CedaPay Settings</title>
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #f6f6f7;
          color: #202223;
          padding: 24px;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          padding: 24px;
          max-width: 640px;
          margin: 0 auto 20px;
        }
        h1 { font-size: 22px; margin-bottom: 8px; }
        .subtitle { color: #6d7175; margin-bottom: 24px; font-size: 14px; }
        .shop-badge {
          display: inline-block;
          background: #e3f1df;
          color: #1a7b2d;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .connected-badge {
          display: inline-block;
          background: #e3f1df;
          color: #1a7b2d;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          margin-left: 8px;
        }
        .status-card {
          background: #f0f5ff;
          border: 1px solid #b4c9e8;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .status-card h3 { margin-bottom: 12px; font-size: 14px; color: #3b5998; }
        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 13px;
        }
        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .status-green { background: #1a7b2d; }
        .status-red { background: #d72c0d; }
        .status-yellow { background: #b98900; }
        h3 { font-size: 15px; margin: 20px 0 12px; color: #6d7175; text-transform: uppercase; letter-spacing: 0.5px; }
        label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
        input[type="text"], input[type="password"], select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #c9cccf;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 16px;
          transition: border-color 0.2s;
        }
        input:focus, select:focus {
          outline: none;
          border-color: #5c6ac4;
          box-shadow: 0 0 0 2px rgba(92,106,196,0.2);
        }
        .btn {
          background: #008060;
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s;
        }
        .btn:hover { background: #006e52; }
        .info-box {
          background: #f0f5ff;
          border: 1px solid #b4c9e8;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
          font-size: 13px;
          color: #3b5998;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>CedaPay Payment Settings</h1>
        <p class="subtitle">Configure your CedaPay payment gateway for Shopify</p>
        
        <span class="shop-badge">🏪 ${shop}</span>
        ${isConnected ? '<span class="connected-badge">✅ Connected</span>' : ''}
        
        <div class="status-card">
          <h3>📊 Integration Status</h3>
          <div class="status-item">
            <span class="status-dot ${isConnected ? 'status-green' : 'status-red'}"></span>
            <span>Shopify Connection: ${isConnected ? 'Active' : 'Not connected'}</span>
          </div>
          <div class="status-item">
            <span class="status-dot ${hasKeys ? 'status-green' : 'status-yellow'}"></span>
            <span>API Keys: ${hasKeys ? 'Configured' : 'Not set'}</span>
          </div>
          <div class="status-item">
            <span class="status-dot ${hasKeys && isConnected ? 'status-green' : 'status-yellow'}"></span>
            <span>Payment Gateway: ${hasKeys && isConnected ? 'Ready' : 'Pending setup'}</span>
          </div>
        </div>
        
        <form method="POST" action="/settings-form">
          <input type="hidden" name="shop" value="${shop}">
          <input type="hidden" name="host" value="${host}">
          
          <h3>🧪 Test / Sandbox Keys</h3>
          
          <label for="test_secret_key">Test Secret Key</label>
          <input type="password" id="test_secret_key" name="test_secret_key" 
                 placeholder="sk_test_..." value="${merchant.test_secret_key || ""}">
          
          <label for="test_publishable_key">Test Publishable Key</label>
          <input type="text" id="test_publishable_key" name="test_publishable_key" 
                 placeholder="pk_test_..." value="${merchant.test_publishable_key || ""}">
          
          <h3>🔐 Live Keys</h3>
          
          <label for="live_secret_key">Live Secret Key</label>
          <input type="password" id="live_secret_key" name="live_secret_key" 
                 placeholder="sk_live_..." value="${merchant.live_secret_key || ""}">
          
          <label for="live_publishable_key">Live Publishable Key</label>
          <input type="text" id="live_publishable_key" name="live_publishable_key" 
                 placeholder="pk_live_..." value="${merchant.live_publishable_key || ""}">
          
          <h3>⚙️ Active Mode</h3>
          
          <select name="mode" id="mode">
            <option value="test" ${(merchant.mode || "test") === "test" ? "selected" : ""}>Test / Sandbox</option>
            <option value="live" ${merchant.mode === "live" ? "selected" : ""}>Live</option>
          </select>
          
          <button type="submit" class="btn">💾 Save Settings</button>
        </form>
        
        <div class="info-box">
          <strong>How it works:</strong><br>
          1. Enter your CedaPay API keys (get them from your <a href="https://cpay.lovable.app" target="_blank">CedaPay Dashboard</a>)<br>
          2. Select Test mode while testing, switch to Live when ready<br>
          3. CedaPay will appear as a payment option at checkout automatically<br>
          4. Customers are redirected to CedaPay's secure checkout to complete payment
        </div>
      </div>
      
      <script>
        // Initialize Shopify App Bridge for embedded admin experience
        if (window.shopify && '${host}') {
          try {
            // App Bridge v4+ auto-initializes from the meta tag
            console.log('CedaPay: App Bridge initialized');
          } catch(e) {
            console.log('App Bridge init (non-critical):', e.message);
          }
        }
      </script>
    </body>
    </html>
  `);
});

module.exports = router;
