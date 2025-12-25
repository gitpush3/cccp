import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Search code content by text
export const searchContent = query({
  args: {
    searchText: v.string(),
    municipality: v.optional(v.string()),
    codeType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    let query = ctx.db
      .query("codeContent")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.searchText);
        if (args.municipality) {
          search = search.eq("municipality", args.municipality);
        }
        if (args.codeType) {
          search = search.eq("codeType", args.codeType);
        }
        return search;
      });
    
    return await query.take(limit);
  },
});

// Search code content by title
export const searchByTitle = query({
  args: {
    searchText: v.string(),
    municipality: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    let query = ctx.db
      .query("codeContent")
      .withSearchIndex("search_title", (q) => {
        let search = q.search("title", args.searchText);
        if (args.municipality) {
          search = search.eq("municipality", args.municipality);
        }
        return search;
      });
    
    return await query.take(limit);
  },
});

// Get all code content for a municipality
export const getByMunicipality = query({
  args: {
    municipality: v.string(),
    codeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.codeType) {
      const codeType = args.codeType;
      return await ctx.db
        .query("codeContent")
        .withIndex("by_municipality_and_type", (q) => 
          q.eq("municipality", args.municipality).eq("codeType", codeType)
        )
        .collect();
    }
    
    return await ctx.db
      .query("codeContent")
      .withIndex("by_municipality", (q) => q.eq("municipality", args.municipality))
      .collect();
  },
});

// Get code content by type across all municipalities
export const getByCodeType = query({
  args: {
    codeType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    return await ctx.db
      .query("codeContent")
      .withIndex("by_code_type", (q) => q.eq("codeType", args.codeType))
      .take(limit);
  },
});

// Get investor guides
export const getInvestorGuides = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("codeContent")
      .withIndex("by_code_type", (q) => q.eq("codeType", "investor-guide"))
      .collect();
  },
});

// Get all code content (for debugging/admin)
export const getAll = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db.query("codeContent").take(limit);
  },
});

// Insert code content (for import script)
export const insert = mutation({
  args: {
    municipality: v.string(),
    codeType: v.string(),
    section: v.string(),
    title: v.string(),
    content: v.string(),
    summary: v.optional(v.string()),
    investorNotes: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    lastUpdated: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("codeContent", args);
  },
});

// Clear all code content (for re-import)
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("codeContent").collect();
    for (const doc of all) {
      await ctx.db.delete(doc._id);
    }
    return { deleted: all.length };
  },
});

// Get count of code content entries
export const getCount = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("codeContent").collect();
    return { count: all.length };
  },
});
