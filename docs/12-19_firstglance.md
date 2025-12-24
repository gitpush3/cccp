# First Glance Audit - 12/19/2025

## Executive Summary

This is a well-structured Next.js + Convex application for a veteran architect assistant with AI-powered municipal code search. The codebase shows solid foundation with authentication, database schema, and frontend components, but has critical gaps in vector search implementation and webhook handling that prevent full functionality.

## Overall Assessment

**Strengths:**
- Clean architecture with proper separation of concerns
- Comprehensive schema design matching requirements
- Working authentication (Clerk + Google OAuth)
- Good frontend UX with modern React patterns
- File upload functionality implemented
- Subscription flow partially working

**Critical Issues:**
- Vector indexes missing from schema (blocking RAG functionality)
- Vector similarity search not implemented (using mock searches)
- Stripe webhook not exposed as HTTP action (blocking subscription updates)
- Sample embeddings are dummy values

## Detailed Findings

### 1. Schema (convex/schema.ts) ✅ 80% Complete

**Implemented Correctly:**
- Users table: clerkId, email, stripeCustomerId, subscriptionStatus ('active'|'none'), endsAt
- MuniCodes: jurisdiction, category (zoning/building/fire), text, embedding (array)
- ArchitectLore: title, tip, jurisdiction, embedding
- Contacts: city, type (gov/commercial), name, phone, notes
- Messages: chatId, userId, role, content, imageStorageId

**Missing:**
- Vector indexes for similarity search
- Vector index on MuniCodes with jurisdiction filter (required for filtered vector search)

### 2. Stripe Integration ⚠️ 60% Complete

**Implemented Correctly:**
- createCheckoutSession action creates subscription checkout with clerkId in metadata
- handleWebhook internalMutation processes checkout.session.completed and invoice.payment_succeeded
- Updates subscriptionStatus and endsAt appropriately

**Missing:**
- HTTP action for webhook endpoint (currently only internalMutation)
- Webhook signature verification
- Route added to convex/http.ts or router.ts

### 3. RAG & AI Logic (convex/actions.ts) ✅ 90% Complete

**Implemented Correctly:**
- chatWithPro action checks subscription status
- Embeds user questions using OpenAI
- Searches MuniCodes and ArchitectLore (though currently mock)
- Sends context to GPT-4 with veteran architect system prompt
- Saves conversation history

**Issues:**
- Vector search calls are mocked (return fixed results)
- No actual similarity matching

### 4. Frontend Components ✅ 95% Complete

**Dashboard:**
- Clean layout with city selector sidebar
- Tabbed interface for chat/contacts
- Proper jurisdiction selection flow

**Chat:**
- Message list with proper rendering
- Image display using storage.getUrl() from imageStorageId
- File upload integration
- Paywall integration for Pro features

**Upload:**
- Integrated into Chat component (no separate Upload component)
- Uses generateUploadUrl mutation
- Supports image files
- Saves storageId to message history

**Paywall:**
- Appears when subscriptionStatus !== 'active'
- Clean UI with upgrade flow
- Calls createCheckoutSession action

### 5. File Handling ✅ 100% Complete

**Mutations:**
- generateUploadUrl: Properly implemented
- addMessage: Saves imageStorageId to messages

**Frontend Integration:**
- File selection and upload in Chat component
- Image rendering in message list using storage.getUrl()

### 6. Vector Search Implementation ❌ 20% Complete

**Current State:**
- Schema has embedding fields as arrays
- search.ts contains mock implementations
- No actual vector similarity search
- Sample data has dummy embeddings (Array(1536).fill(value))

**Missing:**
- Vector indexes in schema
- Convex vector search queries
- Real embedding generation for sample data

### 7. Sample Data ⚠️ 50% Complete

**Present:**
- Sample municipal codes for LA and SF
- Sample architect lore
- Proper data structure

**Issues:**
- Embeddings are dummy arrays (not real embeddings)
- Limited sample set
- No contacts data seeded

## Path Forward

### Immediate Critical Fixes (Blockers)

1. **Add Vector Indexes to Schema**
   - Add `.vectorIndex("by_embedding_jurisdiction", { vectorField: "embedding", filterFields: ["jurisdiction"] })` to MuniCodes
   - Add `.vectorIndex("by_embedding", { vectorField: "embedding" })` to ArchitectLore

2. **Implement Real Vector Search**
   - Replace mock searches in convex/search.ts with actual vector queries
   - Use `ctx.vectorSearch()` with proper similarity functions

3. **Fix Stripe Webhooks**
   - Add HTTP action in convex/router.ts for `/stripe/webhook`
   - Implement webhook signature verification using Stripe SDK
   - Call existing handleWebhook internalMutation

### Medium Priority (Enhancements)

4. **Generate Real Embeddings**
   - Run embedding generation on sample data
   - Create script to populate embeddings for existing data

5. **Add Contacts Sample Data**
   - Seed contacts table with government and commercial contacts for cities

6. **Improve Error Handling**
   - Add better error messages for subscription failures
   - Handle vector search failures gracefully

### Testing & Deployment

7. **Test Full Flow**
   - User registration → subscription → AI chat with vector search
   - File upload and display
   - Webhook processing

8. **Environment Setup**
   - Ensure all required environment variables are documented
   - Set up Stripe webhook endpoint URL

## Estimated Effort

- Critical fixes: 4-6 hours
- Vector search implementation: 2-3 hours
- Testing and polish: 2-3 hours
- Total: 8-12 hours for production readiness

## Recommendations

1. **Start with vector search** - This is the core AI feature that must work
2. **Test subscriptions end-to-end** - Revenue critical functionality
3. **Add comprehensive logging** - For debugging webhook and AI responses
4. **Consider migration path** - For existing users when vector search is enabled

The foundation is excellent. With these fixes, this will be a production-ready application.
