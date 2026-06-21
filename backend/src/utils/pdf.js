const PDFDocument = require("pdfkit");

function createInvoicePDF(res, { invoice, sale, items, settings, branch, customer, debt }) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoice_number}.pdf"`);
  doc.pipe(res);

  const emerald = "#10B981";
  const dark = "#191C1D";
  const gray = "#6C7A71";

  // Header bar
  doc.rect(0, 0, doc.page.width, 80).fill(emerald);
  doc.fillColor("white").fontSize(22).font("Helvetica-Bold")
     .text(settings?.shop_name || "VALANO SHOP", 50, 25);
  doc.fontSize(10).font("Helvetica")
     .text(settings?.shop_address || "Kigali, Rwanda", 50, 52)
     .text(settings?.shop_phone || "", 50, 64);

  doc.fillColor(dark);

  // Invoice info
  doc.moveDown(4);
  const y = 100;
  doc.fontSize(18).font("Helvetica-Bold").text("INVOICE", 50, y);
  doc.fontSize(10).font("Helvetica");
  doc.fillColor(gray).text("Invoice Number:", 50, y + 28);
  doc.fillColor(dark).text(invoice.invoice_number, 160, y + 28);
  doc.fillColor(gray).text("Date:", 50, y + 44);
  doc.fillColor(dark).text(new Date(invoice.issued_at).toLocaleDateString("en-RW"), 160, y + 44);
  doc.fillColor(gray).text("Branch:", 50, y + 60);
  doc.fillColor(dark).text(branch?.name || "—", 160, y + 60);
  doc.fillColor(gray).text("Customer:", 50, y + 76);
  doc.fillColor(dark).text(customer?.name || "Walk-in", 160, y + 76);
  doc.fillColor(gray).text("Payment:", 50, y + 92);
  doc.fillColor(dark).text((sale.payment_method || "").replace("_", " ").toUpperCase(), 160, y + 92);

  // Items table
  const tableTop = y + 120;
  doc.rect(50, tableTop, doc.page.width - 100, 22).fill("#F8F9FA");
  doc.fillColor(gray).fontSize(9).font("Helvetica-Bold");
  doc.text("ITEM", 55, tableTop + 6);
  doc.text("QTY", 310, tableTop + 6);
  doc.text("UNIT PRICE", 370, tableTop + 6);
  doc.text("SUBTOTAL", 460, tableTop + 6);

  let rowY = tableTop + 28;
  let total = 0;
  doc.font("Helvetica").fontSize(9).fillColor(dark);

  for (const item of items) {
    const sub = item.quantity * item.unit_price;
    total += sub;
    doc.text(item.item_name || item.name || "—", 55, rowY, { width: 240 });
    doc.text(String(item.quantity), 310, rowY);
    doc.text(fmt(item.unit_price), 370, rowY);
    doc.text(fmt(sub), 460, rowY);
    doc.moveTo(50, rowY + 18).lineTo(doc.page.width - 50, rowY + 18).strokeColor("#E5E7EB").stroke();
    rowY += 24;
  }

  // Total
  rowY += 8;
  const remainingAmount = debt && debt.status === 'pending' ? parseFloat(debt.amount) : 0;
  const paidAmount = debt ? (debt.status === 'paid' ? total : total - remainingAmount) : total;

  if (remainingAmount > 0) {
    doc.rect(50, rowY, doc.page.width - 100, 72).fill("#F3F4F6");
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(10);
    doc.text("TOTAL AMOUNT:", 55, rowY + 8);
    doc.text(fmt(total), 460, rowY + 8);

    doc.font("Helvetica").fontSize(10);
    doc.text("AMOUNT PAID:", 55, rowY + 28);
    doc.text(fmt(paidAmount), 460, rowY + 28);

    doc.fillColor("#EF4444").font("Helvetica-Bold");
    doc.text("BALANCE DUE:", 55, rowY + 48);
    doc.text(fmt(remainingAmount), 460, rowY + 48);

    if (debt.due_date) {
      doc.fillColor(gray).font("Helvetica").fontSize(9);
      doc.text(`Due Date: ${new Date(debt.due_date).toLocaleDateString("en-RW")}`, 55, rowY + 68);
      rowY += 20;
    }
    rowY += 72;
  } else {
    doc.rect(50, rowY, doc.page.width - 100, 28).fill(emerald);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(11)
       .text("TOTAL PAID", 55, rowY + 8)
       .text(fmt(total), 460, rowY + 8);
    rowY += 28;
  }

  // Footer
  doc.fillColor(gray).font("Helvetica").fontSize(9)
     .text(settings?.invoice_footer_text || "Thank you for your business!", 50, rowY + 50, { align: "center" });

  doc.end();
}

function fmt(n) {
  return new Intl.NumberFormat("en-RW").format(n || 0) + " RWF";
}

function createReportPDF(res, { title, dateRange, columns, rows, totalsRow }) {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="report.pdf"`);
  doc.pipe(res);

  const emerald = "#10B981";

  doc.rect(0, 0, doc.page.width, 60).fill(emerald);
  doc.fillColor("white").fontSize(16).font("Helvetica-Bold").text("VALANO SHOP", 40, 12);
  doc.fontSize(11).font("Helvetica").text(title, 40, 32);
  if (dateRange) doc.fontSize(9).text(dateRange, 40, 46);

  let y = 75;
  const colW = Math.floor((doc.page.width - 80) / columns.length);

  // Header row
  doc.rect(40, y, doc.page.width - 80, 18).fill("#F8F9FA");
  doc.fillColor("#6C7A71").fontSize(8).font("Helvetica-Bold");
  columns.forEach((col, i) => doc.text(col.toUpperCase(), 44 + i * colW, y + 5, { width: colW - 4 }));
  y += 22;

  doc.font("Helvetica").fontSize(8).fillColor("#191C1D");
  for (const row of rows) {
    if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
    row.forEach((cell, i) => doc.text(String(cell ?? "—"), 44 + i * colW, y, { width: colW - 4 }));
    doc.moveTo(40, y + 14).lineTo(doc.page.width - 40, y + 14).strokeColor("#E5E7EB").stroke();
    y += 18;
  }

  if (totalsRow) {
    doc.rect(40, y + 4, doc.page.width - 80, 18).fill(emerald);
    doc.fillColor("white").font("Helvetica-Bold");
    totalsRow.forEach((cell, i) => doc.text(String(cell ?? ""), 44 + i * colW, y + 9, { width: colW - 4 }));
  }

  doc.end();
}

module.exports = { createInvoicePDF, createReportPDF };
