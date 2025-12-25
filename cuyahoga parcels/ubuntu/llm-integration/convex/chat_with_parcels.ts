import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    message: v.string(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Get conversation and selected municipality
    const conversation = await ctx.runQuery(api.conversations.get, {
      id: args.conversationId,
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const municipality = conversation.selectedMunicipalityId
      ? await ctx.runQuery(api.municipalities.get, {
          id: conversation.selectedMunicipalityId,
        })
      : null;

    // Get conversation history
    const history = await ctx.runQuery(api.messages.list, {
      conversationId: args.conversationId,
    });

    // Build system prompt with context
    const systemPrompt = `You are an expert assistant for real estate investors, developers, and fix-and-flip professionals in Cuyahoga County, Ohio.

${
  municipality
    ? `The user is currently focused on ${municipality.name}, ${municipality.state}.`
    : "The user has not selected a specific municipality yet."
}

You have access to the following information:
1. Building codes, fire codes, zoning regulations, and permitting requirements for all municipalities in Cuyahoga County
2. Complete property data for every parcel in Cuyahoga County (~520,000 parcels) including:
   - Property characteristics (size, bedrooms, bathrooms, year built, etc.)
   - Ownership information
   - Sales history and prices
   - Tax assessments and valuations
   - Land use codes
3. Market data and trends by zip code

When answering questions:
- Always cite your sources with specific regulation URLs or parcel data
- For property questions, search by address first
- Provide actionable insights for real estate investors
- Consider renovation costs, permit requirements, and market conditions
- Be specific about which municipality's regulations apply

Available functions:
- getRegulation: Get specific regulation URL for a municipality
- compareRegulations: Compare regulations across multiple municipalities
- searchParcelByAddress: Find property by address
- getParcelById: Get property by parcel ID
- getComparables: Find comparable properties for valuation
- getInvestmentAnalysis: Get investment metrics for a property
- getZipCodeStats: Get market statistics for a zip code`;

    // Convert history to OpenAI format
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: args.message },
    ];

    // Define available functions for the LLM
    const functions: OpenAI.Chat.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "getRegulation",
          description:
            "Get the URL and information for a specific regulation type in a municipality",
          parameters: {
            type: "object",
            properties: {
              municipalityName: {
                type: "string",
                description: "Name of the municipality (e.g., 'Cleveland', 'Parma')",
              },
              regulationType: {
                type: "string",
                enum: [
                  "building_code",
                  "fire_code",
                  "zoning_code",
                  "permitting_information",
                  "electrical_code",
                  "plumbing_code",
                  "mechanical_code",
                ],
                description: "Type of regulation to retrieve",
              },
            },
            required: ["municipalityName", "regulationType"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "searchParcelByAddress",
          description:
            "Search for a property by address in Cuyahoga County. Returns property details, ownership, sales history, and characteristics.",
          parameters: {
            type: "object",
            properties: {
              address: {
                type: "string",
                description:
                  "Property address (e.g., '1234 Main St, Cleveland' or just '1234 Main St')",
              },
            },
            required: ["address"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getComparables",
          description:
            "Find comparable properties (comps) for a given address. Useful for property valuation and investment analysis.",
          parameters: {
            type: "object",
            properties: {
              address: {
                type: "string",
                description: "Full property address",
              },
            },
            required: ["address"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getInvestmentAnalysis",
          description:
            "Get detailed investment analysis for a property including appreciation, price per sq ft, and market context.",
          parameters: {
            type: "object",
            properties: {
              address: {
                type: "string",
                description: "Full property address",
              },
            },
            required: ["address"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getZipCodeStats",
          description:
            "Get market statistics for a zip code including median prices, sales volume, and property counts.",
          parameters: {
            type: "object",
            properties: {
              zipCode: {
                type: "string",
                description: "5-digit zip code",
              },
            },
            required: ["zipCode"],
          },
        },
      },
    ];

    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      tools: functions,
      tool_choice: "auto",
    });

    const assistantMessage = response.choices[0].message;
    const citedRegulations: string[] = [];
    const citedParcels: string[] = [];

    // Handle function calls
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let functionResult;

        switch (functionName) {
          case "getRegulation":
            functionResult = await ctx.runQuery(api.regulations.getByMunicipalityAndType, {
              municipalityName: functionArgs.municipalityName,
              regulationType: functionArgs.regulationType,
            });
            if (functionResult) {
              citedRegulations.push(functionResult._id);
            }
            break;

          case "searchParcelByAddress":
            functionResult = await ctx.runQuery(api.parcels.searchByAddress, {
              address: functionArgs.address,
            });
            if (functionResult && functionResult.length > 0) {
              citedParcels.push(functionResult[0]._id);
            }
            break;

          case "getComparables":
            functionResult = await ctx.runQuery(api.parcels.getComparables, {
              address: functionArgs.address,
            });
            if (functionResult?.subject) {
              citedParcels.push(functionResult.subject._id);
            }
            break;

          case "getInvestmentAnalysis":
            functionResult = await ctx.runQuery(api.parcels.getInvestmentAnalysis, {
              address: functionArgs.address,
            });
            if (functionResult?.parcel) {
              citedParcels.push(functionResult.parcel._id);
            }
            break;

          case "getZipCodeStats":
            functionResult = await ctx.runQuery(api.parcels.getZipCodeStats, {
              zipCode: functionArgs.zipCode,
            });
            break;
        }

        // Add function result to messages for next iteration
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult),
        });
      }

      // Get final response after function calls
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
      });

      assistantMessage.content = finalResponse.choices[0].message.content;
    }

    // Save messages to database
    await ctx.runMutation(api.messages.create, {
      conversationId: args.conversationId,
      role: "user",
      content: args.message,
      imageId: args.imageId,
    });

    await ctx.runMutation(api.messages.create, {
      conversationId: args.conversationId,
      role: "assistant",
      content: assistantMessage.content || "I apologize, I couldn't generate a response.",
      citedRegulations,
      citedParcels,
    });

    return {
      content: assistantMessage.content,
      citedRegulations,
      citedParcels,
    };
  },
});
