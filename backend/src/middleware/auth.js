const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

const ROLE_HIERARCHY = {
  pulse_admin: 6,
  admin: 5,
  sme_owner: 5,
  manager: 4,
  accountant: 3,
  cashier: 2,
  databridge_advisor: 2,
  lender: 2,
  worker: 2,
  viewer: 1,
};

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided", code: "UNAUTHORIZED" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token", code: "INVALID_TOKEN" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated", code: "UNAUTHORIZED" });
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const isAllowed = roles.some(r => userLevel >= (ROLE_HIERARCHY[r] || 0));
    if (!isAllowed) {
      return res.status(403).json({ error: "Insufficient permissions", code: "FORBIDDEN" });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
