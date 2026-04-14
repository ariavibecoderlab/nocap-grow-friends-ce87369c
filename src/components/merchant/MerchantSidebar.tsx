import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getMerchantSections, type NavItem } from "@/components/merchant/MerchantNavigation";

interface MerchantSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  chatUnread: number;
}

export default function MerchantSidebar({ activeTab, onTabChange, chatUnread }: MerchantSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const sections = getMerchantSections(chatUnread);

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-primary">
      <SidebarContent className="bg-primary pt-2">
        {sections.map((section) => {
          const hasActive = section.items.some((i) => i.value === activeTab);

          return (
            <SidebarGroup key={section.id}>
              <SidebarGroupLabel className="text-white/40 text-[10px] uppercase tracking-wider px-3 mb-1">
                {collapsed ? section.label.slice(0, 2) : section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const isActive = activeTab === item.value;
                    const Icon = item.icon;

                    return (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          onClick={() => onTabChange(item.value)}
                          tooltip={collapsed ? item.label : undefined}
                          isActive={isActive}
                          className={`relative gap-2.5 px-3 py-2 text-sm transition-colors rounded-lg mx-1 ${
                            isActive
                              ? "bg-secondary/15 text-secondary font-semibold"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {item.badge && item.badge > 0 && (
                            <Badge
                              variant="destructive"
                              className={`h-4 min-w-[16px] px-1 text-[9px] font-bold ${
                                collapsed ? "absolute -top-1 -right-1" : "ml-auto"
                              }`}
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
