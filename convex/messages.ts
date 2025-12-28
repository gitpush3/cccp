import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getChatMessages = query({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    return Promise.all(
      messages.map(async (message) => ({
        ...message,
        imageUrl: message.imageStorageId
          ? await ctx.storage.getUrl(message.imageStorageId)
          : null,
      }))
    );
  },
});

export const addMessage = mutation({
  args: {
    chatId: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    isAnonymous: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      chatId: args.chatId,
      userId: args.userId,
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      imageStorageId: args.imageStorageId,
      isAnonymous: args.isAnonymous,
    });
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
