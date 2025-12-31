import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const createOrUpdateUser = mutation({
  args: {
    email: v.string(),
    clerkId: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        clerkId: args.clerkId || existingUser.clerkId,
        name: args.name || existingUser.name,
        phone: args.phone || existingUser.phone,
        stripeCustomerId: args.stripeCustomerId || existingUser.stripeCustomerId,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      email: args.email,
      clerkId: args.clerkId,
      name: args.name,
      phone: args.phone,
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

export const updateStripeCustomerId = mutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

// Helper to check if current user is admin
async function requireAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email!))
    .unique();

  if (!user || !user.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// Initial setup mutation - only works if no admins exist yet
export const setupInitialAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Check if any admins exist
    const allUsers = await ctx.db.query("users").collect();
    const existingAdmins = allUsers.filter(u => u.isAdmin === true);
    
    if (existingAdmins.length > 0) {
      throw new Error("Initial admin already set. Use addAdmin instead.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      // Create the user if they don't exist
      const userId = await ctx.db.insert("users", {
        email: args.email,
        isAdmin: true,
      });
      return userId;
    }

    await ctx.db.patch(user._id, { isAdmin: true });
    return user._id;
  },
});

// Add admin - requires existing admin
export const addAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      // Create the user if they don't exist
      const userId = await ctx.db.insert("users", {
        email: args.email,
        isAdmin: true,
      });
      return userId;
    }

    if (user.isAdmin) {
      throw new Error("User is already an admin");
    }

    await ctx.db.patch(user._id, { isAdmin: true });
    return user._id;
  },
});

// Remove admin - requires existing admin, can't remove self
export const removeAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const currentAdmin = await requireAdmin(ctx);

    if (currentAdmin.email === args.email) {
      throw new Error("Cannot remove yourself as admin");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isAdmin) {
      throw new Error("User is not an admin");
    }

    await ctx.db.patch(user._id, { isAdmin: false });
  },
});

// List all admins - requires admin
export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!currentUser || !currentUser.isAdmin) {
      return [];
    }

    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter(u => u.isAdmin === true);
  },
});

// Check if current user is admin
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    return user?.isAdmin === true;
  },
});

// Legacy setAdmin - kept for backward compatibility but now protected
export const setAdmin = mutation({
  args: { email: v.string(), isAdmin: v.boolean() },
  handler: async (ctx, args) => {
    // Check if any admins exist - if not, allow initial setup
    const allUsers = await ctx.db.query("users").collect();
    const existingAdmins = allUsers.filter(u => u.isAdmin === true);
    
    if (existingAdmins.length > 0) {
      // Require admin for changes
      await requireAdmin(ctx);
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { isAdmin: args.isAdmin });
  },
});
