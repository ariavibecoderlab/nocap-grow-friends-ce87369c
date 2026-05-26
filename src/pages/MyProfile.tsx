import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import {
  ArrowLeft,
  Mail,
  Shield,
  Save,
  Pencil,
  X,
  Camera,
  User,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PHONE_REGEX = /^01[0-9]-?\d{7,8}$/;

const formatPhoneDisplay = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return phone;
};

const MyProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<{
    phone?: string;
    full_name?: string;
    address?: string;
  }>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be under 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: "Failed to upload photo.",
        variant: "destructive",
      });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", user.id);
    setProfile((p: any) => ({ ...p, avatar_url: avatarUrl }));
    setUploadingAvatar(false);
    toast({ title: "Photo updated!" });
  };

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
        newErrors.phone =
          "Use Malaysian format: 01X-XXXXXXX (e.g. 012-3456789)";
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

    if (phoneDigits && phoneDigits !== profile.phone) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phoneDigits)
        .neq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        setErrors((p) => ({
          ...p,
          phone: "This phone number is already registered to another account",
        }));
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
      toast({
        title: "Couldn't save changes",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } else {
      setProfile({
        ...profile,
        full_name: form.full_name.trim(),
        phone: phoneDigits,
        address: form.address.trim(),
      });
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

  if (authLoading) return null;

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/50 hover:text-white hover:bg-white/10"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-white">
              My Profile
            </h1>
            {!editing ? (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-white/50 hover:text-white hover:bg-white/10"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-white/50 hover:text-white hover:bg-white/10"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-secondary/30">
              <AvatarImage
                src={profile?.avatar_url}
                alt={profile?.full_name || "Avatar"}
              />
              <AvatarFallback className="bg-white/10 text-white text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary hover:bg-secondary/90 transition-colors"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          {uploadingAvatar && (
            <p className="mt-2 text-xs text-white/40">Uploading...</p>
          )}
          <h2 className="mt-3 font-display text-lg font-bold text-white">
            {profile?.full_name || "Member"}
          </h2>
          <p className="text-xs text-white/40">{user?.email}</p>
        </div>

        {/* Profile Info */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 space-y-4">
            {editing ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-white/70">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => {
                      setForm({ ...form, full_name: e.target.value });
                      setErrors((p) => ({ ...p, full_name: undefined }));
                    }}
                    placeholder="Your full name"
                    maxLength={100}
                    className={`border-white/10 bg-white/5 text-white placeholder:text-white/30 ${errors.full_name ? "border-destructive" : ""}`}
                  />
                  {errors.full_name && (
                    <p className="text-xs text-destructive">
                      {errors.full_name}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-white/70">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => {
                      setForm({ ...form, phone: e.target.value });
                      setErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    placeholder="e.g. 012-3456789"
                    maxLength={13}
                    className={`border-white/10 bg-white/5 text-white placeholder:text-white/30 ${errors.phone ? "border-destructive" : ""}`}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                  <p className="text-xs text-white/40">
                    Malaysian format: 01X-XXXXXXX
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-white/70">
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => {
                      setForm({ ...form, address: e.target.value });
                      setErrors((p) => ({ ...p, address: undefined }));
                    }}
                    placeholder="Your address"
                    maxLength={200}
                    className={`border-white/10 bg-white/5 text-white placeholder:text-white/30 ${errors.address ? "border-destructive" : ""}`}
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive">{errors.address}</p>
                  )}
                </div>
                <Button
                  className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-white/40" />
                  <span className="text-white/70">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/40">Phone:</span>
                  <span className="text-white/70">
                    {profile?.phone
                      ? formatPhoneDisplay(profile.phone)
                      : "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/40">Address:</span>
                  <span className="text-white/70">
                    {profile?.address || "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <Shield className="h-4 w-4 text-white/40" />
                  <span>PIN: {profile?.has_pin ? "Set" : "Not set"}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <PushNotificationToggle />
      </div>

      <BottomNav />
    </div>
  );
};

export default MyProfile;
