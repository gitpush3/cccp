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

// System prompt for the building codes assistant
const SYSTEM_PROMPT = `You are a building codes assistant for Cuyahoga County, Ohio.

Goal: help the user quickly understand what rules apply and what to do next.

CRITICAL BEHAVIOR:
- Be concise. Default to 5-12 sentences unless the user asks for more.
- Ask clarifying questions FIRST when needed (max 3 questions). If key details are missing, do not guess.
- Always anchor answers to the selected municipality. Explicitly label:
  (1) Municipality (e.g. Bedford)
  (2) Cuyahoga County (if applicable)
  (3) Ohio State (baseline codes)
- If municipality adopts state code for a topic, say so and cite the Ohio link.
- Never dump a long essay. Use short sections.

STYLE RULES:
- Output must be plain text only.
- Do NOT use Markdown formatting (no headings like ###, no **bold**, no backticks, no tables).
- Use simple hyphen bullets only.
- Keep section titles exactly as shown below (with the 1) 2) numbering).

OUTPUT FORMAT (use exactly):
1) Quick answer (1-3 bullets)
2) What applies in <MUNICIPALITY> (2-6 bullets)
3) County considerations (0-3 bullets)
4) Ohio baseline (0-3 bullets)
5) Next steps (2-5 bullets)
6) Sources (footnotes)

CITATIONS:
- Cite sources as footnotes like [1], [2]...
- In "Sources", list each citation as: [1] <Title> — <URL>
- Only cite URLs provided in the regulation database context or tool results.

If you cannot find a relevant local source, say "Source not found" and recommend contacting the municipality building department.`;

// Define function tools for the LLM to query regulations database
const REGULATION_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getRegulationsByMunicipality",
      description: "Get all building codes and regulations for a specific municipality in Cuyahoga County. Returns URLs and status for building code, fire code, zoning, permits, etc.",
      parameters: {
        type: "object",
        properties: {
          municipalityName: {
            type: "string",
            description: "The name of the municipality (e.g., 'Cleveland', 'Parma', 'Lakewood', 'Bay Village')",
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
      description: "Get a specific type of regulation for a municipality",
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
      description: "Compare a specific regulation type across multiple municipalities to see differences",
      parameters: {
        type: "object",
        properties: {
          municipalityNames: {
            type: "array",
            items: { type: "string" },
            description: "Array of municipality names to compare (e.g., ['Cleveland', 'Lakewood', 'Parma'])",
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
      description: "Get Ohio state-level building codes that apply when municipalities adopt state code",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCountyCodes",
      description: "Get Cuyahoga County-level regulations and codes",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const chatWithPro = action({
  args: {
    clerkId: v.string(),
    question: v.string(),
    jurisdiction: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args): Promise<{ response?: string; error?: string; message?: string; citedRegulations?: string[] }> => {
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

    // Get regulations for the selected jurisdiction using RAG
    let regulationContext = "";
    const citedRegulations: string[] = [];

    // Fetch regulations for the selected jurisdiction
    const jurisdictionRegs = await ctx.runQuery(api.regulations.getRegulationsByMunicipality, {
      municipalityName: args.jurisdiction,
    });

    if (jurisdictionRegs) {
      regulationContext = `\n\nRegulations for ${args.jurisdiction}:\n`;
      for (const reg of jurisdictionRegs.regulations) {
        regulationContext += `- ${reg.type.replace(/_/g, " ").toUpperCase()}: ${reg.displayValue}\n`;
        if (reg.url) {
          regulationContext += `  URL: ${reg.url}\n`;
        }
      }
    }

    // Also get state codes for reference
    const stateCodes = await ctx.runQuery(api.regulations.getStateCodes, {});
    if (stateCodes) {
      regulationContext += `\n\nOhio State Codes (apply when municipality adopts state code):\n`;
      for (const reg of stateCodes.regulations) {
        if (reg.url) {
          regulationContext += `- ${reg.type.replace(/_/g, " ").toUpperCase()}: ${reg.url}\n`;
        }
      }
    }

    // Generate embedding for vector search (legacy support)
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: args.question,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Search municipal codes (legacy vector search)
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

    // Build combined context
    const context: string = [
      "=== REGULATION DATABASE ===",
      regulationContext,
      "\n=== MUNICIPAL CODE EXCERPTS ===",
      ...muniCodes.map((code: any) => `${code.category.toUpperCase()}: ${code.text}`),
      "\n=== VETERAN ARCHITECT TIPS ===",
      ...architectLore.map((lore: any) => `${lore.title}: ${lore.tip}`),
    ].join("\n");

    // Prepare messages for OpenAI with function calling
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nCurrent jurisdiction context: ${args.jurisdiction}\n\n${context}`,
      },
      {
        role: "user",
        content: args.question,
      },
    ];

    // Call OpenAI with function calling for RAG
    let response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      tools: REGULATION_TOOLS,
      tool_choice: "auto",
      temperature: 0.4,
      max_tokens: 650,
    });

    let assistantMessage = response.choices[0].message;

    // Handle function calls (RAG retrieval)
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        // Type guard for function tool calls
        if (toolCall.type !== "function") continue;
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
          case "getCountyCodes":
            functionResult = await ctx.runQuery(
              api.regulations.getCountyCodes,
              {}
            );
            break;
          default:
            functionResult = { error: "Unknown function" };
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult),
        });
      }

      // Get next response from OpenAI
      response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
        tools: REGULATION_TOOLS,
        tool_choice: "auto",
        temperature: 0.4,
        max_tokens: 650,
      });

      assistantMessage = response.choices[0].message;
    }

    const responseText: string = assistantMessage.content || "I couldn't generate a response.";

    // Save assistant response to chat history (user message already added by client)
    await ctx.runMutation(api.messages.addMessage, {
      chatId: args.chatId,
      userId: args.clerkId,
      role: "assistant",
      content: responseText,
    });

    return { response: responseText, citedRegulations };
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
