import { query } from "./_generated/server";
import { v } from "convex/values";

export const countMessagesByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").withIndex("by_user_id", (q) => q.eq("userId", args.userId)).collect();
    return messages.length;
  },
});
