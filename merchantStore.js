const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "data", "merchantKeys.json");

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

module.exports = {
  saveMerchantKeys,
  getMerchantKeys
};