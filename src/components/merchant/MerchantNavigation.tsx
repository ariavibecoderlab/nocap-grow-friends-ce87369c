import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QrCode,
  Store,
  MessageCircle,
  MessageSquare,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  FileText,
  BarChart3,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  Shield,
  Search,
  ShoppingBag,
  Package,
  Percent,
  Users,
  Layers,
  Gift,
  Upload,
  BookOpen,
  Globe,
  CreditCard,
  Megaphone,
  Code,
  Radio,
  ScrollText,
  Settings2,
} from "lucide-react";

export interface NavItem {
  value: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export function getMerchantSections(chatUnread: number): NavSection[] {
  return [
    {
      id: "operations",
      label: "🏪 Operations",
      items: [
        { value: "qr", icon: QrCode, label: "QR Codes" },
        { value: "shop", icon: Store, label: "Shop & Products" },
        { value: "products", icon: Package, label: "My Products" },
        {
          value: "chat",
          icon: MessageCircle,
          label: "Customer Chat",
          badge: chatUnread,
        },
        { value: "kanban", icon: ClipboardList, label: "Order Fulfillment" },
        { value: "messages", icon: MessageSquare, label: "Messages" },
        { value: "live", icon: Radio, label: "Go Live" },
      ],
    },
    {
      id: "finance",
      label: "💰 Finance",
      items: [
        { value: "txns", icon: ArrowLeftRight, label: "Transactions" },
        { value: "withdraw", icon: Wallet, label: "Withdrawals" },
        { value: "dist", icon: TrendingUp, label: "Distributions" },
        { value: "reports", icon: FileText, label: "Settlement" },
      ],
    },
    {
      id: "insights",
      label: "📊 Insights & Growth",
      items: [
        { value: "analytics", icon: BarChart3, label: "Analytics" },
        { value: "sales", icon: DollarSign, label: "Sales Reports" },
        { value: "inventory", icon: AlertTriangle, label: "Inventory Alerts" },
        { value: "crm", icon: Users, label: "Customer CRM" },
      ],
    },
    {
      id: "marketing",
      label: "🎯 Marketing",
      items: [
        { value: "discounts", icon: Percent, label: "Discount Rules" },
        { value: "bundles", icon: Package, label: "Product Bundles" },
        { value: "collections", icon: Layers, label: "Collections" },
        { value: "giftcards", icon: Gift, label: "Gift Cards" },
        { value: "carts", icon: ShoppingBag, label: "Abandoned Carts" },
      ],
    },
    {
      id: "storefront",
      label: "🎨 Storefront",
      items: [
        { value: "storefront_hub", icon: Globe, label: "Storefront Hub" },
        { value: "import", icon: Upload, label: "Import / Export" },
      ],
    },
    {
      id: "config",
      label: "⚙️ Settings & Dev",
      items: [
        { value: "settings", icon: Settings2, label: "Branch Settings" },
        { value: "staff", icon: Shield, label: "Staff Permissions" },
        { value: "api", icon: Code, label: "API Apps" },
        { value: "logs", icon: ScrollText, label: "API Logs" },
        { value: "webhooks", icon: ScrollText, label: "Webhook Deliveries" },
      ],
    },
  ];
}

interface MerchantNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  chatUnread: number;
}

export default function MerchantNavigation({
  activeTab,
  onTabChange,
  chatUnread,
}: MerchantNavigationProps) {
  const sections = getMerchantSections(chatUnread);

  // Find which section the active tab belongs to
  const activeSection = sections.find((s) =>
    s.items.some((i) => i.value === activeTab)
  );
  const activeSectionId = activeSection?.id || "operations";
  const activeItem = activeSection?.items.find((i) => i.value === activeTab);

  // Items to show as sub-tabs for the active section
  const currentSection = sections.find((s) => s.id === activeSectionId);
  const currentItems = currentSection?.items || [];

  return (
    <div className="space-y-2">
      {/* Section selector */}
      <Select
        value={activeSectionId}
        onValueChange={(sectionId) => {
          const section = sections.find((s) => s.id === sectionId);
          if (section && section.items.length > 0) {
            onTabChange(section.items[0].value);
          }
        }}
      >
        <SelectTrigger className="w-full border-white/10 bg-white/5 text-white h-10">
          <SelectValue>
            <span className="flex items-center gap-2 text-sm">
              {currentSection?.label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-white/10">
          {sections.map((section) => (
            <SelectItem key={section.id} value={section.id} className="text-sm">
              {section.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sub-tabs for current section */}
      <div className="flex flex-wrap gap-1.5">
        {currentItems.map((item) => {
          const isActive = activeTab === item.value;
          return (
            <Button
              key={item.value}
              size="sm"
              variant={isActive ? "default" : "ghost"}
              className={`relative gap-1.5 text-xs h-8 px-3 ${
                isActive
                  ? "bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => onTabChange(item.value)}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
