/////////////////////////////////////////////////////////////////////////////////////////////////
// DISCOUNT HANDLING (AJAX via /cart/update.js)
/////////////////////////////////////////////////////////////////////////////////////////////////
const CART_UPDATE_URL =
  (window.Shopify && window.Shopify.routes && window.Shopify.routes.root)
    ? window.Shopify.routes.root + 'cart/update.js'
    : '/cart/update.js';

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
      const payload = {
        discount: discountCode,
        attributes: { 'Discount Code': discountCode }
      };

      const data = await postCartUpdate(payload);
      const applied =
        (data.total_discount && Number(data.total_discount) > 0) ||
        (Array.isArray(data.cart_level_discount_applications) &&
          data.cart_level_discount_applications.length > 0) ||
        (Array.isArray(data.items) &&
          data.items.some((it) => Array.isArray(it.discounts) && it.discounts.length > 0));

      if (!applied) {
        alert('Discount not applied — the code may be invalid or not applicable to current cart.');
      }
      window.location.href = '/cart';
    } catch (err) {
      console.error('Error applying discount:', err);
      alert('Failed to apply discount. Try again.');
    }
  });
}

// Remove Discount
const removeDiscountBtns = document.querySelectorAll('.remove-discount-btn');
if (removeDiscountBtns && removeDiscountBtns.length) {
  removeDiscountBtns.forEach((btn) =>
    btn.addEventListener('click', async function (e) {
      e.preventDefault();
      const discountTag = e.target.closest('.discounts__discount');
      if (discountTag) discountTag.remove();

      try {
        await postCartUpdate({
          discount: '',
          attributes: { 'Discount Code': null }
        });
        window.location.href = '/cart';
      } catch (err) {
        console.error('Error removing discount:', err);
        window.location.href = '/cart';
      }
    })
  );
}
