require("dotenv").config();

const express = require("express");
const crypto = require("crypto");

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

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/auth", (req, res) => {
  const shop = req.query.shop;

  if (!shop) {
    return res.status(400).send("Missing shop");
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const scopes = "read_orders,write_orders";
  const redirectUri = process.env.APP_URL + "/auth/callback";

  const installUrl =
    `https://${shop}/admin/oauth/authorize?` +
    `client_id=${apiKey}` +
    `&scope=${scopes}` +
    `&redirect_uri=${redirectUri}`;

  return res.redirect(installUrl);
});

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

app.get("/", (req, res) => {
  res.send("Cedapay Gateway Running");
});

app.get("/auth/callback", async (req, res) => {
  const shop = req.query.shop;

  console.log("App installed on:", shop);

  return res.redirect(
    `/settings-page?shop=${encodeURIComponent(shop)}`
  );
});

app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});