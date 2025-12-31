import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAllTrips = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("trips")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getTripById = query({
  args: { tripId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trips")
      .withIndex("by_trip_id", (q) => q.eq("tripId", args.tripId))
      .unique();
  },
});

export const upsertTrip = mutation({
  args: {
    tripId: v.string(),
    tripName: v.string(),
    travelDate: v.string(),
    stripeProductId: v.string(),
    packages: v.array(v.object({
      name: v.string(),
      price: v.number(),
      description: v.string(),
      maxOccupancy: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const existingTrip = await ctx.db
      .query("trips")
      .withIndex("by_trip_id", (q) => q.eq("tripId", args.tripId))
      .unique();

    if (existingTrip) {
      await ctx.db.patch(existingTrip._id, {
        tripName: args.tripName,
        travelDate: args.travelDate,
        stripeProductId: args.stripeProductId,
        packages: args.packages,
        isActive: true,
      });
      return existingTrip._id;
    }

    return await ctx.db.insert("trips", {
      ...args,
      isActive: true,
    });
  },
});
