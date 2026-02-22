

# AI Help Chatbot for NoCap (Enhanced with Marketplace)

## Overview
Add an AI-powered chatbot that helps members and merchants get instant answers. It appears as a floating chat bubble on all pages and is integrated into the Help & Support page. Beyond general FAQ and app usage help, the chatbot can **search products, check order status, and answer marketplace questions** by querying live data.

## What Users Can Ask

| Category | Example Questions |
|----------|------------------|
| App usage | "How do I top up my wallet?", "How do I set my PIN?" |
| Merchant help | "How do I add a product?", "How do I process an order?" |
| General FAQ | "Is my money safe?", "How does cashback work?" |
| **Order status** | "What's the status of my order?", "Where is my order #NC-xxx?" |
| **Product search** | "Find me a phone case under RM 50", "What products are available?" |
| **Marketplace help** | "How do I leave a review?", "How does shipping work?" |

## How It Works

1. **Floating Chat Bubble** -- A chat icon in the bottom-right corner of every page (above bottom nav). Tap to open a slide-up chat panel.

2. **Help & Support Integration** -- A new "Ask AI" card at the top of the Help & Support page.

3. **Smart Tool Calling** -- The AI backend uses tool-calling to query your database for live data:
   - **search_products**: Searches marketplace products by keyword, category, or price range
   - **check_order_status**: Looks up a user's orders by order number or lists their recent orders
   - **browse_stores**: Lists available stores or finds a specific store

4. **Role-Aware** -- Detects if you're a member or merchant and tailors responses accordingly.

5. **No Chat History** -- Each session starts fresh.

## What Gets Built

### 1. Backend Function: `ai-help-chat`
A new edge function that:
- Receives the user's message and conversation context
- Includes a comprehensive system prompt with NoCap knowledge
- Defines tools the AI can call:
  - `search_products(query, max_price, category)` -- searches `marketplace_products` table
  - `check_order_status(order_number)` -- queries `marketplace_orders` for the authenticated user
  - `list_my_orders()` -- returns the user's recent orders
  - `browse_stores(query)` -- searches `marketplace_stores`
- When the AI decides to call a tool, the function executes the database query and returns results to the AI for a natural-language response
- Uses streaming (SSE) for real-time token-by-token responses
- Powered by Lovable AI (`google/gemini-3-flash-preview`) -- no extra API keys needed
- Handles 429/402 rate limit errors gracefully

### 2. Frontend Component: `AiHelpChat`
A reusable chat component with:
- Floating bubble button (bottom-right, positioned above bottom nav)
- Slide-up dark-themed chat panel
- Message bubbles (user = right-aligned, AI = left-aligned)
- Markdown rendering for AI responses (using simple inline parsing, no extra dependency)
- Real-time streaming text display
- Auto-scroll to latest messages
- Loading indicator while AI responds
- Close button to dismiss

### 3. Help & Support Page Update
- Add a prominent "Chat with AI Assistant" card at the top of the page
- Tapping it opens the same chat interface

### 4. Global Integration in App.tsx
- Import and render `AiHelpChat` inside the app layout so it appears on every page

### 5. Config Update
- Add `ai-help-chat` function entry to `supabase/config.toml` with `verify_jwt = false`

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-help-chat/index.ts` | **New** -- Edge function with AI + tool calling |
| `src/components/AiHelpChat.tsx` | **New** -- Floating chat bubble + chat panel |
| `src/pages/HelpSupport.tsx` | **Modified** -- Add "Ask AI" card at top |
| `src/App.tsx` | **Modified** -- Add `<AiHelpChat />` globally |

## Technical Details

### Tool-Calling Flow

```text
User asks: "Do you have phone cases under RM 30?"
    |
    v
Edge function sends message + tools definition to Lovable AI
    |
    v
AI responds with tool_call: search_products(query="phone case", max_price=30)
    |
    v
Edge function queries marketplace_products WHERE name ILIKE '%phone case%' AND price <= 30
    |
    v
Results sent back to AI as tool response
    |
    v
AI generates natural language: "I found 3 phone cases under RM 30: ..."
    |
    v
Streamed back to user
```

### Order Status Flow
- The user's auth token is forwarded to the edge function
- The function extracts `user_id` from the token
- Order queries are filtered by `buyer_user_id = user_id` for security
- Users can only see their own orders

### System Prompt Coverage
The AI system prompt will include knowledge about:
- Wallet features (top up, transfer, QR pay, PIN)
- Referral system and commission tiers
- Merchant onboarding and dashboard features
- Marketplace browsing, cart, checkout flow
- Order lifecycle (Pending, Confirmed, Processing, Shipped, Delivered)
- Shipping and delivery policies
- Reviews and ratings
- Product search tips
- Common troubleshooting

### No New Database Tables Needed
All queries use existing tables: `marketplace_products`, `marketplace_orders`, `marketplace_stores`, `marketplace_categories`.

