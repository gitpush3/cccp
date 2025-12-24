import { query } from "./_generated/server";
import { v } from "convex/values";

export const getContactsByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();
  },
});

export const getAllCities = query({
  handler: async (ctx) => {
    const contacts = await ctx.db.query("contacts").collect();
    const cities = [...new Set(contacts.map(contact => contact.city))];
    return cities.sort();
  },
});
