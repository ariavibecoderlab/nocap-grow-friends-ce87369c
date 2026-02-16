import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import { LogOut, Mail, Shield, Save, Pencil, X, HelpCircle, FileText, Lock, Info, ChevronRight, KeyRound, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PHONE_REGEX = /^01[0-9]-?\d{7,8}$/;

const formatPhoneDisplay = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return phone;
};

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<{ phone?: string; full_name?: string; address?: string }>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        if (data) {
          setForm({
            full_name: data.full_name || "",
            phone: data.phone || "",
            address: data.address || "",
          });
        }
      });
  }, [user]);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!form.full_name.trim()) {
      newErrors.full_name = "Name is required";
    } else if (form.full_name.trim().length > 100) {
      newErrors.full_name = "Name must be under 100 characters";
    }

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (form.phone.trim()) {
      if (!/^01\d{8,9}$/.test(phoneDigits)) {
        newErrors.phone = "Use Malaysian format: 01X-XXXXXXX (e.g. 012-3456789)";
      }
    }

    if (form.address.trim().length > 200) {
      newErrors.address = "Address must be under 200 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    if (!validate()) return;

    setSaving(true);
    const phoneDigits = form.phone.replace(/\D/g, "");

    // Check phone uniqueness if changed
    if (phoneDigits && phoneDigits !== profile.phone) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phoneDigits)
        .neq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        setErrors((p) => ({ ...p, phone: "This phone number is already registered to another account" }));
        setSaving(false);
        return;
      }
    }
    const savePhone = form.phone.replace(/\D/g, "");
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        phone: savePhone,
        address: form.address.trim(),
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      setProfile({ ...profile, full_name: form.full_name.trim(), phone: phoneDigits, address: form.address.trim() });
      setEditing(false);
      setErrors({});
      toast({ title: "Profile updated" });
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setErrors({});
    setForm({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pb-6 pt-8">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-xl font-bold text-white">Profile</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg text-white">
              {profile?.full_name || "Member"}
            </CardTitle>
            {!editing ? (
              <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <Mail className="h-4 w-4 shrink-0 text-white/40" />
              <span>{user?.email}</span>
            </div>

            {editing ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-white/70">Full Name</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => { setForm({ ...form, full_name: e.target.value }); setErrors((p) => ({ ...p, full_name: undefined })); }}
                    placeholder="Your full name"
                    maxLength={100}
                    className={`border-white/10 bg-white/5 text-white placeholder:text-white/30 ${errors.full_name ? "border-destructive" : ""}`}
                  />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-white/70">Phone Number</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors((p) => ({ ...p, phone: undefined })); }}
                    placeholder="e.g. 012-3456789"
                    maxLength={13}
                    className={`border-white/10 bg-white/5 text-white placeholder:text-white/30 ${errors.phone ? "border-destructive" : ""}`}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  <p className="text-xs text-white/40">Malaysian format: 01X-XXXXXXX</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-white/70">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => { setForm({ ...form, address: e.target.value }); setErrors((p) => ({ ...p, address: undefined })); }}
                    placeholder="Your address"
                    maxLength={200}
                    className={`border-white/10 bg-white/5 text-white placeholder:text-white/30 ${errors.address ? "border-destructive" : ""}`}
                  />
                  {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                </div>
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/40">Phone:</span>
                  <span className="text-white/70">{profile?.phone ? formatPhoneDisplay(profile.phone) : "Not set"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/40">Address:</span>
                  <span className="text-white/70">{profile?.address || "Not set"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <Shield className="h-4 w-4 text-white/40" />
                  <span>PIN: {profile?.has_pin ? "Set" : "Not set"}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-white/40" />
            <h2 className="font-display text-sm font-semibold text-white/60">Settings</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: "Set Password", icon: KeyRound, path: "/set-password" },
              { label: "Help & Support", icon: HelpCircle, path: "/help-support" },
              { label: "Terms & Conditions", icon: FileText, path: "/terms" },
              { label: "Privacy Policy", icon: Lock, path: "/privacy" },
              { label: "About NOcap", icon: Info, path: "/about" },
            ].map((item) => (
              <Card key={item.path} className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate(item.path)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-white/40" />
                    <span className="text-sm text-white/70">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Button className="mt-6 w-full border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
