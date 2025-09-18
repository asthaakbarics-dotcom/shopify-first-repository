/////////////////////////////////////////////////////////////////////////////////////////////////
// DISCOUNT HANDLING (AJAX via /cart/update.js)
/////////////////////////////////////////////////////////////////////////////////////////////////

// Helper: cart update URL (locale-aware if available)
const CART_UPDATE_URL =
  (window.Shopify && window.Shopify.routes && window.Shopify.routes.root)
    ? window.Shopify.routes.root + 'cart/update.js'
    : '/cart/update.js';

// Helper: POST JSON to cart/update.js and return parsed JSON or throw
async function postCartUpdate(payload) {
  const res = await fetch(CART_UPDATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify(payload)
  });

  // If non-OK, try to parse json/text for debugging
  if (!res.ok) {
    let text;
    try { text = await res.text(); } catch (e) { text = String(e); }
    throw new Error('Cart update failed: ' + text);
  }

  return res.json();
}

// Apply Discount (AJAX)
const applyBtn = document.querySelector('#apply-discount');
if (applyBtn) {
  applyBtn.addEventListener('click', async function (e) {
    e.preventDefault();

    const discountInput = document.querySelector('input[name="discount"]');
    const discountCode = discountInput ? discountInput.value.trim() : '';

    if (!discountCode) {
      alert('Please enter a discount code.');
      return;
    }

    try {
      // Send discount via /cart/update.js (and optionally save to attributes for display)
      const payload = {
        discount: discountCode,
        attributes: { 'Discount Code': discountCode }
      };

      const data = await postCartUpdate(payload);

      // Heuristic to check whether a discount was applied:
      // (total_discount > 0) OR cart-level discount applications OR individual line discounts
      const applied =
        (data.total_discount && Number(data.total_discount) > 0) ||
        (Array.isArray(data.cart_level_discount_applications) &&
          data.cart_level_discount_applications.length > 0) ||
        (Array.isArray(data.items) &&
          data.items.some((it) => Array.isArray(it.discounts) && it.discounts.length > 0));

      if (!applied) {
        // Could be invalid, or it could be valid but not affect current cart (min requirements, etc.)
        // Inform the user — you can replace with nicer UI handling.
        alert('Discount not applied — the code may be invalid or not applicable to current cart.');
      }

      // Reload so templates and sections reflect new cart totals and discount line items
      window.location.href = '/cart';
    } catch (err) {
      console.error('Error applying discount:', err);
      alert('Failed to apply discount. Try again.');
    }
  });
}

// Remove Discount (AJAX)
const removeDiscountBtns = document.querySelectorAll('.remove-discount-btn');
if (removeDiscountBtns && removeDiscountBtns.length) {
  removeDiscountBtns.forEach((btn) =>
    btn.addEventListener('click', async function (e) {
      e.preventDefault();

      // Optimistic UI removal (if you render a tag)
      const discountTag = e.target.closest('.discounts__discount');
      if (discountTag) discountTag.remove();

      try {
        // Use the AJAX cart update with an empty string to remove all discounts,
        // and clear the optional cart attribute we use for display
        await postCartUpdate({
          discount: '', // <-- this removes discounts per Shopify Cart API
          attributes: { 'Discount Code': null }
        });

        // Reload to show cart with discount removed
        window.location.href = '/cart';
      } catch (err) {
        console.error('Error removing discount:', err);
        // Fallback: reload to show whatever state the server has
        window.location.href = '/cart';
      }
    })
  );
}
