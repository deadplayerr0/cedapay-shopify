/**
 * Shopify Payments Apps API — Offsite Payment Gateway
 * 
 * Implements the three endpoints Shopify calls for offsite payments:
 * - POST /payments/create    → Customer selects CedaPay at checkout
 * - POST /payments/resolve   → Shopify checks if payment succeeded
 * - POST /payments/refund    → Shopify requests a refund
 */

const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const { getMerchantKeys } = require("../merchantStore");

const router = express.Router();

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";
const APP_URL = process.env.APP_URL || "";
const CEDAPAY_BASE_URL = process.env.CEDAPAY_BASE_URL || "";

/**
 * Verify Shopify HMAC signature on payment session requests
 */
function verifyShopifyHmac(req) {
  const hmacHeader = req.get("Shopify-Shop-Domain") ? req.get("X-Shopify-Hmac-Sha256") : null;
  if (!hmacHeader || !SHOPIFY_API_SECRET) return true; // Skip if not present

  const rawBody = JSON.stringify(req.body);
  const computed = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(hmacHeader),
    Buffer.from(computed)
  );
}

/**
 * POST /payments/create
 * 
 * Shopify calls this when a customer selects CedaPay at checkout.
 * We create a CedaPay payment session and return a redirect URL.
 * 
 * Shopify sends:
 * {
 *   id: "payment-session-id",
 *   gid: "gid://shopify/PaymentSession/123",
 *   group: "...",
 *   amount: "100.00",
 *   currency: "USD",
 *   test: false,
 *   merchant_locale: "en",
 *   payment_method: { ... },
 *   kind: "sale",
 *   customer: { email, phone, ... },
 *   proposed_at: "...",
 *   ...
 * }
 */
router.post("/create", async (req, res) => {
  try {
    if (!verifyShopifyHmac(req)) {
      return res.status(401).json({ error: "HMAC verification failed" });
    }

    const session = req.body;
    const shop = req.get("Shopify-Shop-Domain") || "";

    console.log(`📦 Payment session create from ${shop}:`, session.id);

    const merchant = getMerchantKeys(shop);
    if (!merchant) {
      return res.status(400).json({
        redirect_url: null,
        error: { message: "Merchant not configured. Please set up CedaPay API keys." }
      });
    }

    const mode = merchant.mode || "test";
    const secretKey = mode === "live" ? merchant.live_secret_key : merchant.test_secret_key;

    if (!secretKey) {
      return res.status(400).json({
        redirect_url: null,
        error: { message: `Missing ${mode} secret key for this merchant` }
      });
    }

    // Create CedaPay payment session
    const cedapayResponse = await axios.post(
      `${CEDAPAY_BASE_URL}/create-payment`,
      {
        amount: parseFloat(session.amount),
        currency: session.currency || "USD",
        description: `Shopify Order via ${shop}`,
        customer_email: session.customer?.email || "",
        customer_name: [session.customer?.billing_address?.given_name, session.customer?.billing_address?.family_name].filter(Boolean).join(" "),
        customer_phone: session.customer?.phone_number || "",
        return_url: `${APP_URL}/payments/complete?session_id=${encodeURIComponent(session.id)}&shop=${encodeURIComponent(shop)}`,
        cancel_url: `${APP_URL}/payments/cancel?session_id=${encodeURIComponent(session.id)}&shop=${encodeURIComponent(shop)}`,
        webhook_url: `${APP_URL}/webhook`,
        metadata: {
          shopify_payment_session_id: session.id,
          shopify_gid: session.gid,
          shop,
          mode,
          source: "shopify-payments-app"
        }
      },
      {
        headers: {
          "x-api-key": secretKey,
          "Content-Type": "application/json"
        }
      }
    );

    const checkoutUrl = cedapayResponse.data.checkout_url;
    const paymentId = cedapayResponse.data.id || cedapayResponse.data.payment_id;

    // Store the CedaPay payment ID mapped to Shopify session
    if (merchant.shopify_access_token) {
      const { saveMerchantKeys } = require("../merchantStore");
      const sessions = merchant._payment_sessions || {};
      sessions[session.id] = {
        cedapay_payment_id: paymentId,
        amount: session.amount,
        currency: session.currency,
        created_at: new Date().toISOString()
      };
      saveMerchantKeys(shop, { _payment_sessions: sessions });
    }

    console.log(`✅ Payment session created: ${session.id} → CedaPay ${paymentId}`);

    // Return redirect URL to Shopify
    return res.json({
      redirect_url: checkoutUrl
    });

  } catch (error) {
    console.error("Payment session create error:", error.response?.data || error.message);
    return res.status(500).json({
      redirect_url: null,
      error: { message: "Failed to create payment session" }
    });
  }
});

/**
 * GET /payments/complete
 * 
 * Customer returns here after completing payment on CedaPay.
 * We redirect them back to Shopify to finalize the order.
 */
router.get("/complete", async (req, res) => {
  const { session_id, shop } = req.query;

  if (!session_id || !shop) {
    return res.status(400).send("Missing parameters");
  }

  const merchant = getMerchantKeys(shop);
  const accessToken = merchant?.shopify_access_token;

  if (!accessToken) {
    return res.status(400).send("Merchant not configured");
  }

  try {
    // Resolve the payment session as successful via GraphQL
    const mutation = `
      mutation paymentSessionResolve($id: ID!) {
        paymentSessionResolve(id: $id) {
          paymentSession {
            id
            state {
              ... on PaymentSessionStateResolved {
                code
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await axios.post(
      `https://${shop}/admin/api/2025-01/graphql.json`,
      {
        query: mutation,
        variables: { id: `gid://shopify/PaymentSession/${session_id}` }
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`✅ Payment session ${session_id} resolved for ${shop}`);

    // Redirect customer back to Shopify's order confirmation
    res.redirect(`https://${shop}/admin`);
  } catch (error) {
    console.error("Payment resolve error:", error.response?.data || error.message);
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 60px;">
          <h1>Payment Processing</h1>
          <p>Your payment was received. You will be redirected to the store shortly.</p>
          <p><a href="https://${shop}">Return to store</a></p>
        </body>
      </html>
    `);
  }
});

/**
 * GET /payments/cancel
 * 
 * Customer cancelled payment on CedaPay — reject the session.
 */
router.get("/cancel", async (req, res) => {
  const { session_id, shop } = req.query;

  if (!session_id || !shop) {
    return res.status(400).send("Missing parameters");
  }

  const merchant = getMerchantKeys(shop);
  const accessToken = merchant?.shopify_access_token;

  if (accessToken) {
    try {
      const mutation = `
        mutation paymentSessionReject($id: ID!, $reason: PaymentSessionRejectionReasonInput!) {
          paymentSessionReject(id: $id, reason: $reason) {
            paymentSession { id }
            userErrors { field message }
          }
        }
      `;

      await axios.post(
        `https://${shop}/admin/api/2025-01/graphql.json`,
        {
          query: mutation,
          variables: {
            id: `gid://shopify/PaymentSession/${session_id}`,
            reason: { code: "PROCESSING_ERROR", merchantMessage: "Customer cancelled the payment" }
          }
        },
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json"
          }
        }
      );

      console.log(`❌ Payment session ${session_id} rejected (cancelled) for ${shop}`);
    } catch (error) {
      console.error("Payment reject error:", error.response?.data || error.message);
    }
  }

  res.redirect(`https://${shop}`);
});

/**
 * POST /payments/resolve
 * 
 * Shopify calls this to check if a pending payment has been resolved.
 */
router.post("/resolve", async (req, res) => {
  try {
    if (!verifyShopifyHmac(req)) {
      return res.status(401).json({ error: "HMAC verification failed" });
    }

    const { id } = req.body;
    const shop = req.get("Shopify-Shop-Domain") || "";

    console.log(`🔍 Payment resolve check from ${shop}: ${id}`);

    const merchant = getMerchantKeys(shop);
    const sessionData = merchant?._payment_sessions?.[id];

    if (!sessionData) {
      return res.json({ status: "pending" });
    }

    // Check CedaPay payment status
    const mode = merchant.mode || "test";
    const secretKey = mode === "live" ? merchant.live_secret_key : merchant.test_secret_key;

    if (sessionData.cedapay_payment_id && secretKey) {
      try {
        const statusResponse = await axios.get(
          `${CEDAPAY_BASE_URL}/get-payment-status?payment_id=${sessionData.cedapay_payment_id}`,
          {
            headers: {
              "x-api-key": secretKey,
              "Content-Type": "application/json"
            }
          }
        );

        const paymentStatus = statusResponse.data.status;

        if (paymentStatus === "completed" || paymentStatus === "successful") {
          return res.json({ status: "resolved" });
        } else if (paymentStatus === "failed" || paymentStatus === "cancelled") {
          return res.json({ status: "rejected", reason: { code: "PROCESSING_ERROR" } });
        }
      } catch (err) {
        console.error("Status check error:", err.message);
      }
    }

    return res.json({ status: "pending" });
  } catch (error) {
    console.error("Payment resolve error:", error.message);
    return res.status(500).json({ status: "pending" });
  }
});

/**
 * POST /payments/refund
 * 
 * Shopify calls this when a refund is initiated from the Shopify admin.
 */
router.post("/refund", async (req, res) => {
  try {
    if (!verifyShopifyHmac(req)) {
      return res.status(401).json({ error: "HMAC verification failed" });
    }

    const session = req.body;
    const shop = req.get("Shopify-Shop-Domain") || "";

    console.log(`💰 Refund request from ${shop}:`, session.id);

    const merchant = getMerchantKeys(shop);
    if (!merchant) {
      return res.status(400).json({ error: "Merchant not configured" });
    }

    const mode = merchant.mode || "test";
    const secretKey = mode === "live" ? merchant.live_secret_key : merchant.test_secret_key;

    // Find the original payment session
    const paymentSessionId = session.payment_id;
    const sessionData = merchant._payment_sessions?.[paymentSessionId];

    if (sessionData?.cedapay_payment_id && secretKey) {
      try {
        await axios.post(
          `${CEDAPAY_BASE_URL}/process-refund`,
          {
            payment_id: sessionData.cedapay_payment_id,
            amount: parseFloat(session.amount),
            reason: "Shopify refund request"
          },
          {
            headers: {
              "x-api-key": secretKey,
              "Content-Type": "application/json"
            }
          }
        );

        console.log(`✅ Refund processed for session ${paymentSessionId}`);
      } catch (refundErr) {
        console.error("CedaPay refund error:", refundErr.response?.data || refundErr.message);
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Refund error:", error.message);
    return res.status(500).json({ error: "Refund processing failed" });
  }
});

module.exports = router;
