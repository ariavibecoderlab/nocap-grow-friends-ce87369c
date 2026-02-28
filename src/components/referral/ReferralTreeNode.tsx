import { useState } from "react";
import { ChevronDown, ChevronRight, Phone, MessageCircle } from "lucide-react";

export interface TreeNode {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  tier: number; // relative to the root (you)
  children: TreeNode[];
}

const tierColors: Record<number, { bg: string; text: string; dot: string; line: string }> = {
  1: { bg: "bg-secondary/15", text: "text-secondary", dot: "bg-secondary", line: "border-secondary/40" },
  2: { bg: "bg-blue-500/15", text: "text-blue-400", dot: "bg-blue-400", line: "border-blue-400/40" },
  3: { bg: "bg-purple-500/15", text: "text-purple-400", dot: "bg-purple-400", line: "border-purple-400/40" },
  4: { bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400", line: "border-amber-400/40" },
  5: { bg: "bg-white/10", text: "text-white/50", dot: "bg-white/40", line: "border-white/20" },
};

function getColors(tier: number) {
  return tierColors[Math.min(tier, 5)] || tierColors[5];
}

export function ReferralTreeNode({ node, isLast = false }: { node: TreeNode; isLast?: boolean }) {
  const [expanded, setExpanded] = useState(node.tier <= 2);
  const colors = getColors(node.tier);
  const hasChildren = node.children.length > 0;
  const initial = (node.full_name || "?").charAt(0).toUpperCase();

  return (
    <div className="relative">
      {/* Vertical connector from parent */}
      {isLast ? (
        <div className={`absolute left-0 top-0 h-[22px] w-px border-l-2 border-dashed ${colors.line}`} />
      ) : (
        <div className={`absolute left-0 top-0 h-full w-px border-l-2 border-dashed ${colors.line}`} />
      )}

      {/* Horizontal branch */}
      <div className={`absolute left-0 top-[22px] w-5 border-t-2 border-dashed ${colors.line}`} />
      {/* Branch dot */}
      <div className={`absolute left-[-5px] top-[17px] h-2.5 w-2.5 rounded-full ${colors.dot} ring-2 ring-primary z-10`} />

      <div className="pl-7 pt-1">
        {/* Node row */}
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${hasChildren ? "hover:bg-white/5 cursor-pointer" : "cursor-default"}`}
        >
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors.bg} text-xs font-bold ${colors.text}`}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-white/90 truncate">{node.full_name || "Member"}</span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${colors.bg} ${colors.text}`}>
                T{node.tier}
              </span>
              {hasChildren && (
                <span className="text-[10px] text-white/30">({node.children.length})</span>
              )}
            </div>
            {node.tier === 1 && (node.phone || node.email) && (
              <span className="text-[10px] text-white/40 truncate block">
                {[node.phone, node.email].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>

          {/* Contact buttons for tier 1 */}
          {node.tier === 1 && node.phone && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={`tel:${node.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-secondary/20 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-secondary" />
              </a>
              <a
                href={`https://wa.me/${node.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-green-500/20 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5 text-green-400" />
              </a>
            </div>
          )}

          {hasChildren && (
            <div className="shrink-0">
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-white/30" />
              ) : (
                <ChevronRight className="h-4 w-4 text-white/30" />
              )}
            </div>
          )}
        </button>

        {/* Children */}
        {expanded && hasChildren && (
          <div className="ml-2 mt-0.5">
            {node.children.map((child, idx) => (
              <ReferralTreeNode
                key={child.user_id}
                node={child}
                isLast={idx === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
