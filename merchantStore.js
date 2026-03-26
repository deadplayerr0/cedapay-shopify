const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
const filePath = path.join(dataDir, "merchantKeys.json");

// Ensure data directory exists on startup
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readStore() {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw || "{}");
  } catch (error) {
    return {};
  }
}

function writeStore(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function saveMerchantKeys(shop, keys) {
  const store = readStore();

  store[shop] = {
    ...store[shop],
    ...keys,
    updated_at: new Date().toISOString()
  };

  writeStore(store);
  return store[shop];
}

function getMerchantKeys(shop) {
  const store = readStore();
  return store[shop] || null;
}

/**
 * Get the active CedaPay API key for a merchant
 * Falls back to global env var if no per-merchant key is set
 */
function getMerchantApiKey(shop) {
  const merchant = getMerchantKeys(shop);
  if (!merchant) return process.env.CEDAPAY_API_KEY;

  const mode = merchant.mode || "test";
  const key = mode === "live" ? merchant.live_secret_key : merchant.test_secret_key;
  return key || process.env.CEDAPAY_API_KEY;
}

/**
 * Get the Shopify access token for a merchant
 */
function getAccessToken(shop) {
  const merchant = getMerchantKeys(shop);
  return merchant?.shopify_access_token || null;
}

module.exports = {
  saveMerchantKeys,
  getMerchantKeys,
  getMerchantApiKey,
  getAccessToken
};
