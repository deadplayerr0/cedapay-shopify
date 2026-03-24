const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {

  res.send(
    "Payment completed successfully"
  );

});

module.exports = router;