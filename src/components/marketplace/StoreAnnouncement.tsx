import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useState } from "react";
import { Json } from "@/integrations/supabase/types";

interface AnnouncementData {
  text?: string;
  bg_color?: string;
  text_color?: string;
  is_active?: boolean;
  link_url?: string;
  starts_at?: string;
  ends_at?: string;
}

export default function StoreAnnouncement({ announcement }: { announcement: Json }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!announcement || typeof announcement !== "object" || Array.isArray(announcement)) return null;
  const data = announcement as unknown as AnnouncementData;

  if (!data.is_active || !data.text || dismissed) return null;

  // Check scheduling
  const now = new Date();
  if (data.starts_at && new Date(data.starts_at) > now) return null;
  if (data.ends_at && new Date(data.ends_at) < now) return null;

  return (
    <div
      className="relative px-4 py-2 text-center text-sm font-medium cursor-pointer"
      style={{
        backgroundColor: data.bg_color || "#FFC800",
        color: data.text_color || "#1A1A2E",
      }}
      onClick={() => data.link_url && navigate(data.link_url)}
    >
      <span>{data.text}</span>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 transition-colors"
        onClick={e => { e.stopPropagation(); setDismissed(true); }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
