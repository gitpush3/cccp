"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export const chatWithPro = action({
  args: {
    clerkId: v.string(),
    question: v.string(),
    jurisdiction: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args): Promise<{ response?: string; error?: string; message?: string }> => {
    if (!openai) {
      return {
        error: "service_unavailable",
        message: "AI service not configured",
      };
    }

    // Check user subscription status and message count
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: args.clerkId,
    });

    const userId = args.clerkId;
    const messageCount = await ctx.runQuery(api.queries.countMessagesByUserId, { userId });

    if (messageCount >= 5 && (!user || user.subscriptionStatus !== "active")) {
      return {
        error: "payment_required",
        message: "Free message limit reached. Pro subscription required for AI assistance",
      };
    }

    // Generate embedding for the question
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: args.question,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Search municipal codes
    const muniCodes: any[] = await ctx.runQuery(api.search.searchMuniCodes, {
      embedding: questionEmbedding,
      jurisdiction: args.jurisdiction,
      limit: 5,
    });

    // Search architect lore
    const architectLore: any[] = await ctx.runQuery(api.search.searchArchitectLore, {
      embedding: questionEmbedding,
      limit: 3,
    });

    // Build context
    const context: string = [
      "Municipal Codes:",
      ...muniCodes.map((code: any) => `${code.category.toUpperCase()}: ${code.text}`),
      "\nVeteran Tips:",
      ...architectLore.map((lore: any) => `${lore.title}: ${lore.tip}`),
    ].join("\n");

    // Generate AI response
    const completion: any = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a veteran architect with 30+ years of experience. You help other architects navigate municipal codes, building regulations, and provide practical advice. Always cite specific codes when relevant and provide actionable guidance.

Context from municipal codes and veteran tips:
${context}`,
        },
        {
          role: "user",
          content: args.question,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response: string = completion.choices[0].message.content || "I couldn't generate a response.";

    // Save messages to chat history
    await ctx.runMutation(api.messages.addMessage, {
      chatId: args.chatId,
      userId: userId,
      role: "user",
      content: args.question,
    });

    await ctx.runMutation(api.messages.addMessage, {
      chatId: args.chatId,
      userId: userId,
      role: "assistant",
      content: response,
    });

    return { response };
  },
});

export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    if (!openai) {
      throw new Error("OpenAI not configured");
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: args.text,
    });

    return response.data[0].embedding;
  },
});
