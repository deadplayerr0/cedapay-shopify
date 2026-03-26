/**
 * CedaPay Checkout Injection Script v1.1.0
 * 
 * Injected via Shopify ScriptTag on merchant storefronts.
 * Detects cart/checkout pages and renders a "Pay with CedaPay" button.
 * 
 * Flow:
 * 1. Script loads on every storefront page
 * 2. Detects if on /cart page
 * 3. Checks with the CedaPay app if this merchant is configured
 * 4. Renders a styled "Pay with CedaPay" button
 * 5. On click → sends cart data to CedaPay app → redirects to checkout
 */

(function () {
  "use strict";

  var APP_URL = "https://cedapay-shopify.onrender.com";
  var BUTTON_ID = "cedapay-pay-button";

  // Only run on cart-related pages
  var path = window.location.pathname;
  var isCartPage = path === "/cart" || path.startsWith("/cart");

  if (!isCartPage) return;

  // Don't inject twice
  if (document.getElementById(BUTTON_ID)) return;

  // Get the shop domain from Shopify global
  var shopDomain = "";
  if (typeof Shopify !== "undefined" && Shopify.shop) {
    shopDomain = Shopify.shop;
  } else {
    shopDomain = window.location.hostname;
  }

  // Check if merchant is configured
  fetch(APP_URL + "/merchant-status/" + encodeURIComponent(shopDomain))
    .then(function (r) { return r.json(); })
    .then(function (status) {
      if (!status.connected || !status.configured) {
        console.log("[CedaPay] Merchant not configured:", shopDomain);
        return;
      }

      injectButton(shopDomain);
    })
    .catch(function (err) {
      console.warn("[CedaPay] Could not check merchant status:", err.message);
    });

  function injectButton(shop) {
    // Find the checkout button container
    var targets = [
      "[name='checkout']",
      ".cart__checkout-button",
      ".cart-checkout-button",
      "[type='submit'][name='checkout']",
      ".cart__ctas",
      ".cart__buttons",
      ".cart-buttons",
      ".cart__submit"
    ];

    var container = null;
    for (var i = 0; i < targets.length; i++) {
      container = document.querySelector(targets[i]);
      if (container) break;
    }

    // Create button
    var btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.type = "button";
    btn.innerHTML = "💳 Pay with CedaPay";
    btn.style.cssText = [
      "display: block",
      "width: 100%",
      "padding: 14px 24px",
      "margin-top: 12px",
      "background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      "color: #ffffff",
      "border: none",
      "border-radius: 8px",
      "font-size: 16px",
      "font-weight: 600",
      "cursor: pointer",
      "letter-spacing: 0.5px",
      "transition: all 0.2s ease",
      "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    ].join(";");

    btn.onmouseover = function () {
      btn.style.background = "linear-gradient(135deg, #16213e 0%, #0f3460 100%)";
      btn.style.transform = "translateY(-1px)";
      btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    };
    btn.onmouseout = function () {
      btn.style.background = "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)";
      btn.style.transform = "translateY(0)";
      btn.style.boxShadow = "none";
    };

    btn.onclick = function () {
      handleCedaPayCheckout(shop, btn);
    };

    // Insert after the checkout button, or at end of container
    if (container) {
      if (container.tagName === "INPUT" || container.tagName === "BUTTON") {
        container.parentNode.insertBefore(btn, container.nextSibling);
      } else {
        container.appendChild(btn);
      }
    } else {
      // Fallback: append to the form or cart section
      var form = document.querySelector("form[action='/cart']") || document.querySelector(".cart");
      if (form) {
        form.appendChild(btn);
      }
    }
  }

  function handleCedaPayCheckout(shop, btn) {
    btn.disabled = true;
    btn.innerHTML = "⏳ Redirecting to CedaPay...";

    // Get cart data from Shopify AJAX API
    fetch("/cart.json")
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var totalPrice = (cart.total_price / 100).toFixed(2);
        var currency = cart.currency || "USD";

        // Get customer info from checkout fields if available
        var emailInput = document.querySelector("[name='checkout[email]']") || document.querySelector("#email");
        var email = emailInput ? emailInput.value : "";

        var payload = {
          shop: shop,
          amount: parseFloat(totalPrice),
          currency: currency,
          customer_email: email,
          customer_name: "",
          order_id: "cart-" + Date.now(),
          items: cart.items.map(function (item) {
            return {
              title: item.title,
              quantity: item.quantity,
              price: (item.price / 100).toFixed(2)
            };
          })
        };

        return fetch(APP_URL + "/shopify/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (result.success && (result.checkout_url || result.cedapay_response?.checkout_url)) {
          window.location.href = result.checkout_url || result.cedapay_response.checkout_url;
        } else {
          alert("Payment setup failed: " + (result.error || "Unknown error"));
          btn.disabled = false;
          btn.innerHTML = "💳 Pay with CedaPay";
        }
      })
      .catch(function (err) {
        console.error("[CedaPay] Checkout error:", err);
        alert("Could not connect to CedaPay. Please try again.");
        btn.disabled = false;
        btn.innerHTML = "💳 Pay with CedaPay";
      });
  }
})();
