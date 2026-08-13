const bcrypt = require("bcryptjs");

// Mock duplicate checks logic for verification
function checkDuplicates(existingUsers, normalizedEmail, rawPhone) {
  const cleanPhoneDigits = rawPhone.replace(/\D/g, "");
  const last9PhoneDigits = cleanPhoneDigits.length >= 9 ? cleanPhoneDigits.slice(-9) : cleanPhoneDigits;
  const phoneFallbackEmail = cleanPhoneDigits ? `${cleanPhoneDigits}@inzira.rw` : "";
  const last9FallbackEmail = last9PhoneDigits ? `${last9PhoneDigits}@inzira.rw` : "";

  const matchingUsers = existingUsers.filter(u => {
    const uEmail = (u.email || "").toLowerCase();
    const uDigits = (u.phone || "").replace(/\D/g, "");
    const uLast9 = uDigits.length >= 9 ? uDigits.slice(-9) : uDigits;

    return uEmail === normalizedEmail
      || (u.phone && u.phone === rawPhone)
      || (last9PhoneDigits && uLast9 === last9PhoneDigits)
      || (phoneFallbackEmail && uEmail === phoneFallbackEmail)
      || (last9FallbackEmail && uEmail === last9FallbackEmail);
  });

  if (matchingUsers.length > 0) {
    const emailMatches = matchingUsers.some(u => u.email && u.email.toLowerCase() === normalizedEmail);
    const phoneMatches = rawPhone && matchingUsers.some(u => {
      const uDigits = (u.phone || "").replace(/\D/g, "");
      const uLast9 = uDigits.length >= 9 ? uDigits.slice(-9) : uDigits;
      return (u.phone && u.phone === rawPhone) || (last9PhoneDigits && uLast9 === last9PhoneDigits);
    });

    if (emailMatches && phoneMatches) {
      return { status: 409, code: "ACCOUNT_EXISTS", error: "An account with this email address and phone number is already registered. Please log in." };
    }
    if (emailMatches) {
      return { status: 409, code: "EMAIL_EXISTS", error: "This email address is already registered. Please log in or use a different email." };
    }
    if (phoneMatches) {
      return { status: 409, code: "PHONE_EXISTS", error: "This phone number is already registered to an account. Please log in with your phone number." };
    }
    return { status: 409, code: "ACCOUNT_EXISTS", error: "An account with this email or phone is already registered. Please log in." };
  }

  return { status: 200, ok: true };
}

const mockDbUsers = [
  { id: 1, email: "creator@inzira.rw", phone: "+250780000000" },
  { id: 2, email: "boygatete@gmail.com", phone: "+250 788 123 456" },
  { id: 3, email: "788999000@inzira.rw", phone: "0788999000" }
];

console.log("--- Test 1: Duplicate Email ---");
console.log(checkDuplicates(mockDbUsers, "boygatete@gmail.com", "+250788999111"));

console.log("\n--- Test 2: Duplicate Phone (different format: 0788123456 vs +250 788 123 456) ---");
console.log(checkDuplicates(mockDbUsers, "newuser@gmail.com", "0788123456"));

console.log("\n--- Test 3: Duplicate Email AND Phone ---");
console.log(checkDuplicates(mockDbUsers, "boygatete@gmail.com", "+250 788 123 456"));

console.log("\n--- Test 4: Completely New User ---");
console.log(checkDuplicates(mockDbUsers, "freshmerchant@gmail.com", "+250 781 222 333"));
