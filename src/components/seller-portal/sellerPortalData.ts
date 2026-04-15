import {
  UserPlus, Store, Package, ShoppingCart,
  Tag, Zap, Gift, ShoppingBag,
  Truck, Wallet, MessageSquare,
  Palette, BarChart3, Shield
} from "lucide-react";

export interface GuideStep {
  title: string;
  description: string;
  tip?: string;
}

export interface Guide {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  steps: GuideStep[];
  nextGuide?: string;
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  guides: Guide[];
}

export const journeys: Journey[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Your journey from member to first sale",
    guides: [
      {
        id: "member-to-merchant",
        title: "From Member to Merchant",
        subtitle: "Register, submit documents & get approved",
        icon: UserPlus,
        nextGuide: "setting-up-store",
        steps: [
          { title: "Log in to your NOcap account", description: "Sign in with your member credentials at the login page. If you don't have an account yet, register as a member first." },
          { title: "Navigate to Merchant Registration", description: "Go to the Dashboard and tap 'Become a Merchant' or visit /merchant/register directly.", tip: "Make sure your profile (name, phone, email) is complete before applying." },
          { title: "Fill in your business details", description: "Enter your business name, registration number (SSM), business type, and a short description of what you sell." },
          { title: "Upload required documents", description: "Attach your SSM certificate, a copy of your IC (front & back), and a business bank account statement for verification." },
          { title: "Set up your bank account", description: "Provide your bank name, account number, and account holder name. This is where your withdrawal payouts will be sent.", tip: "Double-check your bank details — incorrect info will delay your first withdrawal." },
          { title: "Submit & wait for approval", description: "Once submitted, an administrator will review your application. You'll receive a notification when you're approved." },
          { title: "Access your Merchant Dashboard", description: "After approval, a new 'Merchant' option appears in your navigation. Tap it to access your merchant dashboard and start setting up your store." },
        ],
      },
      {
        id: "setting-up-store",
        title: "Setting Up Your Store",
        subtitle: "Theme, logo, banners & store info",
        icon: Store,
        nextGuide: "uploading-products",
        steps: [
          { title: "Open the Shop tab", description: "In your Merchant Dashboard, navigate to the 'Shop' tab. This is your store management hub." },
          { title: "Choose a store theme", description: "Go to Settings > Theme and pick from Classic, Modern, Minimal, Bold, or Elegant. Each theme changes your storefront's look and feel.", tip: "Preview each theme before saving — the 'Modern' theme works great for fashion and lifestyle brands." },
          { title: "Upload your store logo", description: "Click the logo area and upload a square image (recommended 512×512px). This appears in your store header and product listings." },
          { title: "Set up your banner carousel", description: "Add 1–5 banner images (1200×400px recommended). Each banner can link to a product, category, or external URL." },
          { title: "Fill in store information", description: "Add your store name, tagline, description, contact email, phone number, and physical address if applicable." },
          { title: "Configure shipping & checkout", description: "Set your default shipping fee, free shipping threshold, and accepted payment methods under Settings > Checkout.", tip: "Offering free shipping above a certain amount (e.g. RM 50) can increase your average order value." },
          { title: "Preview & publish", description: "Use the 'View Store' button to preview your storefront. When satisfied, your store is live and ready for products!" },
        ],
      },
      {
        id: "uploading-products",
        title: "Uploading Your First Products",
        subtitle: "Products, images, categories & variants",
        icon: Package,
        nextGuide: "first-sale",
        steps: [
          { title: "Go to the Products tab", description: "In your Merchant Dashboard, click the 'Products' tab to see your product management area." },
          { title: "Create product categories", description: "Before adding products, set up categories (e.g. 'T-Shirts', 'Accessories'). Categories help buyers browse your store.", tip: "Keep category names short and clear — buyers scan quickly." },
          { title: "Add a new product", description: "Click '+ Add Product'. Enter the product name, description, price, and stock quantity." },
          { title: "Upload product images", description: "Add up to 5 images per product. The first image becomes the thumbnail. Use well-lit photos on clean backgrounds.", tip: "Images are automatically compressed to keep your store fast. Upload the highest quality you have." },
          { title: "Set up variants (optional)", description: "If your product comes in sizes or colours, use the Variant Editor to add options like 'Size: S, M, L' with individual stock and price adjustments." },
          { title: "Add SKU & weight", description: "Enter a SKU code for your own tracking and the product weight (in kg) for shipping calculations." },
          { title: "Set product status & publish", description: "Choose 'Active' to make the product visible immediately, or 'Draft' to save without publishing. Click 'Save' to finish.", tip: "Use bulk CSV upload to add many products at once — go to Products > Import/Export." },
        ],
      },
      {
        id: "first-sale",
        title: "Getting Your First Sale",
        subtitle: "Share, sell, fulfill & ship",
        icon: ShoppingCart,
        nextGuide: "discount-campaigns",
        steps: [
          { title: "Share your store link", description: "Copy your store URL from the dashboard and share it on social media, WhatsApp groups, or your website." },
          { title: "Feature your best products", description: "Mark products as 'Featured' to highlight them on your store homepage. Featured items appear in a prominent carousel." },
          { title: "Wait for your first order", description: "When a buyer places an order, you'll see it in the Orders tab with status 'Pending'. You'll also receive a notification.", tip: "Enable push notifications so you never miss an order!" },
          { title: "Review the order details", description: "Click the order to see buyer info, items ordered, shipping address, and payment status." },
          { title: "Update order status", description: "Move the order through the pipeline: Pending → Processing → Shipped. Use the Kanban board for a visual workflow." },
          { title: "Add tracking number", description: "Enter the courier tracking number so your buyer can track their delivery in real time." },
          { title: "Complete the order", description: "Once delivered, mark the order as 'Delivered'. The sale amount (minus platform fee) is added to your merchant wallet.", tip: "Print a Sales Order PDF for your records by clicking the print icon on any order." },
        ],
      },
    ],
  },
  {
    id: "marketing-growth",
    title: "Marketing & Growth",
    description: "Campaigns, promotions & re-engagement",
    guides: [
      {
        id: "discount-campaigns",
        title: "Running Discount Campaigns",
        subtitle: "Discount codes, rules & minimum purchase",
        icon: Tag,
        nextGuide: "flash-sales",
        steps: [
          { title: "Open the Discounts tab", description: "In your Merchant Dashboard, navigate to the 'Discounts' section to manage all your promotional offers." },
          { title: "Create a discount code", description: "Click '+ New Code'. Enter a code name (e.g. 'WELCOME10'), choose percentage or fixed amount, and set the value." },
          { title: "Set conditions", description: "Configure minimum order amount, maximum uses, and expiry date. These prevent abuse and control your budget.", tip: "A 'first purchase' discount of 10-15% is one of the most effective conversion tools." },
          { title: "Create automatic discount rules", description: "Go to Discount Rules to set up auto-applied discounts like 'Buy 3, get 10% off' or 'Spend RM 100, get RM 15 off'." },
          { title: "Set rule priority", description: "If multiple rules apply, the system uses priority (lower number = higher priority). Only the highest priority rule applies." },
          { title: "Share your codes", description: "Promote your discount codes on social media, in your store announcement banner, or via direct messaging to followers." },
          { title: "Track performance", description: "Monitor how many times each code has been used in the Discounts tab. Analyse which promotions drive the most sales." },
        ],
      },
      {
        id: "flash-sales",
        title: "Flash Sales & Collections",
        subtitle: "Time-limited deals & curated groups",
        icon: Zap,
        nextGuide: "bundles-gift-cards",
        steps: [
          { title: "Navigate to the Flash tab", description: "In your Merchant Dashboard, go to the 'Flash' tab to create and manage time-limited deals." },
          { title: "Create a flash sale", description: "Select a product, set the flash price (lower than regular), start/end time, and maximum quantity available at this price.", tip: "Flash sales of 24-48 hours create urgency. Shorter windows convert better." },
          { title: "Monitor live sales", description: "Watch the sold quantity update in real time. The flash sale automatically deactivates when time expires or stock runs out." },
          { title: "Set up product collections", description: "Go to the Collections section. Create themed groups like 'Summer Essentials' or 'Best Sellers' to curate your catalogue." },
          { title: "Add products to collections", description: "Drag and reorder products within a collection. Set a cover image and description for each collection." },
          { title: "Feature collections on your store", description: "Active collections appear on your storefront. Buyers can browse by collection for a more curated shopping experience." },
        ],
      },
      {
        id: "bundles-gift-cards",
        title: "Product Bundles & Gift Cards",
        subtitle: "Bundle pricing & digital gift cards",
        icon: Gift,
        nextGuide: "abandoned-carts",
        steps: [
          { title: "Create a product bundle", description: "In the Bundles tab, click '+ New Bundle'. Give it a name, description, and a bundle image." },
          { title: "Add products to the bundle", description: "Select 2 or more products and set the quantity for each. The system calculates the compare-at price automatically." },
          { title: "Set the bundle price", description: "Enter a bundle price lower than the sum of individual items. The savings are displayed to buyers.", tip: "Bundles that save 15-20% sell best. Too small a discount doesn't motivate, too large hurts margins." },
          { title: "Activate the bundle", description: "Toggle the bundle to 'Active'. It will appear on your storefront alongside regular products." },
          { title: "Create gift cards", description: "Go to Gift Cards tab. Set denominations (e.g. RM 25, RM 50, RM 100) and optional expiry dates." },
          { title: "Gift card delivery", description: "Buyers can send gift cards with a personal message. Recipients receive a unique code to redeem at checkout." },
        ],
      },
      {
        id: "abandoned-carts",
        title: "Recovering Abandoned Carts",
        subtitle: "View & re-engage potential buyers",
        icon: ShoppingBag,
        nextGuide: "order-fulfillment",
        steps: [
          { title: "Check the Abandoned Carts tab", description: "In your Merchant Dashboard, the Abandoned Carts section shows visitors who added items but didn't complete checkout." },
          { title: "Review cart details", description: "See what products were in the cart, the subtotal, and buyer contact info (if they were logged in)." },
          { title: "Understand recovery status", description: "Carts are tagged as 'Abandoned', 'Reminded', or 'Recovered'. This helps you track your re-engagement efforts." },
          { title: "Re-engage the buyer", description: "Use the buyer's email or phone to send a friendly reminder. Consider offering a small discount to incentivise completion.", tip: "The best time to follow up is within 1-3 hours of abandonment. Recovery rates drop sharply after 24 hours." },
          { title: "Reduce future abandonment", description: "Common causes: high shipping fees, complicated checkout, lack of payment options. Review your checkout settings to optimise." },
        ],
      },
    ],
  },
  {
    id: "operations-finance",
    title: "Operations & Finance",
    description: "Fulfillment, payouts & customer relations",
    guides: [
      {
        id: "order-fulfillment",
        title: "Order Fulfillment Pipeline",
        subtitle: "Kanban board, status updates & printing",
        icon: Truck,
        nextGuide: "withdrawals-settlement",
        steps: [
          { title: "Open the Orders tab", description: "Your Merchant Dashboard shows all incoming orders. Use the Kanban view for a visual drag-and-drop workflow." },
          { title: "Process new orders", description: "New orders arrive as 'Pending'. Review the items, quantities, and shipping address before processing.", tip: "Use the search and filter tools to quickly find specific orders by number, buyer name, or status." },
          { title: "Update to Processing", description: "Once you've confirmed stock and started packing, move the order to 'Processing'. The buyer is notified of the update." },
          { title: "Print sales order PDF", description: "Click the print icon to generate a branded PDF with order details, buyer info, and item list. Include this in the package." },
          { title: "Ship the order", description: "Enter the courier name and tracking number. Move the order to 'Shipped'. The buyer can now track their delivery." },
          { title: "Mark as Delivered", description: "Once confirmed delivered, update to 'Delivered'. The order revenue (minus platform fee) is credited to your merchant wallet." },
          { title: "Handle returns if needed", description: "If a buyer requests a return, review it in the Returns tab. Approve or reject with a note to the buyer." },
        ],
      },
      {
        id: "withdrawals-settlement",
        title: "Managing Withdrawals & Settlement",
        subtitle: "Request payouts & track reports",
        icon: Wallet,
        nextGuide: "customer-chat-reviews",
        steps: [
          { title: "Check your merchant wallet", description: "Your wallet balance shows the total available for withdrawal. This includes completed order revenue minus platform fees." },
          { title: "Request a withdrawal", description: "Go to the Withdrawals tab and click 'New Withdrawal'. Enter the amount you want to cash out.", tip: "There's a minimum withdrawal amount. Check your settings for the current threshold." },
          { title: "Confirm bank details", description: "Verify your bank account information is correct. Withdrawals go to the bank account registered during merchant setup." },
          { title: "Submit for approval", description: "Your withdrawal request is submitted to an administrator for approval. You'll be notified once it's processed." },
          { title: "Track withdrawal status", description: "View all your withdrawal requests and their statuses (Pending, Approved, Completed, Rejected) in the Withdrawals tab." },
          { title: "Download settlement reports", description: "Monthly settlement reports are generated automatically. Download PDFs showing all transactions, fees, and net payouts." },
          { title: "Download withdrawal receipts", description: "For each completed withdrawal, you can generate a branded PDF receipt for your accounting records." },
        ],
      },
      {
        id: "customer-chat-reviews",
        title: "Customer Chat & Reviews",
        subtitle: "Respond to inquiries & manage feedback",
        icon: MessageSquare,
        nextGuide: "store-customization",
        steps: [
          { title: "Monitor the Chat tab", description: "The Chat tab shows all buyer conversations. A badge indicates unread messages so you never miss an inquiry.", tip: "Respond within 1 hour during business hours. Fast response times build buyer confidence." },
          { title: "Reply to product inquiries", description: "Buyers can message you about specific products. Your replies appear in real time — no page refresh needed." },
          { title: "View product reviews", description: "Go to the Reviews tab to see all ratings and comments left by buyers on your products." },
          { title: "Reply to reviews", description: "Add a merchant reply to any review. Thank positive reviewers and address concerns professionally." },
          { title: "Use reviews for improvement", description: "Look for patterns in feedback. Common complaints about sizing, packaging, or delivery speed are opportunities to improve." },
        ],
      },
    ],
  },
  {
    id: "advanced-features",
    title: "Advanced Features",
    description: "Customization, analytics & integrations",
    guides: [
      {
        id: "store-customization",
        title: "Store Customization & SEO",
        subtitle: "Page builder, domain, blog & SEO",
        icon: Palette,
        nextGuide: "analytics-reports",
        steps: [
          { title: "Use the Page Builder", description: "In Settings > Pages, use the visual section editor to add hero banners, featured products, testimonials, and custom content blocks." },
          { title: "Create custom pages", description: "Add pages like 'About Us', 'Shipping Policy', or 'FAQ'. Each page gets its own URL slug on your store.", tip: "A clear returns/refund policy page reduces buyer hesitation and support inquiries." },
          { title: "Set up a store blog", description: "Go to Blog to create posts about your products, industry tips, or brand stories. Blog posts improve SEO and engagement." },
          { title: "Configure SEO settings", description: "Set meta titles, descriptions, and keywords for your store and individual products. This helps with search engine visibility." },
          { title: "Add a custom domain", description: "In Settings > Domain, add your own domain (e.g. mystore.com). Follow the DNS verification steps to connect it." },
          { title: "Customise navigation menus", description: "Edit header and footer menus to link to categories, collections, custom pages, or external URLs." },
        ],
      },
      {
        id: "analytics-reports",
        title: "Analytics & Sales Reports",
        subtitle: "Metrics, forecasts & CRM",
        icon: BarChart3,
        nextGuide: "staff-api",
        steps: [
          { title: "View the Stats tab", description: "Your Merchant Dashboard Stats tab shows key metrics: total revenue, orders, average order value, and conversion trends." },
          { title: "Analyse product performance", description: "See which products have the most views, sales, and revenue. Identify your best sellers and underperformers." },
          { title: "Check revenue forecasts", description: "The Revenue Forecast chart projects your next-period earnings based on historical trends.", tip: "Use these forecasts to plan inventory purchases and marketing spend." },
          { title: "Generate sales reports", description: "Go to Sales Reports to generate date-range reports. Export to PDF for your records or accountant." },
          { title: "Use the CRM", description: "The Customer tab shows all your buyers: total orders, lifetime spend, last purchase date, and custom tags." },
          { title: "Segment your customers", description: "Tag customers (e.g. 'VIP', 'Repeat Buyer', 'Wholesale') and add notes for personalised follow-up." },
        ],
      },
      {
        id: "staff-api",
        title: "Staff Permissions & API Integration",
        subtitle: "Multi-staff access, API apps & webhooks",
        icon: Shield,
        steps: [
          { title: "Invite staff members", description: "In Settings > Staff, invite team members by email. They'll receive access to your merchant dashboard." },
          { title: "Set staff permissions", description: "Assign granular permissions: Products, Orders, Analytics, Settings, etc. Staff only see what they're allowed to.", tip: "Give order fulfillment staff only 'Orders' permission. Keep 'Settings' and 'Finance' restricted to owners." },
          { title: "Create API applications", description: "Go to Settings > API to register an API app. You'll receive an API key and secret for programmatic access." },
          { title: "Configure webhooks", description: "Set a webhook URL to receive real-time notifications when orders are placed, paid, or status changes." },
          { title: "Use sandbox mode", description: "Toggle your API app to Sandbox mode for testing. Sandbox transactions don't affect real balances or inventory." },
          { title: "Review API logs", description: "The API Logs tab shows all requests made by your applications: endpoint, status code, response time, and payload." },
        ],
      },
    ],
  },
];
