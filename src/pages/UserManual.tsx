import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import NocapLogo from "@/components/NocapLogo";
import {
  ChevronDown, ChevronRight, Search, ArrowLeft, BookOpen, LogIn, LayoutDashboard,
  Wallet, QrCode, ArrowUpDown, Users, Shield, Bell, Settings, Store, BarChart3,
  Code, Globe, Smartphone, Key, CreditCard, UserPlus, FileText, Send, Eye, EyeOff,
  Lock, RefreshCw, AlertCircle, CheckCircle, Info, Banknote, ShoppingBag, Package, Heart, Tag
} from "lucide-react";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    subsections: [
      {
        id: "overview",
        title: "Platform Overview",
        content: `NOcap is Malaysia's #1 Affiliate Cashback Wallet — a digital wallet platform that rewards users with cashback on every transaction and allows them to build a 5-tier referral network for passive income.

**Key Features:**
- 💰 **Instant Cashback** — Earn cashback on every QR payment at NOcap merchants
- 👥 **5-Tier Referral Network** — Build your affiliate network and earn commissions from their purchases
- 🔐 **PIN-Protected Wallet** — Secure transactions with 7-digit PIN verification
- 📱 **Mobile-First Design** — Optimized for smartphone use with bottom navigation
- 🏪 **Merchant Dashboard** — Full merchant management with branches, analytics, and API integration
- 🛍️ **Marketplace** — Browse and buy products from merchant stores using your wallet
- 🔌 **REST API** — OAuth 2.0 secured API for third-party integrations`
      },
      {
        id: "registration",
        title: "Registration & Login",
        content: `**Creating Your Account:**

1. Visit the NOcap app and you'll see the login screen
2. Enter your email address and click **Continue**
3. If your email is new, you'll be asked to enter a **Referral Code** (required)
4. A referral code must come from an existing NOcap member
5. Click **Create Account & Send OTP**
6. Check your email for the 6-digit OTP code
7. Enter the code and click **Verify & Continue**

**Logging In (Existing Users):**

1. Enter your registered email
2. An OTP is sent to your email automatically
3. Enter the 6-digit code to sign in
4. Alternatively, click "Sign in with password instead" if you've set one

**Password Login:**
- After your first OTP login, you can set a password from your Profile
- This allows faster logins without waiting for OTP emails

**Important Notes:**
- OTP codes expire after a few minutes — request a new one if needed
- All new accounts require a valid referral code
- Email verification is mandatory before accessing the platform`,
        screenshot: "auth"
      }
    ]
  },
  {
    id: "member-features",
    title: "Member Features",
    icon: LayoutDashboard,
    subsections: [
      {
        id: "dashboard",
        title: "Member Dashboard",
        content: `After logging in, you'll see your Member Dashboard — the central hub of your NOcap account.

**Dashboard Elements:**
- **Welcome Header** — Shows your name, avatar, and notification bell
- **Wallet Balance Card** — Displays your current balance with show/hide toggle
- **Quick Actions** — 4 buttons: Pay, Top Up, Transfer, Referral
- **Referral Stats** — Direct referrals, total network, cashback earned, commission earned
- **Spending Analytics Link** — Navigate to detailed charts and breakdowns
- **Referral Code Card** — Your unique code with a Share button
- **Become a Merchant** — Quick link to merchant registration
- **Recent Activity** — Last 5 transactions with click-to-view details

**Onboarding Checklist:**
New users see a checklist prompting them to complete setup:
- ✅ Complete Profile (name, phone, address)
- ✅ Set Transaction PIN
- ✅ Make First Transaction

**Real-Time Updates:**
Your balance and transactions update in real-time — no need to refresh!`,
        screenshot: "dashboard"
      },
      {
        id: "wallet-topup",
        title: "Wallet Top-Up",
        content: `**How to Top Up Your Wallet:**

1. Tap **Top Up** from the dashboard quick actions
2. Enter the amount you wish to add (in RM)
3. Click **Top Up** to proceed
4. You'll be redirected to the payment gateway (FPX / Online Banking)
5. Complete the payment with your bank
6. Upon success, your wallet balance updates instantly

**Important Notes:**
- Minimum and maximum top-up amounts may apply
- Zero or negative amounts are rejected with a validation error
- Failed payments do not affect your balance
- A transaction record appears in your history immediately`
      },
      {
        id: "qr-pay",
        title: "QR Pay (Merchant Payments)",
        content: `**Paying at Merchants via QR Code:**

1. Tap **Pay** from the dashboard or navigate to QR Pay
2. Your camera opens to scan the merchant's QR code
3. Alternatively, you can enter the QR code ID manually
4. Confirm the payment amount displayed
5. If the amount is ≥ RM 100, you'll need to enter your 7-digit PIN
6. Tap **Confirm Payment**

**After Payment:**
- Your wallet balance is deducted immediately
- You earn cashback (credited automatically)
- The merchant's branch wallet is credited
- Commission is distributed through your referral chain (up to 5 tiers)
- A success confirmation is displayed with transaction details

**Error Handling:**
- **Insufficient Balance** — Shows error, payment not processed
- **Invalid/Expired QR** — Error message displayed
- **Wrong PIN** — 3 attempts before account lockout`
      },
      {
        id: "transfer",
        title: "Peer-to-Peer Transfer",
        content: `**Transferring Money to Another NOcap User:**

1. Tap **Transfer** from the dashboard
2. Enter the recipient's phone number or email
3. The system verifies the recipient exists
4. Enter the amount to transfer
5. Enter your PIN if required (for amounts ≥ threshold)
6. Confirm the transfer

**Rules:**
- You cannot transfer to yourself
- Recipient must be a registered NOcap user
- Insufficient balance prevents the transfer
- Both sender and recipient see the transaction in their history
- The transfer is instant — no delays`
      },
      {
        id: "transactions",
        title: "Transaction History",
        content: `**Viewing Your Transactions:**

1. Tap **Transactions** from the bottom navigation bar
2. Browse your complete transaction history (most recent first)
3. Use filter tabs to view specific types: All, Payments, Top-ups, Transfers, etc.
4. Tap any transaction to view full details

**Transaction Detail View Shows:**
- Transaction ID
- Type (Top Up, Payment, Transfer, Cashback, Commission, etc.)
- Amount and fee breakdown
- Net amount
- Description and reference
- Date and time
- Status (Completed, Pending, Failed)
- Associated metadata (merchant name, branch, etc.)

**Transaction Types:**
| Type | Icon | Description |
|------|------|-------------|
| Top Up | ↙️ | Money added to wallet |
| Payment | ↗️ | QR payment to merchant |
| Transfer In | ↙️ | Received from another user |
| Transfer Out | ↗️ | Sent to another user |
| Cashback | 🎁 | Reward from purchases |
| Commission | 💰 | Referral network earnings |
| Withdrawal | ↗️ | Merchant payout |
| Refund | ↙️ | Returned payment |`
      },
      {
        id: "connected-apps",
        title: "Connected Apps",
        content: `**Managing Third-Party App Access:**

When you authorize a third-party app via OAuth, it gains access to specific scopes of your wallet (e.g. balance, charge). You can view and manage these connections from your Profile page.

**Viewing Connected Apps:**
1. Go to **Profile** from the bottom navigation
2. Scroll to the **Connected Apps** section
3. See a list of all apps you've authorized

**Each App Shows:**
- App name and connection status (Active / Expired)
- Granted scopes (e.g. Balance, Charge)
- When you connected it
- When the token was last used
- Expiry date

**Revoking Access:**
1. Find the app you want to disconnect
2. Tap the **Revoke** button
3. Confirm — the app can no longer access your wallet
4. The app would need to re-request authorization to regain access

**Important Notes:**
- Revoking access is immediate and irreversible
- The app will receive 401 errors on any further API calls
- You can always re-authorize the same app later`
      }
    ]
  },
  {
    id: "marketplace",
    title: "Marketplace",
    icon: ShoppingBag,
    subsections: [
      {
        id: "marketplace-overview",
        title: "Marketplace Overview",
        content: `The NOcap Marketplace lets you browse and buy products from merchant stores, paying directly from your wallet balance.

**Key Features:**
- 🛍️ **Product-First Discovery** — Browse all products across all stores in one place
- 🔍 **Advanced Search & Filters** — Filter by store, category, price range, and stock
- 🛒 **Cart & Checkout** — Add items, apply discount codes, and pay with your wallet
- ❤️ **Wishlists** — Save products you love for later
- 📦 **Order Tracking** — Track your orders from placement to delivery
- ⭐ **Reviews & Ratings** — Rate products and read other buyers' feedback

**Accessing the Marketplace:**
- Tap the **Marketplace** icon from the bottom navigation bar
- Or navigate to any store page directly`
      },
      {
        id: "marketplace-browsing",
        title: "Browsing & Search",
        content: `**Search & Discovery:**

1. Open the **Marketplace** from the bottom navigation
2. Use the search bar at the top to find products by name
3. Real-time search suggestions appear as you type

**Filtering Products:**
- **Store Filter** — Show products from a specific merchant store
- **Category Filter** — Browse by product category
- **Price Range** — Use the dual-thumb slider to set min/max price in RM
- **In Stock Only** — Toggle to hide out-of-stock items

**Sorting Options:**
| Sort | Description |
|------|-------------|
| Featured | Merchant-highlighted products first |
| Price: Low to High | Cheapest first |
| Price: High to Low | Most expensive first |
| Rating | Highest rated first |
| Newest | Most recently added first |

**Product Cards Show:**
- Product image, name, and price
- Store name and logo
- Stock availability
- Add to Wishlist button (heart icon)`
      },
      {
        id: "marketplace-wishlist",
        title: "Wishlists & Recently Viewed",
        content: `**Wishlist:**

1. Tap the **heart icon** on any product card to add it to your wishlist
2. Access your wishlist by tapping the heart icon in the marketplace header
3. Remove items by tapping the heart icon again
4. Wishlists are saved to your account — accessible on any device

**Recently Viewed:**
- Products you've viewed are tracked automatically
- Access recently viewed items from the clock icon in the marketplace header
- Helps you find products you browsed earlier`
      },
      {
        id: "marketplace-cart",
        title: "Cart & Checkout",
        content: `**Adding to Cart:**

1. Tap any product to view its detail page
2. Select quantity (up to available stock)
3. Tap **Add to Cart**
4. The cart icon shows your item count

**Cart Drawer:**
- Tap the shopping bag icon to open your cart
- Adjust quantities or remove items
- See subtotal for all items
- Tap **Checkout** to proceed

**Checkout Process:**
1. Review your order summary
2. Enter shipping details (name, email, phone, address)
3. Enter a discount code if you have one
4. Review the total (subtotal + shipping − discounts)
5. Choose payment method (NOcap Wallet)
6. Enter your 7-digit PIN if the total is ≥ RM 100
7. Confirm the order

**After Checkout:**
- Payment is deducted from your wallet immediately
- The merchant is notified of the new order
- You receive an order confirmation with order number
- Commission is distributed through your referral chain
- A 1% platform fee is applied automatically

**Important Notes:**
- All items in a single cart must be from the same store
- Discount codes are store-specific
- Insufficient wallet balance will prevent checkout`
      },
      {
        id: "marketplace-orders",
        title: "My Orders",
        content: `**Tracking Your Orders:**

1. Navigate to **My Orders** from the profile menu or marketplace
2. View all your orders sorted by most recent
3. Each order shows: order number, store name, total amount, and status
4. Tap any order to see full details

**Order Statuses:**
| Status | Description |
|--------|-------------|
| Pending | Order placed, awaiting merchant confirmation |
| Confirmed | Merchant has confirmed your order |
| Processing | Order is being prepared |
| Shipped | Order has been dispatched (tracking number available) |
| Delivered | Order received by buyer |
| Cancelled | Order was cancelled |

**Order Details Include:**
- Order number and date
- Store name and logo
- List of items with quantities and prices
- Shipping address
- Tracking number (when shipped)
- Payment breakdown (subtotal, shipping, discounts, total)`
      },
      {
        id: "marketplace-reviews",
        title: "Reviews & Ratings",
        content: `**Leaving a Review:**

1. After your order is delivered, go to the product detail page
2. Scroll to the reviews section
3. Select a rating (1–5 stars)
4. Write an optional comment
5. Submit your review

**Review Rules:**
- You can only review products from orders you've received
- One review per product per order (duplicates are prevented)
- Merchants can reply to your review
- Reviews are visible on the public product page

**Reading Reviews:**
- Product detail pages show all reviews with ratings
- See the merchant's reply (if any) below each review
- Reviews help other buyers make informed decisions`
      }
    ]
  },
  {
    id: "security",
    title: "Security & PIN",
    icon: Shield,
    subsections: [
      {
        id: "pin-management",
        title: "PIN Management",
        content: `**Setting Your PIN (First Time):**

1. Navigate to **Set PIN** from the onboarding checklist or profile
2. Enter a 7-digit PIN
3. Confirm by re-entering the same PIN
4. Click **Set PIN**
5. Your profile is updated — PIN is now active for secure transactions

**When is PIN Required?**
- QR Pay amounts ≥ RM 100 (configurable by admin)
- Peer-to-peer transfers above the threshold
- Marketplace checkout totals ≥ RM 100
- API charges above the threshold

**Resetting Your PIN:**

1. Navigate to **Reset PIN**
2. Click **Request OTP** — a code is sent to your registered email
3. Enter the OTP code
4. Set your new 7-digit PIN
5. Confirm and save

**PIN Security:**
- 3 failed attempts = temporary lockout (30 minutes)
- PIN is hashed and stored securely — never visible to anyone
- Remaining attempts are displayed during entry`
      },
      {
        id: "session-management",
        title: "Session Management",
        content: `**Automatic Session Protection:**

- **Inactivity Timeout**: After 8 minutes of inactivity, a warning dialog appears
- **2-Minute Countdown**: You have 2 minutes to click "Stay Logged In"
- **Auto-Logout**: If you don't respond, you're automatically logged out
- **Single Session**: Logging in on a new device invalidates the previous session

**Best Practices:**
- Always log out when using shared devices
- Don't share your login credentials
- Keep your email secure — it's used for OTP verification`
      }
    ]
  },
  {
    id: "referral",
    title: "Referral System",
    icon: Users,
    subsections: [
      {
        id: "how-referrals-work",
        title: "How Referrals Work",
        content: `**Your Referral Network:**

Every NOcap member gets a unique referral code. When someone signs up using your code, they become part of your referral network.

**5-Tier Commission Structure:**
When anyone in your network makes a purchase at a NOcap merchant, you earn commission:

| Tier | Relationship | Commission |
|------|-------------|------------|
| Tier 1 | You → Direct Referral | Highest % |
| Tier 2 | Your referral's referral | Medium % |
| Tier 3 | 3rd generation | Lower % |
| Tier 4 | 4th generation | Lower % |
| Tier 5 | 5th generation | Lowest % |

**Commission Sources:**
- QR Pay transactions at merchants
- Marketplace purchases from merchant stores

**How to Share Your Code:**
1. Go to the **Referral** page from the dashboard
2. Your unique code is displayed prominently
3. Tap **Share** to share via WhatsApp, SMS, or copy the link
4. The link includes your code: \`nocap.life/auth?ref=YOUR_CODE\`

**Viewing Your Network:**
- Dashboard shows: Direct referrals count, total network size
- Referral page shows detailed tier breakdown with member counts`
      }
    ]
  },
  {
    id: "merchant",
    title: "Merchant Features",
    icon: Store,
    subsections: [
      {
        id: "merchant-registration",
        title: "Becoming a Merchant",
        content: `**Registration Process:**

1. From the dashboard, tap **Become a Merchant**
2. Fill in your business details:
   - Business Name
   - Business Type (F&B, Retail, Services, etc.)
   - Business Registration Number
   - Business Address
3. Enter bank account details for settlements:
   - Bank Name
   - Account Number
   - Account Holder Name
4. Upload required documents (if applicable)
5. Submit the application

**After Submission:**
- Your application enters **Pending** status
- An admin reviews and approves/rejects your application
- Upon approval, you gain the **Merchant** role
- A default branch is created for your business
- You can access the Merchant Dashboard`
      },
      {
        id: "merchant-dashboard",
        title: "Merchant Dashboard",
        content: `**Dashboard Tabs:**

| Tab | Description |
|-----|-------------|
| **Transactions** | All payments received, with filters and search |
| **Analytics** | Revenue charts, transaction volume, branch comparisons |
| **Settlement** | Available balance, pending settlements, withdrawal history |
| **Withdrawals** | Request payouts to your bank account |
| **Shop** | Manage your marketplace store, products, and orders |
| **Reviews** | View and reply to customer product reviews |
| **API Apps** | Register and manage API applications |
| **Logs** | View API request and webhook delivery logs |

**Key Features:**
- Real-time transaction monitoring
- Multi-branch management
- Branch owner assignment (delegate to staff)
- QR code generation for each branch (static and dynamic)
- Commission tracking and analytics`
      },
      {
        id: "merchant-branches",
        title: "Branch Management",
        content: `**Branch Features:**
Each merchant can have multiple branches, each with its own wallet, QR codes, and optional branch owner.

**QR Codes:**
- **Static QR** — Permanent QR code for each branch (customers enter amount)
- **Dynamic QR** — Time-limited QR with a pre-set amount and description
  - Expiry options: 15 minutes, 30 minutes, 1 hour, 2 hours, 6 hours, 24 hours
  - Shows real-time payment status (Pending → Paid)
  - Can be deleted if unused

**QR Actions:**
- Download as PNG image with branch label
- Share via Web Share API (WhatsApp, Telegram, etc.)
- Display on screen for customers to scan

**Branch Owner Assignment:**
- Assign a staff member as branch owner using their email
- Branch owners can access the Branch Dashboard for their assigned branch
- Useful for delegating day-to-day operations`
      },
      {
        id: "merchant-marketplace",
        title: "Marketplace Store Management",
        content: `**Setting Up Your Store:**

From the Merchant Dashboard, go to the **Shop** tab to manage your marketplace presence.

**Store Branding:**
- Upload a store **logo** (max 15MB, compressed automatically)
- Upload a **banner** image (max 15MB, compressed automatically)
- Set a store **tagline**
- Choose a theme: Classic, Bold, or Minimal
- Set a primary accent color

**Managing Products:**
1. Click **Add Product** in the Shop tab
2. Fill in product details: name, description, price, stock quantity, SKU
3. Upload product images (up to 15MB each — automatically compressed to 1200px)
4. Assign a category (create categories as needed)
5. Mark as Featured to highlight on your store page
6. Save the product

**Delivery Settings:**
- Set a **flat-rate shipping fee** for all orders
- Optionally set a **free shipping minimum** order amount

**Discount Codes:**
- Create promotional codes with percentage or fixed discounts
- Set minimum order amounts and maximum usage limits
- Set expiry dates for time-limited promotions
- Activate or deactivate codes as needed

**Order Management:**
- View incoming orders in the Shop tab
- Update order status through the fulfillment pipeline:
  - Pending → Confirmed → Processing → Shipped → Delivered
- Add tracking numbers when shipping
- Both merchant and buyer receive notifications on status changes

**Product Images:**
- Images are automatically compressed on upload (max 1200×1200px, 80% JPEG quality)
- Logos compressed to 512×512px, banners to 1600×1600px
- This reduces storage usage and speeds up page loads`
      },
      {
        id: "merchant-reviews",
        title: "Customer Reviews",
        content: `**Managing Reviews:**

1. Go to the **Reviews** tab in the Merchant Dashboard
2. View all reviews across your products
3. See ratings, comments, and which product/order they relate to

**Replying to Reviews:**
- Click on a review to reply
- Your reply is visible on the public product page
- Replies show a timestamp so buyers see when you responded

**Tips:**
- Respond promptly to negative reviews
- Thank customers for positive feedback
- Use reviews to identify product quality issues`
      },
      {
        id: "merchant-withdrawals",
        title: "Settlements & Withdrawals",
        content: `**Viewing Settlement Summary:**
- Navigate to the Settlement tab in your Merchant Dashboard
- See available balance per branch
- View pending and completed withdrawals

**Requesting a Withdrawal:**
1. Go to the **Withdrawals** tab
2. Select the branch to withdraw from
3. Enter the withdrawal amount
4. Confirm bank account details
5. Submit the request

**Withdrawal Rules:**
- Minimum withdrawal amount applies (set by admin)
- Withdrawal goes to **Pending** status for admin approval
- Once approved, funds are transferred to your bank
- Rejected withdrawals return the balance to your branch wallet`
      }
    ]
  },
  {
    id: "branch-dashboard",
    title: "Branch Dashboard",
    icon: BarChart3,
    subsections: [
      {
        id: "branch-overview",
        title: "Branch Owner Dashboard",
        content: `The Branch Dashboard is available to users assigned as a **branch owner** by a merchant. It provides day-to-day operational tools for managing a specific branch.

**Accessing the Branch Dashboard:**
- If you're assigned as a branch owner, you'll see **Branch Dashboard** in your navigation
- You can only manage the branch(es) assigned to you

**Dashboard Features:**

| Feature | Description |
|---------|-------------|
| **Branch Selector** | Switch between branches if you own multiple |
| **Wallet Balance** | View the branch's current balance |
| **Sales Summary** | Daily, weekly, and monthly sales totals |
| **Transaction Search** | Search and filter branch transactions |
| **QR Code Management** | View static QR, create/manage dynamic QRs |
| **Withdrawal Requests** | Request payouts from branch balance |`
      },
      {
        id: "branch-qr",
        title: "QR Code Management",
        content: `**Static QR Code:**
- Every branch has a permanent QR code
- Customers scan it and enter the payment amount
- Download or share the QR code

**Dynamic QR Codes:**
1. Tap **Create Dynamic QR**
2. Enter the payment amount and description
3. Select expiry duration (15 min – 24 hours)
4. The QR code is generated with a unique ID
5. Share with the customer

**Dynamic QR Status:**
- 🟡 **Pending** — Waiting for payment
- 🟢 **Paid** — Payment received
- 🔴 **Expired** — QR has expired without payment
- Dynamic QRs can be deleted if unused

**Actions:**
- Download QR as PNG with branch label
- Share via device share menu
- Track payment status in real-time`
      },
      {
        id: "branch-sales",
        title: "Sales & Transactions",
        content: `**Sales Summary:**
- View total sales for today, this week, and this month
- Quick overview of branch performance

**Transaction Search:**
- Search transactions by description or reference
- Filter by date range
- View transaction details including amount, type, and status
- All transactions are specific to the selected branch

**Withdrawal Requests:**
1. Tap **Request Withdrawal** from the Branch Dashboard
2. Enter the amount to withdraw
3. Confirm bank details (pre-filled from merchant profile)
4. Submit — the request goes to admin for approval
5. Track withdrawal status: Pending → Approved / Rejected`
      }
    ]
  },
  {
    id: "api-integration",
    title: "API Integration",
    icon: Code,
    subsections: [
      {
        id: "api-overview",
        title: "API Overview",
        content: `**NOcap REST API** allows third-party applications to:
- Check user wallet balances
- Create charges from user wallets
- Process refunds
- Query charge history

**Authentication:** OAuth 2.0 Authorization Code Flow

**Required Headers for all API calls:**
| Header | Value |
|--------|-------|
| X-Api-Key | Your app's API key |
| X-Api-Secret | Your app's API secret |
| Authorization | Bearer ACCESS_TOKEN |`
      },
      {
        id: "api-apps",
        title: "Managing API Apps",
        content: `**Registering a New API App:**

1. Go to Merchant Dashboard → **API Apps** tab
2. Click **Register App**
3. Enter app name, description, and select a branch
4. Optionally enter a webhook URL
5. Toggle **Sandbox Mode** on for testing
6. Submit

**⚠️ Important:** Your API Key and Secret are shown **only once** after creation. Save them securely!

**App Management:**
- **Toggle Sandbox Mode** — Test without real money movement
- **Edit Webhook URL** — Update where events are sent
- **Activate/Deactivate** — Control API access
- **Generate Test Token** — Skip OAuth flow during development

**Sandbox Mode:**
- Skips balance checks and PIN verification
- No real money movement
- Webhooks fire with \`is_sandbox: true\`
- A Test Access Token is auto-generated — use it directly
- Perfect for development and testing`
      },
      {
        id: "oauth-flow",
        title: "OAuth 2.0 Flow",
        content: `**Step 1 — Redirect User to Consent Screen:**
\`\`\`
https://nocap.life/authorize
  ?app_id=YOUR_APP_ID
  &redirect_uri=YOUR_CALLBACK_URL
  &scope=balance,charge
  &state=RANDOM_STRING
\`\`\`

**Step 2 — Receive Authorization Code:**
User approves → redirected to your callback with \`?code=AUTH_CODE&state=YOUR_STATE\`
User denies → redirected with \`?error=access_denied\`

**Step 3 — Exchange Code for Token (Server-to-Server):**
POST to \`/api-token-exchange\` with code, app_id, app_secret
Response includes access_token valid for 90 days.

**Available Scopes:**
| Scope | Allows |
|-------|--------|
| balance | Read user's wallet balance |
| charge | Create charges, refunds, view charge history |`
      },
      {
        id: "api-endpoints",
        title: "API Endpoints",
        content: `**Available Endpoints:**

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | /api-balance | balance | Check user's wallet balance |
| POST | /api-charge | charge | Create a charge from user's wallet |
| GET | /api-charge-status | — | Check charge status by charge_id |
| GET | /api-charges-list | charge | List charges with pagination & filters |
| POST | /api-refund | charge | Refund a completed charge (full or partial) |
| POST | /api-revoke | — | Revoke access token |
| GET | /api-docs | — | Retrieve full API documentation |

**Rate Limits:**
| Endpoint | Limit |
|----------|-------|
| /api-token-exchange | 10/min per app |
| /api-balance | 60/min per key |
| /api-charge | 30/min per key |
| /api-charge-status | 60/min per key |
| /api-charges-list | 60/min per key |
| /api-refund | 20/min per key |

**Exceeding Limits:** Returns \`429 Too Many Requests\` with a \`Retry-After\` header.`
      },
      {
        id: "webhooks",
        title: "Webhooks",
        content: `**Webhook Events:**
- \`charge.completed\` — Charge successfully processed
- \`charge.failed\` — Charge failed (includes reason code)
- \`charge.refunded\` — Full refund processed
- \`charge.partial_refund\` — Partial refund processed

**Failure Reason Codes:**
| Code | Description |
|------|-------------|
| INSUFFICIENT_BALANCE | User's wallet balance is too low |
| PIN_REQUIRED | Transaction requires PIN but none provided |
| PIN_NOT_SET | User hasn't configured a PIN yet |
| INVALID_PIN | The PIN provided was incorrect |

**Webhook Headers:**
| Header | Description |
|--------|-------------|
| X-Webhook-Signature | HMAC-SHA256 hex signature |
| X-Webhook-Attempt | Retry attempt number (1–3) |

**Retry Policy:** 3 attempts — immediate, then 1s delay, then 2s delay.

**Signature Verification:** Compute SHA-256 of your API Secret to get the signing key, then HMAC-SHA256 the request body. Compare to the X-Webhook-Signature header.

**Best Practices:**
- Respond with 200 immediately, then process asynchronously
- Always verify signatures before trusting payloads
- Use charge_id for idempotency (you may receive duplicates)
- Poll /api-charge-status as fallback for missed webhooks`
      }
    ]
  },
  {
    id: "admin",
    title: "Admin Panel",
    icon: Settings,
    subsections: [
      {
        id: "admin-overview",
        title: "Admin Overview",
        content: `The Admin panel is available to users with the **admin** role. It provides full platform management capabilities.

**Admin Tabs:**
| Tab | Description |
|-----|-------------|
| **Users** | View all users, assign/remove roles (member, merchant, admin, branch) |
| **Fee Settings** | Configure platform fees, cashback rates, referral tiers, PIN threshold |
| **Merchant Approvals** | Review and approve/reject merchant applications |
| **Withdrawal Approvals** | Approve/reject merchant withdrawal requests |
| **Transactions** | View all platform transactions with search and filters |
| **API Apps** | Monitor and manage all registered API applications |`
      },
      {
        id: "fee-settings",
        title: "Fee Configuration",
        content: `**Configurable Settings:**
- Platform fee percentage (charged on merchant transactions)
- Cashback percentage (rewarded to payers)
- Referral commission percentages (Tier 1–5)
- PIN threshold amount (when PIN verification is required)

**How Changes Apply:**
- Fee changes apply to **future transactions only**
- Existing transactions retain their original fee structure
- Changes take effect immediately after saving`
      },
      {
        id: "nightly-test-reset",
        title: "Nightly Test Account Reset",
        content: `**Automated Test Account Management:**

The platform includes an automated nightly reset system for the designated test account (\`azarul@brainybunch.com\`) to ensure consistent daily UAT testing.

**Schedule (Malaysia Time — MYT):**
| Time | Action |
|------|--------|
| 10:55 PM | **Reverse** all test transactions from the day |
| 11:00 PM | **Top up** test wallet to exactly RM 1,000 |
| 11:05 PM | **Email report** with daily summary to test account |

**What Gets Reversed (100% Coverage):**
When the nightly reset runs, it traces every transaction's \`reference_id\` chain to find and reverse ALL downstream financial impacts:

| Impact | Reversal |
|--------|----------|
| Payer wallet debited | Credited back |
| Branch wallet credited | Debited |
| Branch legacy balance | Debited |
| Cashback to payer | Debited |
| Tier 1–5 referral commissions | Debited from each ancestor |
| Unclaimed commissions | Debited from branch |
| Platform fee (admin) | Debited from admin wallet |
| Transfers (in/out) | Symmetrically reversed |
| Top-ups | Debited (skips own reset top-ups) |
| Refunds | Reversed symmetrically |

**Daily Email Report:**
After the reset, a formatted HTML email is sent to the test account containing:
- **Summary**: Date, total transactions reversed, amounts by type, final wallet balance
- **Detail table**: Every reversed transaction with time, type, amount, description, and status

**Safety Measures:**
- Hardcoded to only target the single test account email
- Skips transactions already marked as reversed
- Skips its own "Nightly test reset" top-up transactions
- Creates a full audit trail of all reversal transactions
- Logs a summary of all reversals performed`
      }
    ]
  },
  {
    id: "mobile",
    title: "Mobile Experience",
    icon: Smartphone,
    subsections: [
      {
        id: "bottom-nav",
        title: "Mobile Navigation",
        content: `**Bottom Navigation Bar** (visible on mobile viewports):

| Icon | Page | Description |
|------|------|-------------|
| 🏠 Dashboard | /dashboard | Main hub with balance and actions |
| 📋 Transactions | /transactions | Full transaction history |
| 🛍️ Marketplace | /marketplace | Browse and buy products |
| 📷 QR Pay | /qr-pay | Scan and pay merchants |
| 👤 Profile | /profile | Account settings and management |

**Mobile-Optimized Features:**
- All pages stack vertically for easy scrolling
- Buttons are touch-friendly (minimum 44px tap targets)
- QR scanner uses device camera
- Share button uses native OS sharing (WhatsApp, SMS, etc.)
- Swipe-friendly card interactions
- Cart drawer slides in from the right`
      }
    ]
  },
  {
    id: "help",
    title: "Help & Support",
    icon: Info,
    subsections: [
      {
        id: "faq",
        title: "Frequently Asked Questions",
        content: `**Q: How do I earn cashback?**
A: Every time you pay at a NOcap merchant via QR Pay or buy from the Marketplace, you automatically receive cashback in your wallet.

**Q: How does the referral system work?**
A: Share your unique referral code. When people sign up and make purchases, you earn commission from their transactions — up to 5 tiers deep.

**Q: What if I forget my PIN?**
A: Go to Reset PIN, request an OTP via email, verify it, and set a new PIN.

**Q: Is there a minimum top-up amount?**
A: Yes, minimum amounts are set by the platform admin. Amounts below the minimum are rejected.

**Q: How long does a withdrawal take?**
A: Withdrawal requests go through admin approval. Once approved, bank transfer timing depends on your bank.

**Q: Can I use NOcap on desktop?**
A: Yes! NOcap is a responsive web app that works on both mobile and desktop browsers.

**Q: What happens if my session expires?**
A: You'll be redirected to the login page. Simply log in again with your email.

**Q: How do I buy from the Marketplace?**
A: Browse products, add to cart, enter shipping details at checkout, and pay with your wallet balance. You'll receive cashback on marketplace purchases too!

**Q: Can I return a marketplace purchase?**
A: Contact the merchant directly. If they issue a refund, the amount is returned to your wallet.

**Q: How do I manage apps connected to my wallet?**
A: Go to Profile → Connected Apps to view and revoke third-party app access.`
      }
    ]
  }
];

const screenshotDescriptions: Record<string, { alt: string; caption: string }> = {
  "auth": {
    alt: "NOcap Login Screen",
    caption: "The login screen with email input, OTP verification, and referral code for new users"
  },
  "dashboard": {
    alt: "NOcap Member Dashboard",
    caption: "Member dashboard showing wallet balance, quick actions, referral stats, and recent activity"
  }
};

const UserManual = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["getting-started"]);
  const [activeSubsection, setActiveSubsection] = useState("overview");

  const toggleSection = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const filteredSections = search
    ? sections.map(s => ({
        ...s,
        subsections: s.subsections.filter(
          sub => sub.title.toLowerCase().includes(search.toLowerCase()) ||
                 sub.content.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(s => s.subsections.length > 0)
    : sections;

  const activeContent = sections
    .flatMap(s => s.subsections)
    .find(sub => sub.id === activeSubsection);

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-primary/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/60 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <NocapLogo size="sm" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">User Manual</h1>
              <p className="text-xs text-white/40">Complete platform guide</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/uat-scripts")} className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white text-xs">
              <FileText className="mr-1.5 h-3.5 w-3.5" /> UAT Scripts
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-white/10 sticky top-[57px] h-[calc(100vh-57px)]">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  placeholder="Search manual..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm"
                />
              </div>

              <nav className="space-y-1">
                {filteredSections.map(section => (
                  <Collapsible
                    key={section.id}
                    open={openSections.includes(section.id)}
                    onOpenChange={() => toggleSection(section.id)}
                  >
                    <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                      <section.icon className="h-4 w-4 text-secondary" />
                      <span className="flex-1 text-left">{section.title}</span>
                      {openSections.includes(section.id) ?
                        <ChevronDown className="h-3.5 w-3.5 text-white/30" /> :
                        <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                      }
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                        {section.subsections.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setActiveSubsection(sub.id)}
                            className={`block w-full rounded-md px-3 py-1.5 text-left text-xs transition-colors ${
                              activeSubsection === sub.id
                                ? "bg-secondary/10 text-secondary font-medium"
                                : "text-white/50 hover:text-white/70 hover:bg-white/5"
                            }`}
                          >
                            {sub.title}
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </nav>
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile section selector */}
          <div className="lg:hidden p-4 border-b border-white/10">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm"
              />
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {sections.map(s => (
                  <Button
                    key={s.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpenSections([s.id]);
                      setActiveSubsection(s.subsections[0].id);
                    }}
                    className={`shrink-0 text-xs ${
                      s.subsections.some(sub => sub.id === activeSubsection)
                        ? "border-secondary bg-secondary/10 text-secondary"
                        : "border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    <s.icon className="mr-1 h-3 w-3" /> {s.title}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            {/* Mobile subsection tabs */}
            {filteredSections.map(section =>
              section.subsections.some(sub => sub.id === activeSubsection) && (
                <div key={section.id} className="flex flex-wrap gap-1.5 mt-3">
                  {section.subsections.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveSubsection(sub.id)}
                      className={`rounded-full px-3 py-1 text-xs transition-colors ${
                        activeSubsection === sub.id
                          ? "bg-secondary text-primary font-medium"
                          : "bg-white/5 text-white/50 hover:text-white"
                      }`}
                    >
                      {sub.title}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Content area */}
          <div className="p-4 md:p-8 max-w-3xl">
            {activeContent && (
              <article>
                <div className="mb-6">
                  {sections.map(s =>
                    s.subsections.find(sub => sub.id === activeSubsection) && (
                      <Badge key={s.id} variant="outline" className="mb-3 border-secondary/30 text-secondary text-xs">
                        <s.icon className="mr-1 h-3 w-3" /> {s.title}
                      </Badge>
                    )
                  )}
                  <h2 className="text-2xl font-bold text-white font-display">{activeContent.title}</h2>
                </div>

                <div className="prose prose-invert max-w-none">
                  {activeContent.content.split('\n').map((block, i) => {
                    const trimmed = block.trim();
                    if (!trimmed) return <div key={i} className="h-3" />;

                    // Headers
                    if (trimmed.startsWith('**Q:')) {
                      return <p key={i} className="font-semibold text-secondary mt-4 text-sm">{trimmed.replace(/\*\*/g, '')}</p>;
                    }
                    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                      return <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-2">{trimmed.replace(/\*\*/g, '')}</h3>;
                    }

                    // Table rows
                    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                      const cells = trimmed.split('|').filter(Boolean).map(c => c.trim());
                      if (cells.every(c => c.match(/^-+$/))) return null;
                      const isHeader = block === activeContent.content.split('\n').find(l => l.trim().startsWith('|'));
                      return (
                        <div key={i} className={`grid gap-2 px-3 py-1.5 text-xs ${isHeader ? 'font-semibold text-white/80 bg-white/5 rounded-t-lg' : 'text-white/60 border-b border-white/5'}`}
                          style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
                          {cells.map((cell, ci) => <span key={ci}>{cell}</span>)}
                        </div>
                      );
                    }

                    // Code blocks
                    if (trimmed.startsWith('```')) return null;
                    if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
                      return <code key={i} className="block bg-white/5 rounded-lg px-4 py-2 text-xs text-secondary font-mono my-2">{trimmed.slice(1, -1)}</code>;
                    }

                    // Bullet points
                    if (trimmed.startsWith('- ')) {
                      const text = trimmed.slice(2);
                      return (
                        <div key={i} className="flex gap-2 text-sm text-white/60 ml-2 my-1">
                          <span className="text-secondary mt-1">•</span>
                          <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-white/5 px-1 rounded text-secondary text-xs">$1</code>') }} />
                        </div>
                      );
                    }

                    // Numbered items
                    if (/^\d+\.\s/.test(trimmed)) {
                      const num = trimmed.match(/^(\d+)\./)?.[1];
                      const text = trimmed.replace(/^\d+\.\s/, '');
                      return (
                        <div key={i} className="flex gap-3 text-sm text-white/60 my-1.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">{num}</span>
                          <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-white/5 px-1 rounded text-secondary text-xs">$1</code>') }} />
                        </div>
                      );
                    }

                    // Regular paragraph
                    return <p key={i} className="text-sm text-white/60 my-1" dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-white/5 px-1 rounded text-secondary text-xs">$1</code>') }} />;
                  })}
                </div>

                {/* Navigation */}
                <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
                  {(() => {
                    const allSubs = sections.flatMap(s => s.subsections);
                    const idx = allSubs.findIndex(s => s.id === activeSubsection);
                    const prev = idx > 0 ? allSubs[idx - 1] : null;
                    const next = idx < allSubs.length - 1 ? allSubs[idx + 1] : null;
                    return (
                      <>
                        {prev ? (
                          <Button variant="ghost" size="sm" onClick={() => setActiveSubsection(prev.id)} className="text-white/50 hover:text-white text-xs">
                            <ChevronRight className="mr-1 h-3 w-3 rotate-180" /> {prev.title}
                          </Button>
                        ) : <div />}
                        {next ? (
                          <Button variant="ghost" size="sm" onClick={() => setActiveSubsection(next.id)} className="text-white/50 hover:text-white text-xs">
                            {next.title} <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        ) : <div />}
                      </>
                    );
                  })()}
                </div>
              </article>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserManual;
