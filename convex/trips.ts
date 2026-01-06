import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const listPublishedTrips = query({
  args: {},
  handler: async (ctx) => {
    const trips = await ctx.db
      .query("trips")
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Fetch packages for each trip
    const tripsWithPackages = await Promise.all(
      trips.map(async (trip) => {
        const packages = await ctx.db
          .query("packages")
          .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        // Get image URL if exists
        let imageUrl: string | null = null;
        if (trip.heroImageStorageId) {
          imageUrl = await ctx.storage.getUrl(trip.heroImageStorageId);
        } else if (trip.heroImageUrl) {
          imageUrl = trip.heroImageUrl;
        }

        return {
          ...trip,
          imageUrl,
          packages,
        };
      })
    );

    return tripsWithPackages;
  },
});

export const getTripBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const trip = await ctx.db
      .query("trips")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!trip) return null;

    const packages = await ctx.db
      .query("packages")
      .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    let imageUrl: string | null = null;
    if (trip.heroImageStorageId) {
      imageUrl = await ctx.storage.getUrl(trip.heroImageStorageId);
    } else if (trip.heroImageUrl) {
      imageUrl = trip.heroImageUrl;
    }

    return {
      ...trip,
      imageUrl,
      packages,
    };
  },
});

export const getPackageById = query({
  args: { packageId: v.id("packages") },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) return null;

    const trip = await ctx.db.get(pkg.tripId);
    return { ...pkg, trip };
  },
});

export const createTrip = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    cutoffDate: v.string(),
    template: v.optional(v.union(v.literal("1"), v.literal("2"), v.literal("3"))),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("completed"), v.literal("cancelled"))),
    // Hero section
    heroImageUrl: v.optional(v.string()),
    heroTagline: v.optional(v.string()),
    // Gallery
    galleryImages: v.optional(v.array(v.string())),
    // Itinerary
    itinerary: v.optional(v.array(v.object({
      day: v.number(),
      title: v.string(),
      description: v.string(),
      imageUrl: v.optional(v.string()),
    }))),
    // Highlights/Features
    highlights: v.optional(v.array(v.string())),
    // Included/Excluded
    included: v.optional(v.array(v.string())),
    excluded: v.optional(v.array(v.string())),
    // Location info
    destination: v.optional(v.string()),
    meetingPoint: v.optional(v.string()),
    // Additional content
    longDescription: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    // Legacy
    wpId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tripId = await ctx.db.insert("trips", {
      title: args.title,
      slug: args.slug,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      cutoffDate: args.cutoffDate,
      template: args.template || "1",
      status: args.status || "draft",
      heroImageUrl: args.heroImageUrl,
      heroTagline: args.heroTagline,
      galleryImages: args.galleryImages,
      itinerary: args.itinerary,
      highlights: args.highlights,
      included: args.included,
      excluded: args.excluded,
      destination: args.destination,
      meetingPoint: args.meetingPoint,
      longDescription: args.longDescription,
      videoUrl: args.videoUrl,
      wpId: args.wpId,
    });
    return tripId;
  },
});

export const createPackage = mutation({
  args: {
    tripId: v.id("trips"),
    title: v.string(),
    price: v.number(),
    depositAmount: v.number(),
    description: v.optional(v.string()),
    maxSeats: v.optional(v.number()),
    inventory: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const packageId = await ctx.db.insert("packages", {
      tripId: args.tripId,
      title: args.title,
      price: args.price,
      depositAmount: args.depositAmount,
      description: args.description,
      maxSeats: args.maxSeats,
      inventory: args.inventory,
      status: "active",
    });
    return packageId;
  },
});

export const updateTripStatus = mutation({
  args: {
    tripId: v.id("trips"),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("completed"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tripId, { status: args.status });
  },
});
