const bcrypt = require("bcryptjs");

const h1 = bcrypt.hashSync("inzira2024", 10);
const h2 = bcrypt.hashSync("rukundo2007", 10);

console.log("inzira2024 hash:", h1);
console.log("rukundo2007 hash:", h2);

console.log("Check inzira2024:", bcrypt.compareSync("inzira2024", h1));
console.log("Check rukundo2007:", bcrypt.compareSync("rukundo2007", h2));
