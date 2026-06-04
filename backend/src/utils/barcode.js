const bwipjs = require("bwip-js");

async function generateBarcodeBuffer(text) {
  return bwipjs.toBuffer({
    bcid: "code128",
    text: String(text),
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: "center",
    textsize: 9,
  });
}

async function generateBarcodeDataURL(text) {
  const buf = await generateBarcodeBuffer(text);
  return "data:image/png;base64," + buf.toString("base64");
}

module.exports = { generateBarcodeBuffer, generateBarcodeDataURL };
