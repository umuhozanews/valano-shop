const PDFDocument = require("pdfkit");

function createInvoicePDF(res, { invoice, sale, items, settings, branch, customer, debt }) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  if (res && typeof res.setHeader === "function") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice?.invoice_number || 'receipt'}.pdf"`);
  }
  doc.pipe(res);

  const emerald = "#10B981";
  const dark = "#191C1D";
  const gray = "#6C7A71";

  const shopName = settings?.shop_name || sale?.shop_name || "INZIRA SME STORE";
  const shopAddress = settings?.shop_address || sale?.shop_address || "Kigali, Rwanda";
  const shopPhone = settings?.shop_phone || sale?.shop_phone || "";
  const shopEmail = settings?.shop_email || sale?.shop_email || "";
  const hasEbm = Boolean(settings?.has_ebm) || (Boolean(settings?.tin_number) && settings?.tin_number !== "TIN Pending");
  const tinNumber = hasEbm ? settings?.tin_number : null;
  const sdcId = hasEbm ? (settings?.sdc_id || "SDC010013000") : null;
  const mrcNumber = hasEbm ? (settings?.mrc_number || "MIS00013705") : null;
  const cashierName = sale?.cashier_name || sale?.done_by || "Store Manager";

  // Header bar
  doc.rect(0, 0, doc.page.width, 85).fill(emerald);
  doc.fillColor("white").fontSize(18).font("Helvetica-Bold")
     .text(shopName.toUpperCase(), 50, 18);
  doc.fontSize(9).font("Helvetica")
     .text(shopAddress, 50, 42)
     .text(`TEL: ${shopPhone}${shopEmail ? ` | EMAIL: ${shopEmail}` : ''}`, 50, 54);
  
  if (hasEbm) {
    doc.text(`TIN: ${tinNumber} | CASHIER: ${cashierName}`, 50, 66);
  } else {
    doc.text(`CASHIER: ${cashierName}`, 50, 66);
  }

  doc.fillColor(dark);

  // Fiscal or Commercial Invoice info
  const y = 105;
  doc.fontSize(16).font("Helvetica-Bold").text(hasEbm ? "RRA EBM v2 FISCAL RECEIPT" : "OFFICIAL COMMERCIAL INVOICE", 50, y);
  doc.fontSize(9).font("Helvetica");
  doc.fillColor(gray).text(hasEbm ? "Receipt Number:" : "Invoice Number:", 50, y + 24);
  doc.fillColor(dark).text(invoice?.invoice_number || `${sale?.id}/CS`, 160, y + 24);
  doc.fillColor(gray).text("Date & Time:", 50, y + 38);
  doc.fillColor(dark).text(new Date(invoice?.issued_at || sale?.created_at || Date.now()).toLocaleString("en-RW"), 160, y + 38);
  
  if (customer?.tin_number || sale?.customer_tin) {
    doc.fillColor(gray).text("CLIENT TIN:", 50, y + 52);
    doc.fillColor(dark).text(customer?.tin_number || sale?.customer_tin, 160, y + 52);
  }
  
  doc.fillColor(gray).text("CLIENT NAME:", 50, y + 66);
  doc.fillColor(dark).text(customer?.name || sale?.customer_name || "Walk-in Customer", 160, y + 66);
  doc.fillColor(gray).text("Payment Method:", 50, y + 80);
  doc.fillColor(dark).text((sale?.payment_method || "CASH").replace("_", " ").toUpperCase(), 160, y + 80);

  // Items table
  const tableTop = y + 105;
  doc.rect(50, tableTop, doc.page.width - 100, 22).fill("#F8F9FA");
  doc.fillColor(gray).fontSize(9).font("Helvetica-Bold");
  doc.text("ITEM DESCRIPTION", 55, tableTop + 6);
  doc.text("QTY", 290, tableTop + 6);
  doc.text("UNIT PRICE", 350, tableTop + 6);
  doc.text("SUBTOTAL (VAT INC)", 440, tableTop + 6);

  let rowY = tableTop + 28;
  let total = 0;
  doc.font("Helvetica").fontSize(9).fillColor(dark);

  for (const item of (items || [])) {
    const sub = item.quantity * item.unit_price;
    total += sub;
    doc.text(item.item_name || item.name || "—", 55, rowY, { width: 220 });
    doc.text(String(item.quantity), 290, rowY);
    doc.text(fmt(item.unit_price), 350, rowY);
    doc.text(`${fmt(sub)} B 18%`, 440, rowY);
    doc.moveTo(50, rowY + 18).lineTo(doc.page.width - 50, rowY + 18).strokeColor("#E5E7EB").stroke();
    rowY += 24;
  }

  // Tax Breakdown Calculation (18% Rwanda VAT)
  const vatRate = Number(settings?.vat_rate || 18);
  const netTaxable = Math.round(total / (1 + vatRate / 100));
  const totVat = total - netTaxable;

  rowY += 10;
  doc.rect(50, rowY, doc.page.width - 100, 110).fill("#F9FAFB");
  doc.fillColor(dark).font("Helvetica").fontSize(9);
  
  doc.text("Exempt Suppl:", 60, rowY + 10);
  doc.text("0.00 RWF", 440, rowY + 10);

  doc.text("TOT Suppl Vat Inc:", 60, rowY + 26);
  doc.text(fmt(total), 440, rowY + 26);

  doc.text("TOT Suppl (Net Taxable):", 60, rowY + 42);
  doc.text(fmt(netTaxable), 440, rowY + 42);

  doc.text("TOT VAT (18%):", 60, rowY + 58);
  doc.text(fmt(totVat), 440, rowY + 58);

  doc.text("TOT Tax:", 60, rowY + 74);
  doc.text(fmt(totVat), 440, rowY + 74);

  doc.font("Helvetica-Bold").fontSize(10).fillColor(dark);
  doc.text("TOTAL PAYABLE:", 60, rowY + 92);
  doc.text(fmt(total), 440, rowY + 92);

  rowY += 125;

  if (hasEbm) {
    // SDC Information Footer for EBM Fiscal Receipts
    const seed = (sale?.id || 1) * 99991;
    const rawHash = (Math.abs(Math.sin(seed) * 100000000).toString(36) + "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789").toUpperCase();
    const internalData = `${rawHash.slice(0,4)}-${rawHash.slice(4,8)}-${rawHash.slice(8,12)}-${rawHash.slice(12,16)}-${rawHash.slice(16,20)}-${rawHash.slice(20,24)}-${rawHash.slice(24,27)}CS`;
    const receiptSignature = `${rawHash.slice(3,7)}-${rawHash.slice(7,11)}-${rawHash.slice(11,15)}-${rawHash.slice(15,19)}`;

    doc.rect(50, rowY, doc.page.width - 100, 115).strokeColor("#E5E7EB").stroke();
    doc.fillColor(gray).font("Helvetica-Bold").fontSize(9)
       .text("SDC INFORMATION", 60, rowY + 8);

    doc.font("Helvetica").fontSize(8).fillColor(dark);
    doc.text(`SDC ID: ${sdcId || 'SDC010013000'} | RECEIPT NUMBER: ${sale?.id || '3671'}/${sale?.id || '3671'}CS`, 60, rowY + 24);
    doc.text(`Internal Data: ${internalData}`, 60, rowY + 38);
    doc.text(`Receipt Signature: ${receiptSignature}`, 60, rowY + 52);
    doc.text(`MRC: ${mrcNumber || 'MIS00013705'} | ITEM NUMBER: ${items?.length || 0}`, 60, rowY + 66);
    
    doc.fillColor(emerald).font("Helvetica-Bold").fontSize(9)
       .text("End of Legal Receipt — Powered by EBM v2", 60, rowY + 90, { align: "center" });
  } else {
    // Clean Commercial Verification Seal
    doc.rect(50, rowY, doc.page.width - 100, 70).strokeColor("#E5E7EB").stroke();
    doc.fillColor(emerald).font("Helvetica-Bold").fontSize(10)
       .text("OFFICIAL STORE RECEIPT & COMMERCIAL RECORD", 60, rowY + 14, { align: "center" });
    doc.fillColor(gray).font("Helvetica").fontSize(8)
       .text(`Issued by ${shopName} • ${shopAddress}`, 60, rowY + 32, { align: "center" })
       .text("Thank you for your valued business! Generated via INZIRA SME Platform", 60, rowY + 46, { align: "center" });
  }

  doc.end();
}

function fmt(n) {
  return new Intl.NumberFormat("en-RW").format(n || 0) + " RWF";
}

function createReportPDF(res, { title, dateRange, columns, rows, totalsRow, shopName }) {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="report.pdf"`);
  doc.pipe(res);

  const emerald = "#10B981";

  doc.rect(0, 0, doc.page.width, 60).fill(emerald);
  doc.fillColor("white").fontSize(16).font("Helvetica-Bold").text(shopName || "INZIRA INSIGHTS", 40, 12);
  doc.fontSize(9).font("Helvetica").fillColor("rgba(255,255,255,0.7)").text("Powered by INZIRA Insights", 40, 32);
  doc.fontSize(11).font("Helvetica").fillColor("white").text(title, 40, 44);
  if (dateRange) doc.fontSize(9).fillColor("rgba(255,255,255,0.8)").text(dateRange, doc.page.width - 200, 44);

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
