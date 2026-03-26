/**
 * CedaPay Shopify App — v1.2.0
 * Multi-Merchant, Render-Hosted
 * 
 * Features: OAuth install, Payments Apps API (offsite gateway),
 * per-merchant keys, HMAC verification, GDPR webhooks, App Bridge embedding.
 */

require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const path = require("path");

const { saveMerchantKeys, getMerchantKeys } = require("./merchantStore");

const createPayment = require("./routes/createPayment");
const webhook = require("./routes/webhook");
const returnRoute = require("./routes/return");
const cancelRoute = require("./routes/cancel");
const paymentStatus = require("./routes/paymentStatus");
const refundRoute = require("./routes/refund");
const shopifyPayment = require("./routes/shopifyPayment");
const settingsRoute = require("./routes/settings");
const settingsPageRoute = require("./routes/settingsPage");
const settingsFormRoute = require("./routes/settingsForm");
const merchantStatusRoute = require("./routes/merchantStatus");
const paymentsAppRoute = require("./routes/paymentsApp");

const app = express();
const PORT = process.env.PORT || 3000;

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const SCOPES = "read_orders,write_orders,write_script_tags,write_payment_gateways,write_payment_sessions";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (including cedapay-checkout.js for ScriptTag injection)
app.use("/public", express.static(path.join(__dirname, "public")));

// ============================================
// Health & Info — Shopify Admin Embed Detection
// ============================================

app.get("/", (req, res) => {
  // If loaded inside Shopify Admin iframe, redirect to settings page
  if (req.query.shop || req.query.host) {
    return res.redirect(
      `/settings-page?shop=${encodeURIComponent(req.query.shop || "")}&host=${encodeURIComponent(req.query.host || "")}`
    );
  }
  // Otherwise return health/info JSON
  res.json({
    app: "CedaPay Shopify Payment Gateway",
    version: "1.2.0",
    status: "running",
    docs: "https://docs.cedapay.com/shopify"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", version: "1.2.0" });
});

// ============================================
// OAuth Install Flow
// ============================================

app.get("/auth", (req, res) => {
  const shop = req.query.shop;

  if (!shop) {
    return res.status(400).send("Missing ?shop=your-store.myshopify.com");
  }

  // Generate a nonce for CSRF protection
  const nonce = crypto.randomBytes(16).toString("hex");
  app.locals.nonces = app.locals.nonces || {};
  app.locals.nonces[shop] = nonce;

  const redirectUri = `${APP_URL}/auth/callback`;
  const installUrl =
    `https://${shop}/admin/oauth/authorize?` +
    `client_id=${encodeURIComponent(SHOPIFY_API_KEY)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(nonce)}`;

  return res.redirect(installUrl);
});

// ============================================
// OAuth Callback — Token Exchange + Payment App Registration
// ============================================

app.get("/auth/callback", async (req, res) => {
  const { shop, code, state, hmac } = req.query;

  if (!shop || !code) {
    return res.status(400).send("Missing required parameters");
  }

  // Verify nonce (CSRF)
  const expectedNonce = app.locals.nonces?.[shop];
  if (state !== expectedNonce) {
    return res.status(403).send("Invalid state parameter — possible CSRF attack");
  }
  delete app.locals.nonces[shop];

  // Verify HMAC
  if (hmac && SHOPIFY_API_SECRET) {
    const params = { ...req.query };
    delete params.hmac;
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const expectedHmac = crypto
      .createHmac("sha256", SHOPIFY_API_SECRET)
      .update(sortedParams)
      .digest("hex");

    if (hmac !== expectedHmac) {
      return res.status(403).send("HMAC verification failed");
    }
  }

  try {
    // Step 1: Exchange authorization code for permanent access token
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      console.error("Token exchange failed:", tokenResponse.data);
      return res.status(500).send("Failed to complete installation. Please contact support@cedapay.com");
    }

    // Step 2: Store the access token
    saveMerchantKeys(shop, { shopify_access_token: accessToken });
    console.log(`✅ App installed on ${shop} — access token stored`);

    // Step 3: Register ScriptTag (injects cedapay-checkout.js on storefront)
    try {
      // First, remove any existing CedaPay script tags to avoid duplicates
      const existingTags = await axios.get(
        `https://${shop}/admin/api/2024-01/script_tags.json`,
        { headers: { "X-Shopify-Access-Token": accessToken } }
      );

      const cedapayTags = existingTags.data.script_tags?.filter(
        (t) => t.src && t.src.includes("cedapay-checkout.js")
      ) || [];

      for (const tag of cedapayTags) {
        await axios.delete(
          `https://${shop}/admin/api/2024-01/script_tags/${tag.id}.json`,
          { headers: { "X-Shopify-Access-Token": accessToken } }
        );
      }

      // Register fresh ScriptTag
      await axios.post(
        `https://${shop}/admin/api/2024-01/script_tags.json`,
        {
          script_tag: {
            event: "onload",
            src: `${APP_URL}/public/cedapay-checkout.js`
          }
        },
        { headers: { "X-Shopify-Access-Token": accessToken } }
      );

      console.log(`✅ ScriptTag registered on ${shop}`);
    } catch (scriptErr) {
      console.error(`⚠️ ScriptTag registration failed on ${shop}:`, scriptErr.response?.data || scriptErr.message);
    }

    // Step 4: Register as Shopify Payments App via GraphQL
    try {
      const paymentsAppMutation = `
        mutation {
          paymentsAppConfigure(
            externalHandle: "cedapay"
            ready: true
          ) {
            paymentsAppConfiguration {
              externalHandle
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const graphqlResponse = await axios.post(
        `https://${shop}/admin/api/2024-01/graphql.json`,
        { query: paymentsAppMutation },
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json"
          }
        }
      );

      const userErrors = graphqlResponse.data?.data?.paymentsAppConfigure?.userErrors;
      if (userErrors && userErrors.length > 0) {
        console.error(`⚠️ Payments App registration errors on ${shop}:`, userErrors);
      } else {
        console.log(`✅ Payments App registered on ${shop}`);
      }
    } catch (paymentsErr) {
      console.error(`⚠️ Payments App registration failed on ${shop}:`, paymentsErr.response?.data || paymentsErr.message);
      // Non-fatal — merchant can still configure keys and use ScriptTag flow
    }

    // Step 5: Redirect to settings page (embedded in Shopify Admin)
    const host = req.query.host || "";
    res.redirect(`/settings-page?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`);

  } catch (error) {
    console.error("OAuth callback error:", error.response?.data || error.message);
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 60px;">
          <h1>❌ Installation Failed</h1>
          <p>Could not complete the Shopify installation.</p>
          <p>Please contact <a href="mailto:support@cedapay.com">support@cedapay.com</a></p>
          <p style="color: #999; font-size: 12px;">${error.response?.data?.error || error.message}</p>
        </body>
      </html>
    `);
  }
});

// ============================================
// GDPR Mandatory Webhooks (required by Shopify)
// ============================================

app.post("/webhooks/customers/data_request", (req, res) => {
  console.log("GDPR: Customer data request received", req.body);
  res.status(200).json({ received: true });
});

app.post("/webhooks/customers/redact", (req, res) => {
  console.log("GDPR: Customer redact request received", req.body);
  res.status(200).json({ received: true });
});

app.post("/webhooks/shop/redact", (req, res) => {
  console.log("GDPR: Shop redact request received", req.body);
  res.status(200).json({ received: true });
});

// ============================================
// Route Mounts
// ============================================

app.use("/create-payment", createPayment);
app.use("/shopify/payment", shopifyPayment);
app.use("/payment-status", paymentStatus);
app.use("/refund", refundRoute);
app.use("/webhook", webhook);
app.use("/return", returnRoute);
app.use("/cancel", cancelRoute);
app.use("/settings", settingsRoute);
app.use("/settings-page", settingsPageRoute);
app.use("/settings-form", settingsFormRoute);
app.use("/merchant-status", merchantStatusRoute);
app.use("/payments", paymentsAppRoute);

// ============================================
// Error Handling
// ============================================

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ============================================
// Start
// ============================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CedaPay Shopify v1.2.0 running on port ${PORT}`);
  console.log(`App URL: ${APP_URL}`);
});

module.exports = app;
