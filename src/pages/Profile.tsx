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
import { LogOut, Mail, Shield, Save, Pencil, X } from "lucide-react";
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
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary px-4 pb-8 pt-8 text-primary-foreground">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-xl font-bold">Profile</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <Card className="-mt-4 border-border/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">
              {profile?.full_name || "Member"}
            </CardTitle>
            {!editing ? (
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{user?.email}</span>
            </div>

            {editing ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => { setForm({ ...form, full_name: e.target.value }); setErrors((p) => ({ ...p, full_name: undefined })); }}
                    placeholder="Your full name"
                    maxLength={100}
                    className={errors.full_name ? "border-destructive" : ""}
                  />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors((p) => ({ ...p, phone: undefined })); }}
                    placeholder="e.g. 012-3456789"
                    maxLength={13}
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  <p className="text-xs text-muted-foreground">Malaysian format: 01X-XXXXXXX</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => { setForm({ ...form, address: e.target.value }); setErrors((p) => ({ ...p, address: undefined })); }}
                    placeholder="Your address"
                    maxLength={200}
                    className={errors.address ? "border-destructive" : ""}
                  />
                  {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                </div>
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{profile?.phone ? formatPhoneDisplay(profile.phone) : "Not set"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Address:</span>
                  <span>{profile?.address || "Not set"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>PIN: {profile?.has_pin ? "Set" : "Not set"}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Button variant="destructive" className="mt-6 w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
