import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Upload, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Branch { id: string; branch_name: string; }

const THEMES = [
  { value: "classic", label: "Classic", desc: "Clean white card grid" },
  { value: "bold", label: "Bold", desc: "Dark hero with colour accents" },
  { value: "minimal", label: "Minimal", desc: "Editorial list layout" },
];

export default function ManageSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [storeId, setStoreId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);

  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("classic");
  const [primaryColor, setPrimaryColor] = useState("#FFD700");
  const [status, setStatus] = useState("draft");
  const [branchId, setBranchId] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [shippingRate, setShippingRate] = useState("0");
  const [freeShippingMin, setFreeShippingMin] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: branchData }, { data: storeData }] = await Promise.all([
        supabase.from("merchant_branches").select("id, branch_name").eq("merchant_user_id", user.id),
        supabase.from("marketplace_stores").select("*").eq("merchant_user_id", user.id).single(),
      ]);
      setBranches((branchData as Branch[]) || []);
      if (storeData) {
        setStoreId(storeData.id);
        setStoreName(storeData.store_name);
        setSlug(storeData.slug);
        setTagline(storeData.tagline ?? "");
        setDescription(storeData.description ?? "");
        setTheme(storeData.theme);
        setPrimaryColor(storeData.primary_color);
        setStatus(storeData.status);
        setBranchId(storeData.branch_id);
        setWhatsapp(storeData.whatsapp ?? "");
        setEmail(storeData.email ?? "");
        setShippingRate(String(storeData.shipping_flat_rate ?? 0));
        setFreeShippingMin(storeData.free_shipping_min ? String(storeData.free_shipping_min) : "");
        setLogoUrl(storeData.logo_url ?? "");
        setBannerUrl(storeData.banner_url ?? "");
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const uploadImage = async (file: File, type: "logo" | "banner") => {
    if (!user) return;
    setUploading(type);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("marketplace-assets").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("marketplace-assets").getPublicUrl(path);
      if (type === "logo") setLogoUrl(publicUrl);
      else setBannerUrl(publicUrl);
    }
    setUploading(null);
  };

  const save = async () => {
    if (!storeName.trim() || !slug.trim() || !branchId) {
      toast({ title: "Store name, slug and branch are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      merchant_user_id: user!.id,
      branch_id: branchId,
      store_name: storeName.trim(),
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      theme,
      primary_color: primaryColor,
      status,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      shipping_flat_rate: Number(shippingRate) || 0,
      free_shipping_min: freeShippingMin ? Number(freeShippingMin) : null,
      logo_url: logoUrl || null,
      banner_url: bannerUrl || null,
    };

    let error;
    if (storeId) {
      ({ error } = await supabase.from("marketplace_stores").update(payload).eq("id", storeId));
    } else {
      const { data, error: e } = await supabase.from("marketplace_stores").insert(payload).select().single();
      error = e;
      if (data) setStoreId(data.id);
    }

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: storeId ? "Store updated!" : "Store created!" });
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/marketplace/manage")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <span className="font-bold text-foreground font-display flex-1">Store Settings</span>
          <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save
          </Button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        <Card><CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm text-foreground">Basic Info</p>
          <div className="space-y-1"><Label className="text-xs">Store Name *</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="My Awesome Store" className="h-9 text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Slug (URL) *</Label><Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))} placeholder="my-store" className="h-9 text-sm font-mono" /><p className="text-[10px] text-muted-foreground">/marketplace/{slug || "your-slug"}</p></div>
          <div className="space-y-1"><Label className="text-xs">Tagline</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short catchy description" className="h-9 text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell customers about your store" className="min-h-[70px] text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="60123456789" className="h-9 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="store@email.com" className="h-9 text-sm" /></div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm text-foreground">Branding</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Logo</Label>
              <button onClick={() => logoRef.current?.click()} className="relative h-20 w-20 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:bg-muted transition-colors">
                {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" /> : uploading === "logo" ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Store className="h-6 w-6 text-muted-foreground" />}
              </button>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "logo")} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Primary Colour</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 text-sm font-mono" />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Banner Image</Label>
            <button onClick={() => bannerRef.current?.click()} className="w-full h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:bg-muted transition-colors">
              {bannerUrl ? <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" /> : uploading === "banner" ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
            </button>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "banner")} />
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm text-foreground">Theme & Status</p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button key={t.value} onClick={() => setTheme(t.value)} className={`p-2.5 rounded-lg border-2 text-left transition-all ${theme === t.value ? "border-primary bg-primary/5" : "border-border"}`}>
                <p className="text-xs font-bold text-foreground">{t.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Store Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft (not visible)</SelectItem>
                <SelectItem value="live">Live (public)</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm text-foreground">Payments & Shipping</p>
          <div className="space-y-1">
            <Label className="text-xs">Linked Branch *</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select branch for payments" /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Flat Shipping Rate (RM)</Label><Input type="number" value={shippingRate} onChange={(e) => setShippingRate(e.target.value)} placeholder="0" className="h-9 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Free Shipping Min (RM)</Label><Input type="number" value={freeShippingMin} onChange={(e) => setFreeShippingMin(e.target.value)} placeholder="Optional" className="h-9 text-sm" /></div>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
