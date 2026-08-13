require("dotenv").config();

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  const errMsg = "FATAL: JWT_SECRET and JWT_REFRESH_SECRET environment variables must be set. Refusing to start server with missing or default JWT secrets.";
  console.error(`[ENV FATAL ERROR] ${errMsg}`);
  throw new Error(errMsg);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

module.exports = {
  DATABASE_URL,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
};
