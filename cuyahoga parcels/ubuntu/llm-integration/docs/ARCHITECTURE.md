# Building Codes LLM Chat App - Architecture Design

## Overview

This architecture enables real estate investors to ask questions about building codes, get photo interpretations, and receive guidance through a chat interface powered by LLMs with access to the complete Cuyahoga County regulations database.

## Tech Stack

- **Frontend/Backend**: Convex + TypeScript
- **Deployment**: Vercel
- **Payments**: Stripe
- **LLM**: OpenAI GPT-4 (with vision capabilities)
- **Vector Search**: Convex built-in vector search
- **File Storage**: Convex file storage

## Architecture Components

### 1. Data Layer (Convex)

```
regulations/
├── municipalities (table)
├── regulationUrls (table)
├── regulationContent (table) - scraped/cached content
├── regulationEmbeddings (vector index)
└── files (Convex storage) - for uploaded photos
```

### 2. RAG (Retrieval Augmented Generation) Strategy

**Hybrid Approach:**
- **Structured Data**: Direct SQL-like queries for specific municipality lookups
- **Vector Search**: Semantic search for finding relevant regulations
- **URL References**: Always provide source URLs for transparency

### 3. Chat Flow

```
User Query → Context Detection → Data Retrieval → LLM Processing → Response
     ↓              ↓                  ↓               ↓             ↓
  "What's    Municipality?      Vector Search    GPT-4 with    Answer +
   the fire   + Code Type?      + Direct URL     Context       Source URLs
   code in                       Lookup
   Parma?"
```

### 4. Photo Interpretation Flow

```
User Uploads Photo → Convex Storage → GPT-4 Vision → Code Analysis → Compliance Check
                                           ↓                             ↓
                                    "Identify issue"          "Check regulations"
                                                                         ↓
                                                              Response with violations
```

## Data Structure Options

### Option A: Lightweight (Recommended for MVP)

Store only the URL database + LLM context:
- Fast to implement
- Low storage costs
- LLM fetches content on-demand via function calling
- Always up-to-date (fetches live from source)

### Option B: Full Content Cache

Pre-scrape and embed all regulation documents:
- Faster responses
- Works offline from sources
- Higher storage costs
- Requires periodic updates
- Better for semantic search

### Option C: Hybrid (Recommended for Production)

- Store URL database in Convex
- Cache frequently accessed regulations
- Lazy-load and cache on first access
- Vector embeddings for cached content only

## LLM Integration Patterns

### 1. Function Calling Pattern

```typescript
// LLM can call these functions
functions: [
  "searchRegulations",      // Vector search
  "getRegulationByMunicipality", // Direct lookup
  "fetchRegulationContent", // Fetch from URL
  "compareRegulations"      // Compare multiple cities
]
```

### 2. System Prompt Strategy

```
You are a building code expert assistant for Cuyahoga County, Ohio.
You have access to:
- Building codes for 59 municipalities
- Ohio state codes
- County regulations

Always:
1. Cite specific code sections
2. Provide source URLs
3. Warn about checking with local building departments
4. Note when codes may have been updated
```

### 3. Context Window Management

- Use structured data for precise lookups (saves tokens)
- Only embed relevant regulation sections (not entire documents)
- Summarize long regulations before sending to LLM

## Convex Schema Design

### municipalities table
```typescript
{
  _id: Id<"municipalities">,
  name: string,
  type: "city" | "village" | "township" | "county" | "state",
  county: string,
  state: string,
}
```

### regulationUrls table
```typescript
{
  _id: Id<"regulationUrls">,
  municipalityId: Id<"municipalities">,
  regulationType: "building" | "residential" | "fire" | ...,
  url: string | null,
  status: "adopts_state" | "local_code" | "not_found",
  lastVerified: number,
}
```

### regulationContent table (optional for caching)
```typescript
{
  _id: Id<"regulationContent">,
  regulationUrlId: Id<"regulationUrls">,
  content: string,
  summary: string,
  embedding: number[], // for vector search
  lastFetched: number,
}
```

### chatMessages table
```typescript
{
  _id: Id<"chatMessages">,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
  role: "user" | "assistant",
  content: string,
  imageId?: Id<"_storage">, // for photos
  citedRegulations: Id<"regulationUrls">[],
  timestamp: number,
}
```

## API Endpoints (Convex Functions)

### Queries
- `getRegulationsByMunicipality(name: string)`
- `searchRegulations(query: string, municipalityFilter?: string)`
- `getChatHistory(conversationId: Id)`

### Mutations
- `sendMessage(conversationId, content, imageId?)`
- `createConversation(userId)`
- `updateRegulationCache(regulationUrlId, content)`

### Actions
- `processMessageWithLLM(messageId)` - Calls OpenAI
- `analyzePhotoWithVision(imageId, question)` - GPT-4 Vision
- `fetchRegulationContent(url)` - Scrapes regulation page

## Cost Optimization

### Token Usage
- Use GPT-4-mini for simple queries ($0.15/1M input tokens)
- Use GPT-4 for complex analysis ($3/1M input tokens)
- Use GPT-4-vision only for photos ($10/1M input tokens)

### Caching Strategy
- Cache LLM responses for identical questions
- Store regulation summaries (not full text)
- Use Convex's built-in caching

### Stripe Integration
- Free tier: 10 questions/month
- Pro tier: Unlimited questions + photo analysis
- Pay-per-use: $0.10 per question

## Security & Compliance

- Rate limiting per user
- Content moderation for uploaded photos
- Disclaimer: "Always verify with local building department"
- Audit log for all queries
- GDPR-compliant data handling

## Deployment Strategy

### Phase 1: MVP
- URL database in Convex
- Basic chat with GPT-4-mini
- Direct municipality lookups
- No photo analysis yet

### Phase 2: Enhanced
- Add GPT-4-vision for photos
- Vector search for semantic queries
- Regulation content caching
- Stripe integration

### Phase 3: Advanced
- Multi-city comparison
- Code change notifications
- Permit cost estimator
- Contractor recommendations

## Performance Targets

- Query response: < 2 seconds
- Photo analysis: < 5 seconds
- Vector search: < 500ms
- 99.9% uptime
