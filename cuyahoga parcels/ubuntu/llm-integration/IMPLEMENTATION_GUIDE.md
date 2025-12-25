# Building Codes LLM Chat App - Implementation Guide

## 1. Introduction

This guide provides a complete walkthrough for integrating the Cuyahoga County building regulations database into a Convex/TypeScript chat application. The final app will allow users to ask questions about building codes, get AI-powered interpretations, and even analyze photos for compliance issues.

This solution uses a Retrieval-Augmented Generation (RAG) architecture, where the LLM can query your structured database in real-time to provide accurate, source-verified answers.

**Author:** Manus AI
**Date:** December 24, 2025

---

## 2. Project Structure

Here is the complete file structure for your Convex project:

```
/convex
├── schema.ts         # Main database schema
├── regulations.ts     # Queries for fetching regulation data
├── chat.ts           # Core action for processing messages with LLM
├── importRegulations.ts # Script to import the database
├── _generated/         # Convex auto-generated files
└── ...               # Other Convex files (auth, http, etc.)

/components
└── ChatInterface.tsx # React frontend component for the chat UI

/data
├── regulations_llm_optimized.json # Full JSON database for import
└── regulations_compact.json       # Compact JSON for reference

/docs
└── ARCHITECTURE.md   # The architecture design document
```

---

## 3. Step-by-Step Setup

### Step 1: Set Up Your Convex Project

1.  **Initialize Convex:** If you haven't already, create a new Convex project:
    ```bash
    npx convex init
    ```

2.  **Install Dependencies:** Add OpenAI and other necessary libraries.
    ```bash
    npm install openai
    ```

3.  **Add Backend Files:**
    -   Copy the `schema.ts`, `regulations.ts`, `chat.ts`, and `importRegulations.ts` files into your `/convex` directory.

4.  **Set Environment Variables:** In your Convex project dashboard (or via the CLI), set your OpenAI API key:
    ```bash
    npx convex env set OPENAI_API_KEY "sk-..."
    ```

5.  **Push Database Schema:** Deploy your new schema to the Convex backend.
    ```bash
    npx convex push
    ```

### Step 2: Import the Regulations Database

Now, you will populate your Convex database with the 61 jurisdictions and their regulations from the JSON file we created.

1.  **Place Data File:** Put the `regulations_llm_optimized.json` file in your project's root directory.

2.  **Run Import Script:** Execute the `importData` mutation from your terminal. This script reads the JSON file and populates the `municipalities` and `regulationUrls` tables in your database.

    ```bash
    npx convex run importRegulations:importData --data "$(cat regulations_llm_optimized.json)"
    ```

    You should see log output confirming that 61 jurisdictions have been imported.

### Step 3: Integrate the Frontend

This solution includes a ready-to-use React component for the chat UI.

1.  **Add Component:** Place the `ChatInterface.tsx` file in your project's `/components` directory.

2.  **Install UI Dependencies:** Make sure you have `lucide-react` for icons.
    ```bash
    npm install lucide-react
    ```

3.  **Use the Component:** In your application's main page (e.g., `app/page.tsx` in Next.js), you can now use the `ChatInterface` component. You will need to pass a `conversationId` to it. You can create a new conversation for each user session.

    ```tsx
    import { useMutation } from "convex/react";
    import { api } from "@/convex/_generated/api";
    import { ChatInterface } from "@/components/ChatInterface";

    export default function ChatPage() {
      // Example: Create a new conversation on page load
      const createConversation = useMutation(api.conversations.create);
      const [conversationId, setConversationId] = useState(null);

      useEffect(() => {
        async function setupConversation() {
          // Replace with actual user ID from your auth system
          const userId = "..."; 
          const id = await createConversation({ userId });
          setConversationId(id);
        }
        setupConversation();
      }, [createConversation]);

      return (
        <main className="h-screen">
          {conversationId && <ChatInterface conversationId={conversationId} />}
        </main>
      );
    }
    ```

---

## 4. How It Works: The RAG Flow

Your chat app now uses a powerful Retrieval-Augmented Generation (RAG) pattern:

1.  **User Query:** The user asks a question like, *"What are the fire code requirements for smoke detectors in rental units in Lakewood?"*

2.  **LLM Function Calling:** The `sendMessage` action sends the query to the OpenAI GPT-4 model, along with a list of available functions (e.g., `getRegulation`). The LLM intelligently decides that it needs to call the `getRegulation` function with the arguments `{ municipalityName: "Lakewood", regulationType: "fire_code" }`.

3.  **Database Retrieval:** The `getRegulation` function executes a query against your Convex database to find the specific URL or status for Lakewood's fire code.

4.  **Content Augmentation:** The result (the URL or status) is sent back to the LLM as context.

5.  **Informed Response:** The LLM uses this retrieved information to generate a precise, fact-based answer, citing the source and explaining the regulation.

This process ensures that your chatbot provides accurate, up-to-date information grounded in your specific database, rather than relying on its general knowledge.

---

## 5. Customization and Next Steps

-   **Vector Search:** For more advanced semantic search (e.g., *"find rules about fences on corner lots"*), you can implement vector embeddings. This involves:
    1.  Scraping the content from each regulation URL.
    2.  Generating embeddings for the text content using an AI model.
    3.  Storing these embeddings in a Convex vector index.
    4.  Adding a `searchRegulations` function for the LLM to use.

-   **Stripe Integration:** Use the `subscriptions` and `usageLog` tables in `schema.ts` to build your billing logic. Create a Stripe webhook handler in Convex to update subscription statuses.

-   **Content Caching:** To improve performance and reduce external fetches, you can build out the `regulationContent` table to cache the text from regulation URLs the first time they are accessed.

This architecture provides a robust and scalable foundation for your AI-powered building codes assistant. You can now continue to build out features and enhance the user experience.
