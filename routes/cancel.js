const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Payment was cancelled");
});

module.exports = router;