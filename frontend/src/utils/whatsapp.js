export function formatWhatsAppPhone(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[^\d+]/g, "");
  if (/^07\d{8}$/.test(cleaned)) {
    cleaned = "250" + cleaned.slice(1);
  }
  return cleaned.replace(/^\+/, "");
}

export function openWhatsAppChat(phone, initialMessage = "") {
  const cleanNum = formatWhatsAppPhone(phone);
  const textParam = initialMessage ? `?text=${encodeURIComponent(initialMessage)}` : "";
  const url = cleanNum ? `https://wa.me/${cleanNum}${textParam}` : `https://wa.me/${textParam}`;
  window.open(url, "_blank");
}

export function sendOrderToWhatsApp({ supplierName, supplierPhone, orderId, orderDate, expectedArrival, items = [], totalAmount, notes }) {
  const cleanPhone = formatWhatsAppPhone(supplierPhone);

  let msg = `🛒 *PURCHASE ORDER — INZIRA INSIGHTS*\n`;
  msg += `===================================\n`;
  if (orderId) msg += `📋 *Order Ref:* #${orderId}\n`;
  if (orderDate) msg += `📅 *Order Date:* ${new Date(orderDate).toLocaleDateString("en-RW")}\n`;
  if (expectedArrival) msg += `🚚 *Expected Arrival:* ${new Date(expectedArrival).toLocaleDateString("en-RW")}\n`;
  msg += `👤 *Supplier:* ${supplierName || 'Valued Supplier'}\n\n`;

  if (items && items.length > 0) {
    msg += `📦 *ORDERED ITEMS:*\n`;
    items.forEach((item, idx) => {
      const qty = item.quantity || item.qty || 1;
      const unit = item.unit || "pcs";
      const name = item.item_name || item.name || `Item #${idx + 1}`;
      const price = item.unit_price || item.unit_cost || 0;
      msg += `  ${idx + 1}. *${name}* — ${qty} ${unit} ${price ? `(${Number(price).toLocaleString()} RWF)` : ''}\n`;
    });
    msg += `\n`;
  }

  if (totalAmount) {
    msg += `💰 *TOTAL AMOUNT:* ${Number(totalAmount).toLocaleString()} RWF\n`;
  }

  if (notes) {
    msg += `📝 *Notes/Instructions:* ${notes}\n`;
  }

  msg += `\nPlease confirm receipt, item availability & dispatch schedule. Thank you!`;

  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
}
