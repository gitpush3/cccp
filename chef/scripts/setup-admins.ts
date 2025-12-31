/**
 * Setup Initial Admins Script
 * 
 * Run this script to set up the initial admin users.
 * This only works if no admins exist yet in the database.
 * 
 * Usage:
 * 1. Make sure your Convex dev server is running
 * 2. Run: npx convex run users:setupInitialAdmin '{"email": "walter.krych@latitudego.com"}'
 * 3. Run: npx convex run users:setAdmin '{"email": "penny.krych@latitudego.com", "isAdmin": true}'
 * 
 * Or use the Convex Dashboard to run these mutations directly.
 */

const INITIAL_ADMINS = [
  "walter.krych@latitudego.com",
  "penny.krych@latitudego.com",
];

console.log("=== LatitudeGo Admin Setup ===");
console.log("");
console.log("To set up initial admins, run these commands:");
console.log("");
console.log("1. Set up the first admin (only works if no admins exist):");
console.log(`   npx convex run users:setupInitialAdmin '{"email": "${INITIAL_ADMINS[0]}"}'`);
console.log("");
console.log("2. Add additional admins (requires being signed in as admin):");
INITIAL_ADMINS.slice(1).forEach((email, i) => {
  console.log(`   npx convex run users:addAdmin '{"email": "${email}"}'`);
});
console.log("");
console.log("Alternatively, use the Convex Dashboard:");
console.log("   https://dashboard.convex.dev");
console.log("");
console.log("Navigate to Functions > users > setupInitialAdmin and run it with:");
console.log(`   { "email": "${INITIAL_ADMINS[0]}" }`);
console.log("");
