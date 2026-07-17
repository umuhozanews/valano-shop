const ExcelJS = require("exceljs");

const EMERALD = "FF10B981";
const LIGHT_GRAY = "FFF8F9FA";

function styleHeader(ws, headers, rowNum = 1) {
  const row = ws.getRow(rowNum);
  row.values = headers;
  row.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EMERALD } };
  row.height = 20;
  row.alignment = { vertical: "middle" };
}

async function exportToExcel(res, sheets, { shopName } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = shopName || "INZIRA Insights";
  wb.created = new Date();

  for (const { name, headers, rows, totals } of sheets) {
    const ws = wb.addWorksheet(name);
    styleHeader(ws, headers);

    rows.forEach((r, i) => {
      const row = ws.addRow(r);
      if (i % 2 === 0) {
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
      }
      row.height = 18;
    });

    if (totals) {
      const tRow = ws.addRow(totals);
      tRow.font = { bold: true };
      tRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EMERALD } };
      tRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    }

    // Auto width
    ws.columns.forEach((col, i) => {
      const maxLen = Math.max(
        String(headers[i] || "").length,
        ...rows.map((r) => String(r[i] || "").length)
      );
      col.width = Math.min(50, Math.max(10, maxLen + 4));
    });
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=report.xlsx");
  await wb.xlsx.write(res);
  res.end();
}

module.exports = { exportToExcel };
