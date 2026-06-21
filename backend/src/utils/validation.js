function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  // Standard email format regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePasswordStrength(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password must be a string" };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (!/[!@#$%^&*(),.?\":{}|<>_+\-\[\]\\/;=\`~]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character (e.g. !, @, #, $, %, etc.)" };
  }
  return { valid: true };
}

module.exports = {
  isValidEmail,
  validatePasswordStrength,
};
