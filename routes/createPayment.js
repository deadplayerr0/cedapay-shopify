const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/", async (req, res) => {

  try {

    const order = req.body;

    console.log("Creating payment for:", order);

    const response = await axios.post(

      process.env.CEDAPAY_BASE_URL +
      "/create-payment",

      {
        amount: order.amount,
        currency: order.currency,

        description:
          "Order " + order.order_id,

        customer_email:
          order.customer_email,

        customer_name:
          order.customer_name,

        customer_phone:
          order.customer_phone,

        return_url:
          process.env.APP_URL +
          "/return",

        cancel_url:
          process.env.APP_URL +
          "/cancel",

        metadata: {
          order_id:
            order.order_id
        }

      },

      {
        headers: {
          "x-api-key":
            process.env.CEDAPAY_API_KEY,
          "Content-Type":
            "application/json"
        }
      }

    );

    console.log(
      "Cedapay response:",
      response.data
    );

    const checkout =
      response.data.checkout_url;

    res.redirect(checkout);

  }

  catch (error) {

    console.log(
      "Payment error:",
      error.response
        ? error.response.data
        : error.message
    );

    res.status(500).send(
      "Payment creation failed"
    );

  }

});

module.exports = router;