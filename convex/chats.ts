import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all chats for a user, sorted by most recent
export const getUserChats = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .order("desc")
      .take(50);
    return chats;
  },
});

// Get or create a chat session
export const getOrCreateChat = mutation({
  args: {
    chatId: v.string(),
    clerkId: v.string(),
    city: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if chat already exists
    const existing = await ctx.db
      .query("chats")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();

    if (existing) {
      // Update the timestamp and city if changed
      await ctx.db.patch(existing._id, {
        updatedAt: Date.now(),
        city: args.city || existing.city,
      });
      return existing;
    }

    // Create new chat
    const now = Date.now();
    const chatDoc = await ctx.db.insert("chats", {
      chatId: args.chatId,
      clerkId: args.clerkId,
      title: args.city ? `Chat - ${args.city}` : "New Chat",
      city: args.city,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(chatDoc);
  },
});

// Update chat title (auto-generated from first message)
export const updateChatTitle = mutation({
  args: {
    chatId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();

    if (chat) {
      await ctx.db.patch(chat._id, {
        title: args.title,
        updatedAt: Date.now(),
      });
    }
  },
});

// Delete a chat and its messages
export const deleteChat = mutation({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    // Delete the chat
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();

    if (chat) {
      await ctx.db.delete(chat._id);
    }

    // Delete all messages for this chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
  },
});
