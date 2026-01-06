// Run with: node set-admin.cjs
const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient("https://tremendous-giraffe-716.convex.cloud");

async function setAdmin() {
  try {
    // First create/update the user with the Clerk ID
    const userId = await client.mutation("users:createOrUpdateUser", {
      email: "walter.krych@latitudego.com",
      clerkId: "user_37d3G3hySnTTBWgUXIsGCYfD43S",
      name: "Walter Krych"
    });
    console.log("User created/updated:", userId);

    // Then set as admin
    const result = await client.mutation("users:setAdminByClerkId", {
      clerkId: "user_37d3G3hySnTTBWgUXIsGCYfD43S"
    });
    console.log("Admin set successfully:", result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

setAdmin();
