import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import NocapLogo from "@/components/NocapLogo";
import {
  ChevronDown, ChevronRight, Search, ArrowLeft, BookOpen, Store, QrCode,
  MessageCircle, ClipboardList, ArrowLeftRight, Wallet, TrendingUp, FileText,
  BarChart3, DollarSign, AlertTriangle, Users, Percent, Package, Layers,
  Gift, ShoppingBag, Megaphone, Globe, CreditCard, Upload, BookOpenText,
  Shield, Code, ScrollText, Settings2, Eye, Plus, Pencil, Trash2, ImageIcon,
  Tag, Truck, Star, Share2, Heart, Filter, ShoppingCart
} from "lucide-react";

interface ManualSection {
  id: string;
  title: string;
  icon: React.ElementType;
  subsections: {
    id: string;
    title: string;
    content: string;
    screenshot?: string;
    tips?: string[];
  }[];
}

const sections: ManualSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    subsections: [
      {
        id: "overview",
        title: "Welcome to NOcap Marketplace",
        content: `NOcap Marketplace is your all-in-one e-commerce platform built into the NOcap ecosystem. As a seller, you get a complete online store with powerful tools to manage products, process orders, track analytics, and grow your business — all connected to the NOcap wallet payment system.

**What You Can Do:**
- 🏪 Create and customize your own online storefront
- 📦 List unlimited products with images, variants, and categories
- 💰 Accept payments via NOcap wallet (instant settlement)
- 📊 Track sales, revenue, and customer analytics
- 🎯 Run promotions, flash sales, and discount campaigns
- 🚚 Manage orders with a visual fulfillment pipeline
- 💬 Chat with customers directly from your dashboard
- 🔗 Share your store link or connect a custom domain`,
      },
      {
        id: "access-dashboard",
        title: "Accessing the Merchant Dashboard",
        content: `Your Merchant Dashboard is the central hub for managing your marketplace store.

**How to Access:**
1. Log in to your NOcap account
2. Navigate to the **Merchant Dashboard** from your profile or direct link
3. Select your **Branch** (each branch can have its own marketplace store)
4. You'll see the dashboard with **Today's Sales**, **Total Sales**, and the navigation menu

**Dashboard Layout:**
- **Top Section** — Sales summary cards showing today's and total revenue
- **Branch Selector** — Choose which branch/store to manage
- **Category Dropdown** — Switch between 6 management categories
- **Sub-tabs** — Quick access to specific features within each category`,
        screenshot: "/manual/merchant-dashboard.png",
        tips: [
          "You can manage multiple branches, each with its own store",
          "The notification bell shows new orders and messages",
          "Click the API Integration Guide card for developer resources",
        ],
      },
      {
        id: "navigation",
        title: "Understanding the Navigation Menu",
        content: `The dashboard is organized into **6 categories** for easy navigation. Use the dropdown selector to switch between them:

**🏪 Operations** — Day-to-day store management
- QR Codes, Shop & Products, Customer Chat, Order Fulfillment

**💰 Finance** — Money and transaction tracking
- Transactions, Withdrawals, Distributions, Settlement

**📊 Insights & Growth** — Analytics and customer data
- Analytics, Sales Reports, Inventory Alerts, Customer CRM

**🎯 Marketing** — Promotions and engagement tools
- Discount Rules, Product Bundles, Collections, Gift Cards, Abandoned Carts, Announcements

**🎨 Storefront** — Store appearance and content
- Custom Domain, Checkout Settings, Product SEO, Store Blog, Import/Export

**⚙️ Settings & Dev** — Configuration and API
- Branch Settings, Staff Permissions, API Apps, API Logs`,
        screenshot: "/manual/merchant-nav-menu.png",
      },
    ],
  },
  {
    id: "products",
    title: "Products & Inventory",
    icon: Store,
    subsections: [
      {
        id: "add-product",
        title: "Adding Products",
        content: `To add a new product to your store:

1. Go to **🏪 Operations → Shop & Products**
2. Scroll down to your product list
3. Click **+ Add Product**
4. Fill in the product details:
   - **Product Name** — Clear, descriptive name
   - **Price (RM)** — Set your selling price
   - **Stock Quantity** — How many units available
   - **Category** — Select or create a category
   - **Description** — Detailed product description
   - **Images** — Upload up to 5 product photos (first image is the main display)
   - **SKU** — Optional stock keeping unit code
   - **Weight (kg)** — For shipping calculation
5. Click **Save** to publish your product

**Image Tips:**
- Use square images (1:1 ratio) for best display
- Minimum recommended size: 800×800 pixels
- Supported formats: JPG, PNG, WebP
- First image uploaded becomes the main product thumbnail`,
        screenshot: "/manual/merchant-products.png",
        tips: [
          "Products appear on the marketplace immediately after saving",
          "Use the edit (✏️) icon to modify existing products",
          "Use the delete (🗑️) icon to remove products",
          "Set stock to 0 to show 'Out of Stock' without removing the listing",
        ],
      },
      {
        id: "product-variants",
        title: "Product Variants (Size, Color)",
        content: `If your product comes in different sizes, colors, or options, use **Product Variants**:

1. When editing a product, look for the **Variants** section
2. Add variant groups like "Size" or "Color"
3. For each group, add options (e.g., S, M, L, XL)
4. Set individual **stock quantity** and **price adjustment** for each variant
5. Optionally add a **SKU** per variant for inventory tracking

**Example:**
- Product: "Cotton T-Shirt" — RM 39.90
- Variant: Size S (no adjustment), Size M (+RM 0), Size L (+RM 5.00), Size XL (+RM 10.00)

When customers browse your product, they'll see a variant selector to choose their preferred option before adding to cart.`,
        tips: [
          "Price adjustments can be positive or negative",
          "Each variant has its own stock count",
          "Variants are displayed as selectable chips on the product page",
        ],
      },
      {
        id: "categories",
        title: "Managing Categories",
        content: `Categories help customers find your products easily.

**Creating Categories:**
1. In **Shop & Products**, look for the category management area
2. Add categories like "Drinks", "Food", "Accessories", etc.
3. Assign each product to a category when creating/editing it

**How Categories Appear:**
- On the marketplace homepage, categories show as horizontal **scrollable chips**
- Customers can tap a category to filter products instantly
- Your store page also displays categories for easy browsing

**Best Practices:**
- Keep category names short and clear (1-3 words)
- Don't create too many categories — 5-10 is ideal
- Use categories that match what customers search for`,
      },
      {
        id: "inventory-alerts",
        title: "Inventory Alerts",
        content: `Never run out of stock unexpectedly! Set up low-stock alerts:

1. Go to **📊 Insights & Growth → Inventory Alerts**
2. Set a **threshold** for each product (e.g., alert when stock falls below 10)
3. When stock reaches the threshold, you'll receive a notification
4. Bulk update stock quantities from this screen

**Features:**
- Toggle alerts on/off per product
- View all low-stock items at a glance
- Quick stock update without going to each product
- Last alerted timestamp to avoid duplicate notifications`,
        tips: [
          "Set higher thresholds for fast-selling products",
          "Check this screen daily to stay ahead of stock issues",
          "Products at 0 stock show as 'Out of Stock' to customers",
        ],
      },
    ],
  },
  {
    id: "orders",
    title: "Orders & Fulfillment",
    icon: ClipboardList,
    subsections: [
      {
        id: "order-pipeline",
        title: "Order Fulfillment Pipeline",
        content: `Track and manage orders through a visual **Kanban-style pipeline**:

1. Go to **🏪 Operations → Order Fulfillment**
2. Orders flow through 4 stages:

**📋 Pending** → New orders waiting to be processed
**⚙️ Processing** → Orders being prepared/packed
**🚚 Shipped** → Orders handed to courier
**✅ Delivered** → Orders received by customer

**How to Move Orders:**
- Click on any order to see full details
- Update the status to move it to the next stage
- Add tracking numbers when shipping
- Leave notes for your reference

Each column shows the order count and total value, giving you a quick overview of your fulfillment workload.`,
        screenshot: "/manual/merchant-kanban.png",
        tips: [
          "Process orders quickly to maintain good customer ratings",
          "Add tracking numbers so customers can track their delivery",
          "Use the refresh button to check for new orders",
        ],
      },
      {
        id: "order-details",
        title: "Viewing Order Details",
        content: `Click any order in the pipeline to see complete details:

**Order Information:**
- Order number (e.g., #MKT-MNXXXXXX)
- Customer name, email, and phone
- Shipping address
- Payment status and method
- Order total with breakdown (subtotal, shipping, platform fee)

**Order Items:**
- Product name, image, and quantity
- Unit price and subtotal per item
- Variant information if applicable

**Actions:**
- Update order status
- Add tracking number
- Print packing slip / sales order PDF
- View order status timeline (history of all status changes)`,
      },
      {
        id: "returns",
        title: "Handling Returns & Refunds",
        content: `When a customer requests a return:

1. Go to **🏪 Operations** or check notifications
2. Review the return request:
   - Reason for return
   - Requested refund amount
   - Which item(s) are being returned
3. You can **Approve** or **Reject** the return
4. Add a note explaining your decision
5. Approved returns trigger a wallet refund to the customer

**Return Statuses:**
- 🟡 Pending — Awaiting your review
- ✅ Approved — Refund processed
- ❌ Rejected — Return denied with reason`,
      },
    ],
  },
  {
    id: "storefront",
    title: "Your Online Store",
    icon: Globe,
    subsections: [
      {
        id: "store-setup",
        title: "Setting Up Your Store",
        content: `Your marketplace store is your online shopfront. Customize it to reflect your brand:

**Store Branding (in Shop & Products):**
- **Store Name** — Your business/brand name
- **Tagline** — A short catchy description
- **Logo** — Square image representing your brand
- **Banner** — Wide image at the top of your store (recommended: 1200×400)
- **Primary Color** — Your brand color for buttons and accents
- **Theme** — Choose from Classic, Bold, or Minimal layouts
- **Description** — Tell customers about your store
- **Contact** — Email and WhatsApp for customer inquiries

**Shipping Settings:**
- **Flat Rate** — Standard shipping fee (e.g., RM 4.90)
- **Free Shipping Minimum** — Orders above this amount get free shipping (e.g., RM 50)`,
        screenshot: "/manual/storefront.png",
        tips: [
          "Your store URL will be: nocap-grow-friends.lovable.app/store/your-slug",
          "Use a professional logo and high-quality banner image",
          "Write a compelling description — it's the first thing customers see",
        ],
      },
      {
        id: "store-pages",
        title: "Custom Pages (About, FAQ, Policy)",
        content: `Create additional pages for your store:

1. Go to **🎨 Storefront** category in navigation
2. Add pages like:
   - **About Us** — Your brand story
   - **FAQ** — Frequently asked questions
   - **Shipping Policy** — Delivery information
   - **Return Policy** — Return and refund terms
3. Each page gets a unique URL slug (e.g., /store/your-shop/page/about-us)
4. Toggle pages as Published or Draft

**Page Features:**
- Rich text content editor
- SEO settings (meta title, description)
- Custom URL slug
- Publish/unpublish toggle`,
      },
      {
        id: "store-blog",
        title: "Store Blog",
        content: `Share content and drive traffic with a built-in blog:

1. Go to **🎨 Storefront → Store Blog**
2. Click **New Post**
3. Write your content with:
   - Title and URL slug
   - Featured image
   - Rich text content
   - SEO meta title and description
4. Save as **Draft** or **Published**

**Blog Ideas for Sellers:**
- Product spotlights and new arrivals
- Behind-the-scenes of your business
- Tips and tutorials related to your products
- Seasonal promotions and announcements`,
      },
      {
        id: "store-seo",
        title: "SEO & Discoverability",
        content: `Optimize your products and store for search engines:

**Product SEO (🎨 Storefront → Product SEO):**
- Set custom **meta title** for each product (appears in search results)
- Write compelling **meta descriptions** (up to 160 characters)
- Customize **URL slugs** for clean, readable links
- SEO score indicator shows how well optimized each product is

**Store SEO (🎨 Storefront → Checkout Settings):**
- Store-level meta title and description
- Open Graph (OG) image for social media sharing
- Structured data for rich search results`,
      },
      {
        id: "custom-domain",
        title: "Custom Domain",
        content: `Connect your own domain name to your store:

1. Go to **🎨 Storefront → Custom Domain**
2. Enter your domain (e.g., www.mystore.com)
3. Follow the DNS verification steps:
   - Add a CNAME or TXT record to your domain
   - Wait for verification (usually 24-48 hours)
4. Once verified, customers can access your store via your custom domain

**Benefits:**
- Professional appearance with your own URL
- Better brand recognition and trust
- Store renders as standalone website (no marketplace header)
- Same powerful checkout and wallet payment system`,
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing & Promotions",
    icon: Megaphone,
    subsections: [
      {
        id: "discount-codes",
        title: "Discount Codes",
        content: `Create promotional discount codes for your customers:

1. Go to **🎯 Marketing → Discount Rules** or manage via your store settings
2. Click **Create Discount Code**
3. Configure:
   - **Code** — e.g., SAVE10, WELCOME20
   - **Discount Type** — Percentage (%) or Fixed Amount (RM)
   - **Discount Value** — How much off
   - **Minimum Order** — Minimum cart value to use the code
   - **Maximum Uses** — Limit how many times it can be used
   - **Expiry Date** — When the code stops working
4. Share the code with customers via social media, chat, or your store

Customers enter the code at checkout to apply the discount.`,
      },
      {
        id: "discount-rules",
        title: "Automatic Discount Rules",
        content: `Set up discounts that apply automatically without codes:

**Rule Types:**
- **Quantity Discount** — Buy 3 get 10% off
- **Spend Threshold** — Spend RM 100 get RM 15 off
- **Free Shipping** — Free shipping on orders above RM 50
- **Buy X Get Y** — Buy 2 shirts get 1 free

**Setup:**
1. Go to **🎯 Marketing → Discount Rules**
2. Click **Add Rule**
3. Choose rule type and set conditions
4. Set priority (higher priority rules apply first)
5. Set start/end dates for time-limited promotions
6. Toggle active/inactive`,
      },
      {
        id: "flash-sales",
        title: "Flash Sales",
        content: `Create urgency with time-limited deals:

1. Select a product for the flash sale
2. Set the **flash price** (discounted from original)
3. Set **start and end time**
4. Set **maximum quantity** available at flash price
5. Monitor sold quantity in real-time

**How It Appears:**
- Products on flash sale show a countdown timer
- Original price is crossed out with flash price highlighted
- "Flash Sale" badge appears on the product card
- Dedicated flash sale section on the marketplace homepage

**Tips:**
- Run flash sales during peak hours for maximum impact
- Limit quantities to create urgency
- Promote flash sales on your social media beforehand`,
      },
      {
        id: "bundles",
        title: "Product Bundles",
        content: `Group products together at a special bundle price:

1. Go to **🎯 Marketing → Product Bundles**
2. Click **Create Bundle**
3. Add:
   - Bundle name and description
   - Select products to include
   - Set quantity per product
   - Set bundle price (lower than buying separately)
4. The bundle shows a "Save X%" badge

**Example:**
- Product A: RM 15 + Product B: RM 20 = RM 35 separately
- Bundle Price: RM 28 — "Save 20%"`,
      },
      {
        id: "collections",
        title: "Product Collections",
        content: `Curate themed product groups (like lookbooks):

1. Go to **🎯 Marketing → Collections**
2. Create collections like:
   - "Summer Essentials"
   - "Gift Guide"
   - "New Arrivals"
   - "Best Sellers"
3. Add products to each collection
4. Set display order and cover image
5. Collections appear on your storefront

Collections help customers discover related products they might not find through regular browsing.`,
      },
      {
        id: "gift-cards",
        title: "Gift Cards",
        content: `Sell digital gift cards redeemable at your store:

1. Go to **🎯 Marketing → Gift Cards**
2. Click **Issue Gift Card**
3. Set:
   - Initial balance (e.g., RM 50)
   - Recipient name and email
   - Optional personal message
   - Expiry date (optional)
4. A unique code is generated automatically
5. Share the code with the recipient

**Gift Card Lifecycle:**
- 🟢 Active — Ready to use
- 🔵 Partially Redeemed — Some balance used
- ⚪ Fully Redeemed — Balance exhausted
- 🔴 Expired — Past expiry date`,
      },
      {
        id: "announcements",
        title: "Store Announcements",
        content: `Display a banner message at the top of your store:

1. Go to **🎯 Marketing → Announcements**
2. Set your message (e.g., "🎉 Free shipping this weekend!")
3. Choose background and text colors
4. Toggle the announcement on/off

**Use Cases:**
- Promotion announcements
- Holiday schedules
- New product launches
- Shipping delay notices`,
      },
      {
        id: "abandoned-carts",
        title: "Abandoned Cart Recovery",
        content: `Recover lost sales from incomplete checkouts:

1. Go to **🎯 Marketing → Abandoned Carts**
2. View a list of customers who added items but didn't complete checkout
3. See:
   - Customer name/email
   - Items in their cart
   - Cart value
   - When they abandoned
4. Send a **reminder notification** to nudge them back
5. Track recovery status (Pending → Reminded → Recovered)

**Tips:**
- Send reminders within 1-24 hours for best results
- Consider offering a small discount to incentivize completion
- Monitor recovery rate to measure effectiveness`,
      },
    ],
  },
  {
    id: "finance",
    title: "Finance & Reports",
    icon: DollarSign,
    subsections: [
      {
        id: "transactions",
        title: "Transaction History",
        content: `View all your marketplace transactions:

1. Go to **💰 Finance → Transactions**
2. See a chronological list of all payments received
3. Each entry shows:
   - Transaction date and time
   - Order number
   - Amount received
   - Platform fee deducted (1%)
   - Net amount credited to your wallet

**Filters:**
- Date range
- Transaction type
- Amount range
- Search by order number`,
      },
      {
        id: "withdrawals",
        title: "Withdrawals",
        content: `Withdraw your earnings to your bank account:

1. Go to **💰 Finance → Withdrawals**
2. Enter the amount you want to withdraw
3. Confirm your bank details
4. Submit withdrawal request
5. Admin will process and approve the withdrawal

**Important:**
- Minimum withdrawal amount may apply
- Processing time: 1-3 business days
- Withdrawal fees may apply depending on amount`,
      },
      {
        id: "sales-reports",
        title: "Sales & Revenue Reports",
        content: `Detailed reporting for your business:

1. Go to **📊 Insights & Growth → Sales Reports**
2. View:
   - **Daily / Weekly / Monthly** revenue trends
   - **Order count** over time
   - **Average order value**
   - **Top selling products**
   - **Top customers** by spending
3. Filter by date range
4. Export reports to **CSV** for accounting

**KPI Cards:**
- Total Revenue
- Total Orders
- Average Order Value
- Growth vs previous period`,
      },
      {
        id: "analytics",
        title: "Store Analytics",
        content: `Understand your store performance:

1. Go to **📊 Insights & Growth → Analytics**
2. Track:
   - **Product Views** — How many times each product was viewed
   - **Conversion Rate** — Views vs purchases
   - **Revenue by Product** — Which products earn the most
   - **Customer Demographics** — Who's buying from you
   - **Traffic Sources** — How customers find your store

Use these insights to optimize your product listings, pricing, and marketing strategies.`,
      },
      {
        id: "crm",
        title: "Customer CRM",
        content: `Build relationships with your customers:

1. Go to **📊 Insights & Growth → Customer CRM**
2. See all customers who have purchased from your store:
   - Name and email
   - Total orders placed
   - Total amount spent
   - Last order date
   - Custom tags (e.g., "VIP", "Wholesale")
3. Add notes about customers
4. Export customer list to CSV
5. Use the **Sync** button to pull latest data from orders

**Tagging System:**
Tag customers for easy segmentation (e.g., "Repeat Buyer", "High Value", "New Customer")`,
      },
    ],
  },
  {
    id: "settings",
    title: "Settings & Team",
    icon: Settings2,
    subsections: [
      {
        id: "staff",
        title: "Staff Permissions",
        content: `Add team members to help manage your store:

1. Go to **⚙️ Settings & Dev → Staff Permissions**
2. View current store managers
3. Set granular permissions for each manager:
   - **View Products** — Can see product list
   - **Manage Products** — Can add/edit/delete products
   - **View Orders** — Can see order list
   - **Manage Orders** — Can update order status
   - **View Analytics** — Can access reports
   - **Manage Settings** — Can change store settings
   - **Manage Discounts** — Can create promotions
   - **Manage Staff** — Can invite other managers

**Note:** Managers are invited via the store settings. Once accepted, you can configure their permissions here.`,
      },
      {
        id: "checkout-settings",
        title: "Checkout Customization",
        content: `Brand your checkout experience:

1. Go to **🎨 Storefront → Checkout Settings**
2. Customize:
   - **Logo** on checkout page
   - **Primary color** for checkout buttons
   - **Thank you message** after successful purchase
3. The checkout still uses NOcap wallet for payment but appears branded to your store

This is especially useful if you're using a custom domain — customers see a cohesive branded experience from browsing to checkout.`,
      },
      {
        id: "api",
        title: "API Integration",
        content: `For advanced integrations, use the NOcap Merchant API:

1. Go to **⚙️ Settings & Dev → API Apps**
2. Create an API application
3. Get your **API Key** and **API Secret**
4. Use OAuth 2.0 to authenticate
5. Access endpoints for:
   - Charging customers
   - Checking balances
   - Viewing transactions
   - Managing branches

**API Logs** (⚙️ Settings & Dev → API Logs):
Monitor all API requests made by your application, including status codes, response times, and payloads.

Refer to the **API Integration Guide** on your dashboard for full documentation.`,
      },
      {
        id: "import-export",
        title: "Product Import / Export",
        content: `Bulk manage your products:

**Export Products:**
1. Go to **🎨 Storefront → Import / Export**
2. Click **Export** to download all products as CSV or JSON
3. Use this for backup or editing in a spreadsheet

**Import Products:**
1. Download the **CSV template** first
2. Fill in your product data following the template format
3. Upload the CSV file
4. Review the import preview (shows errors if any)
5. Confirm to add all products at once

**Template Columns:**
name, price, stock_quantity, category, description, sku, weight_kg, status

This is perfect for sellers with large catalogs or migrating from another platform.`,
      },
    ],
  },
  {
    id: "customer-experience",
    title: "Customer Experience",
    icon: Heart,
    subsections: [
      {
        id: "customer-chat",
        title: "Customer Chat",
        content: `Communicate directly with customers:

1. Go to **🏪 Operations → Customer Chat**
2. See all conversations organized by product
3. Reply to customer inquiries in real-time
4. The chat badge shows unread message count

**Best Practices:**
- Respond within 1 hour during business hours
- Be helpful and professional
- Provide product details and shipping information
- Use chat to build trust before purchase`,
      },
      {
        id: "reviews",
        title: "Managing Reviews",
        content: `Customer reviews build trust and drive sales:

**Viewing Reviews:**
- Reviews appear on each product page
- Customers can leave 1-5 star ratings with comments and photos

**Replying to Reviews:**
1. Go to your store's review management section
2. Click on a review to reply
3. Write a professional, helpful response
4. Your reply appears publicly under the review

**Tips for Handling Reviews:**
- Always thank positive reviewers
- Address negative reviews professionally
- Offer solutions, not excuses
- Photo reviews are especially powerful — encourage them`,
      },
      {
        id: "product-qa",
        title: "Product Q&A",
        content: `Answer customer questions about your products:

- Questions appear on the product page publicly
- Any customer can ask a question
- You (the seller) provide answers
- Q&A helps reduce pre-purchase doubts

**Why Q&A Matters:**
- Reduces customer support requests
- Helps other shoppers with similar questions
- Shows you're an engaged, responsive seller
- Can highlight product features customers care about`,
      },
      {
        id: "social-sharing",
        title: "Social Media Sharing",
        content: `Help customers share your products:

**Product Share Button:**
- Every product page has a share button
- Customers can share via:
  - **WhatsApp** — Direct message with product link
  - **Facebook** — Post to their timeline
  - **Copy Link** — Share anywhere
  - **Native Share** — Use device's built-in sharing (mobile)

**As a Seller:**
- Share your own products on social media to drive traffic
- Your store link: /store/your-slug
- Each product has a unique shareable URL
- Consider creating social media posts featuring your products`,
      },
    ],
  },
];

export default function SellerManual() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("getting-started");
  const [activeSubsection, setActiveSubsection] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<string[]>(["getting-started"]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubsectionClick = (sectionId: string, subId: string) => {
    setActiveSection(sectionId);
    setActiveSubsection(subId);
    if (!expandedSections.includes(sectionId)) {
      setExpandedSections(prev => [...prev, sectionId]);
    }
  };

  const currentSection = sections.find(s => s.id === activeSection);
  const currentSub = currentSection?.subsections.find(s => s.id === activeSubsection);

  // Search
  const filteredSections = searchQuery
    ? sections.map(sec => ({
        ...sec,
        subsections: sec.subsections.filter(
          sub =>
            sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.content.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(sec => sec.subsections.length > 0)
    : sections;

  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;

      // Headers
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        return (
          <h3 key={i} className="font-bold text-foreground mt-4 mb-2 text-base">
            {trimmed.replace(/\*\*/g, "")}
          </h3>
        );
      }

      // Bold sections within lines
      const parts = trimmed.split(/(\*\*.*?\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j} className="text-foreground">{part.replace(/\*\*/g, "")}</strong>;
        }
        return <span key={j}>{part}</span>;
      });

      // List items
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        return (
          <li key={i} className="ml-4 text-muted-foreground text-sm leading-relaxed">
            {rendered}
          </li>
        );
      }

      // Numbered items
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <li key={i} className="ml-4 text-muted-foreground text-sm leading-relaxed list-decimal">
            {rendered}
          </li>
        );
      }

      return (
        <p key={i} className="text-muted-foreground text-sm leading-relaxed">
          {rendered}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <NocapLogo className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Seller Manual</h1>
            <p className="text-xs text-muted-foreground">Complete guide for marketplace sellers</p>
          </div>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary shrink-0">
            v2.0
          </Badge>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border shrink-0">
          <ScrollArea className="h-auto md:h-[calc(100vh-64px)]">
            <div className="p-3">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search manual..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm bg-muted/50"
                />
              </div>

              {filteredSections.map((section) => (
                <Collapsible
                  key={section.id}
                  open={expandedSections.includes(section.id)}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 text-left">
                    {expandedSections.includes(section.id) ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <section.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{section.title}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-5 pl-4 border-l border-border/50 space-y-0.5 pb-1">
                      {section.subsections.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleSubsectionClick(section.id, sub.id)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                            activeSubsection === sub.id
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          }`}
                        >
                          {sub.title}
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <ScrollArea className="h-auto md:h-[calc(100vh-64px)]">
            <div className="p-4 md:p-8 max-w-3xl">
              {currentSub ? (
                <>
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <span>{currentSection?.title}</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground">{currentSub.title}</span>
                  </div>

                  <h2 className="text-2xl font-bold text-foreground mb-4">{currentSub.title}</h2>

                  {/* Screenshot */}
                  {currentSub.screenshot && (
                    <Card className="mb-6 overflow-hidden border-border/50">
                      <CardContent className="p-0">
                        <img
                          src={currentSub.screenshot}
                          alt={currentSub.title}
                          className="w-full rounded-lg"
                          loading="lazy"
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Content */}
                  <div className="space-y-1">
                    {renderContent(currentSub.content)}
                  </div>

                  {/* Tips */}
                  {currentSub.tips && currentSub.tips.length > 0 && (
                    <Card className="mt-6 bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                          💡 Pro Tips
                        </h4>
                        <ul className="space-y-1.5">
                          {currentSub.tips.map((tip, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between mt-8 pt-4 border-t border-border/50">
                    {(() => {
                      const allSubs = sections.flatMap(s => s.subsections.map(sub => ({ sectionId: s.id, ...sub })));
                      const currentIndex = allSubs.findIndex(s => s.id === activeSubsection);
                      const prev = currentIndex > 0 ? allSubs[currentIndex - 1] : null;
                      const next = currentIndex < allSubs.length - 1 ? allSubs[currentIndex + 1] : null;
                      return (
                        <>
                          {prev ? (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleSubsectionClick(prev.sectionId, prev.id)}>
                              ← {prev.title}
                            </Button>
                          ) : <div />}
                          {next ? (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleSubsectionClick(next.sectionId, next.id)}>
                              {next.title} →
                            </Button>
                          ) : <div />}
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a topic from the sidebar</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
