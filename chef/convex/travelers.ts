import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTravelersByBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      return [];
    }

    // Verify user owns this booking
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) {
      return [];
    }

    return await ctx.db
      .query("travelers")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();
  },
});

export const addTraveler = mutation({
  args: {
    bookingId: v.id("bookings"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    passport: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user owns this booking
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) {
      throw new Error("Booking not found");
    }

    // Check occupancy limit
    const existingTravelers = await ctx.db
      .query("travelers")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    if (existingTravelers.length >= booking.occupancy) {
      throw new Error("Maximum occupancy reached");
    }

    return await ctx.db.insert("travelers", {
      bookingId: args.bookingId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      passport: args.passport,
      dateOfBirth: args.dateOfBirth,
    });
  },
});

export const updateTraveler = mutation({
  args: {
    travelerId: v.id("travelers"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    passport: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const traveler = await ctx.db.get(args.travelerId);
    if (!traveler) {
      throw new Error("Traveler not found");
    }

    // Verify user owns the booking
    const booking = await ctx.db.get(traveler.bookingId);
    if (!booking || booking.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.travelerId, {
      name: args.name,
      email: args.email,
      phone: args.phone,
      passport: args.passport,
      dateOfBirth: args.dateOfBirth,
    });
  },
});

export const deleteTraveler = mutation({
  args: { travelerId: v.id("travelers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const traveler = await ctx.db.get(args.travelerId);
    if (!traveler) {
      throw new Error("Traveler not found");
    }

    // Verify user owns the booking
    const booking = await ctx.db.get(traveler.bookingId);
    if (!booking || booking.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.travelerId);
  },
});
