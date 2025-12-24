import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the building codes assistant
const SYSTEM_PROMPT = `You are an expert building codes assistant for Cuyahoga County, Ohio. You help real estate investors, developers, and contractors understand building regulations.

Your knowledge includes:
- Building codes for 59 municipalities in Cuyahoga County
- Ohio state building codes
- County-level regulations
- Fire codes, zoning codes, permitting requirements, and more

Guidelines:
1. Always cite specific code sections and provide source URLs
2. Clearly state which municipality's codes you're referencing
3. When a municipality "Adopts Ohio State Code", explain that they follow state regulations
4. Warn users to verify with local building departments before starting projects
5. Note that codes may have been updated since your last training
6. For photo analysis, identify potential code violations or compliance issues
7. Be specific about permit requirements and processes
8. Explain technical terms in plain language

When you don't have specific information, say so clearly and suggest contacting the local building department.`;

// Main chat action - processes user messages with LLM
export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Get conversation and recent messages for context
    const conversation = await ctx.runQuery(
      api.conversations.getConversation,
      {
        conversationId: args.conversationId,
      }
    );

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check user's quota
    const user = await ctx.runQuery(api.users.getUser, {
      userId: conversation.userId,
    });

    if (user.questionsUsed >= user.questionsLimit) {
      throw new Error(
        "Question limit reached. Please upgrade your subscription."
      );
    }

    // Get recent messages for context (last 10)
    const recentMessages = await ctx.runQuery(api.conversations.getMessages, {
      conversationId: args.conversationId,
      limit: 10,
    });

    // Save user message
    const userMessageId = await ctx.runMutation(
      internal.chat.saveMessage,
      {
        conversationId: args.conversationId,
        userId: conversation.userId,
        role: "user",
        content: args.content,
        imageId: args.imageId,
      }
    );

    // Prepare messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add recent conversation history
    for (const msg of recentMessages.reverse()) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user message
    if (args.imageId) {
      // For image analysis, use GPT-4 Vision
      const imageUrl = await ctx.storage.getUrl(args.imageId);
      messages.push({
        role: "user",
        content: [
          { type: "text", text: args.content },
          { type: "image_url", image_url: { url: imageUrl! } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: args.content,
      });
    }

    // Define function tools for the LLM
    const tools: OpenAI.Chat.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "getRegulationsByMunicipality",
          description:
            "Get all building codes and regulations for a specific municipality in Cuyahoga County",
          parameters: {
            type: "object",
            properties: {
              municipalityName: {
                type: "string",
                description:
                  "The name of the municipality (e.g., 'Cleveland', 'Parma', 'Lakewood')",
              },
            },
            required: ["municipalityName"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getRegulation",
          description:
            "Get a specific type of regulation for a municipality",
          parameters: {
            type: "object",
            properties: {
              municipalityName: {
                type: "string",
                description: "The name of the municipality",
              },
              regulationType: {
                type: "string",
                enum: [
                  "building_code",
                  "residential_code",
                  "fire_code",
                  "mechanical_code",
                  "plumbing_code",
                  "electrical_code",
                  "energy_code",
                  "zoning_code",
                  "permitting_information",
                  "property_maintenance_code",
                  "flood_plain_regulations",
                  "demolition_regulations",
                ],
                description: "The type of regulation to retrieve",
              },
            },
            required: ["municipalityName", "regulationType"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "compareRegulations",
          description:
            "Compare a specific regulation type across multiple municipalities",
          parameters: {
            type: "object",
            properties: {
              municipalityNames: {
                type: "array",
                items: { type: "string" },
                description: "Array of municipality names to compare",
              },
              regulationType: {
                type: "string",
                description: "The type of regulation to compare",
              },
            },
            required: ["municipalityNames", "regulationType"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getStateCodes",
          description: "Get Ohio state-level building codes",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
    ];

    // Call OpenAI with function calling
    const model = args.imageId ? "gpt-4-vision-preview" : "gpt-4-turbo-preview";

    let response = await openai.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 2000,
    });

    let assistantMessage = response.choices[0].message;
    const citedRegulations: string[] = [];

    // Handle function calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant message with tool calls to conversation
      messages.push(assistantMessage);

      // Execute each function call
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let functionResult;

        switch (functionName) {
          case "getRegulationsByMunicipality":
            functionResult = await ctx.runQuery(
              api.regulations.getRegulationsByMunicipality,
              functionArgs
            );
            break;
          case "getRegulation":
            functionResult = await ctx.runQuery(
              api.regulations.getRegulation,
              functionArgs
            );
            if (functionResult) {
              citedRegulations.push(functionResult._id);
            }
            break;
          case "compareRegulations":
            functionResult = await ctx.runQuery(
              api.regulations.compareRegulations,
              functionArgs
            );
            break;
          case "getStateCodes":
            functionResult = await ctx.runQuery(
              api.regulations.getStateCodes,
              {}
            );
            break;
          default:
            functionResult = { error: "Unknown function" };
        }

        // Add function result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult),
        });
      }

      // Get next response from OpenAI
      response = await openai.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 2000,
      });

      assistantMessage = response.choices[0].message;
    }

    // Calculate cost and tokens
    const tokenCount =
      response.usage?.total_tokens || 0;
    const cost = calculateCost(model, tokenCount);

    // Save assistant response
    await ctx.runMutation(internal.chat.saveMessage, {
      conversationId: args.conversationId,
      userId: conversation.userId,
      role: "assistant",
      content: assistantMessage.content || "No response generated",
      citedRegulations,
      tokenCount,
      cost,
    });

    // Update user usage
    await ctx.runMutation(internal.users.incrementUsage, {
      userId: conversation.userId,
      tokenCount,
      cost,
    });

    return {
      content: assistantMessage.content,
      citedRegulations,
      tokenCount,
      cost,
    };
  },
});

// Internal mutation to save messages
export const saveMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    imageId: v.optional(v.id("_storage")),
    citedRegulations: v.optional(v.array(v.string())),
    tokenCount: v.optional(v.number()),
    cost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: args.role,
      content: args.content,
      imageId: args.imageId,
      citedRegulations: args.citedRegulations || [],
      tokenCount: args.tokenCount,
      cost: args.cost,
      timestamp: Date.now(),
    });
  },
});

// Helper function to calculate API cost
function calculateCost(model: string, tokens: number): number {
  const costs: Record<string, { input: number; output: number }> = {
    "gpt-4-turbo-preview": { input: 0.01, output: 0.03 }, // per 1K tokens
    "gpt-4-vision-preview": { input: 0.01, output: 0.03 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  };

  const modelCost = costs[model] || costs["gpt-4-turbo-preview"];
  // Simplified: assume 50/50 split between input and output
  return ((tokens / 1000) * (modelCost.input + modelCost.output)) / 2;
}
