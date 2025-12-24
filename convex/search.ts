import { query } from "./_generated/server";
import { v } from "convex/values";

export const searchMuniCodes = query({
  args: {
    embedding: v.array(v.number()),
    jurisdiction: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // For now, return a simple text search until vector search is available
    const results = await ctx.db
      .query("muniCodes")
      .withIndex("by_jurisdiction", (q) => q.eq("jurisdiction", args.jurisdiction))
      .take(args.limit || 10);

    return results.map((result: any) => ({
      _id: result._id,
      jurisdiction: result.jurisdiction,
      category: result.category,
      text: result.text,
      _score: 0.8, // Mock score
    }));
  },
});

export const searchArchitectLore = query({
  args: {
    embedding: v.array(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // For now, return all architect lore until vector search is available
    const results = await ctx.db
      .query("architectLore")
      .take(args.limit || 10);

    return results.map((result: any) => ({
      _id: result._id,
      title: result.title,
      tip: result.tip,
      jurisdiction: result.jurisdiction,
      _score: 0.8, // Mock score
    }));
  },
});
