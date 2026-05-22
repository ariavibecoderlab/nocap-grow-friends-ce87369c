import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  ArrowRight,
  Store,
  FileText,
  CreditCard,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Percent,
} from "lucide-react";

type Step = "business" | "documents" | "bank" | "review";

interface FormData {
  business_name: string;
  business_type: string;
  business_registration_no: string;
  business_address: string;
  primary_category: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_holder: string;
}

interface UploadedDoc {
  name: string;
  path: string;
  url: string;
}

const PRIMARY_CATEGORIES = [
  { value: "food", label: "Food & Beverage" },
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "electronics", label: "Electronics & Gadgets" },
  { value: "beauty", label: "Beauty & Personal Care" },
  { value: "health", label: "Health & Wellness" },
  { value: "home", label: "Home & Living" },
  { value: "education", label: "Education & Training" },
  { value: "sports", label: "Sports & Outdoors" },
  { value: "kids", label: "Kids & Parenting" },
  { value: "services", label: "Services" },
  { value: "lifestyle", label: "Lifestyle & Hobbies" },
  { value: "other", label: "Other" },
];

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "Private Limited (Sdn Bhd)",
  "Enterprise",
  "Cooperative",
  "Other",
];

const BANK_LIST = [
  "Maybank",
  "CIMB Bank",
  "Public Bank",
  "RHB Bank",
  "Hong Leong Bank",
  "AmBank",
  "Bank Islam",
  "Bank Rakyat",
  "BSN",
  "Affin Bank",
  "Alliance Bank",
  "OCBC Bank",
  "HSBC",
  "Standard Chartered",
  "UOB",
  "Other",
];

const STEPS: { key: Step; label: string; icon: typeof Store }[] = [
  { key: "business", label: "Business", icon: Store },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "bank", label: "Bank", icon: CreditCard },
  { key: "review", label: "Review", icon: CheckCircle2 },
];

const MerchantRegister = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("business");
  const [submitting, setSubmitting] = useState(false);
  const [existingApp, setExistingApp] = useState<{ status: string; rejection_reason?: string | null } | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [commissionRate, setCommissionRate] = useState(10);

  const [form, setForm] = useState<FormData>({
    business_name: "",
    business_type: "",
    business_registration_no: "",
    business_address: "",
    primary_category: "",
    bank_name: "",
    bank_account_no: "",
    bank_account_holder: "",
  });

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Check for existing application
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      setLoadingApp(true);
      const { data } = await supabase
        .from("merchant_applications")
        .select("status, rejection_reason, business_name, business_type, business_registration_no, business_address, bank_name, bank_account_no, bank_account_holder")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setExistingApp({ status: data.status, rejection_reason: data.rejection_reason });
        // Pre-fill form if rejected (so user can re-apply)
        if (data.status === "rejected") {
          setForm({
            business_name: data.business_name || "",
            business_type: data.business_type || "",
            business_registration_no: data.business_registration_no || "",
            business_address: data.business_address || "",
            primary_category: (data as any).primary_category || "",
            bank_name: data.bank_name || "",
            bank_account_no: data.bank_account_no || "",
            bank_account_holder: data.bank_account_holder || "",
          });
          if ((data as any).affiliate_commission_rate) {
            setCommissionRate(Number((data as any).affiliate_commission_rate));
          }
        }
      }
      setLoadingApp(false);
    };
    check();
  }, [user]);

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateBusiness = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.business_name.trim()) e.business_name = "Business name is required";
    if (!form.business_type) e.business_type = "Select a business type";
    if (!form.business_registration_no.trim()) e.business_registration_no = "Registration number is required";
    if (!form.business_address.trim()) e.business_address = "Business address is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateBank = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.bank_name) e.bank_name = "Select your bank";
    if (!form.bank_account_no.trim()) e.bank_account_no = "Account number is required";
    else if (!/^\d{8,20}$/.test(form.bank_account_no.replace(/[\s-]/g, "")))
      e.bank_account_no = "Enter a valid account number (8-20 digits)";
    if (!form.bank_account_holder.trim()) e.bank_account_holder = "Account holder name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (step === "business" && !validateBusiness()) return;
    if (step === "bank" && !validateBank()) return;
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };

  const prevStep = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 5MB limit`, variant: "destructive" });
        continue;
      }

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from("merchant-documents")
        .upload(path, file);

      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      } else {
        const { data: urlData } = supabase.storage
          .from("merchant-documents")
          .getPublicUrl(path);

        setDocs((prev) => [...prev, { name: file.name, path, url: urlData.publicUrl }]);
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  const removeDoc = async (doc: UploadedDoc) => {
    await supabase.storage.from("merchant-documents").remove([doc.path]);
    setDocs((prev) => prev.filter((d) => d.path !== doc.path));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const cleanAccountNo = form.bank_account_no.replace(/[\s-]/g, "");

    const { error } = await supabase
      .from("merchant_applications")
      .insert({
        user_id: user.id,
        business_name: form.business_name.trim(),
        business_type: form.business_type,
        business_registration_no: form.business_registration_no.trim(),
        business_address: form.business_address.trim(),
        primary_category: form.primary_category || null,
        bank_name: form.bank_name,
        bank_account_no: cleanAccountNo,
        bank_account_holder: form.bank_account_holder.trim(),
        document_urls: docs.map((d) => ({ name: d.name, path: d.path })),
        affiliate_commission_rate: commissionRate,
      });

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application submitted!", description: "We'll review your application shortly." });
      setExistingApp({ status: "pending" });
    }
    setSubmitting(false);
  };

  if (authLoading || loadingApp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Show existing application status
  if (existingApp && existingApp.status !== "rejected") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary px-4 pb-6 pt-8 text-primary-foreground">
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-primary-foreground/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold">Merchant Application</h1>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 pt-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center py-12">
              {existingApp.status === "pending" && (
                <>
                  <Clock className="h-12 w-12 text-amber-500 mb-4" />
                  <p className="font-display text-lg font-semibold">Application Pending</p>
                  <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
                    Your merchant application is under review. We'll notify you once it's been processed.
                  </p>
                </>
              )}
              {existingApp.status === "approved" && (
                <>
                  <CheckCircle2 className="h-12 w-12 text-secondary mb-4" />
                  <p className="font-display text-lg font-semibold">Application Approved!</p>
                  <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
                    Your merchant account is active. Head to your merchant dashboard.
                  </p>
                  <Button className="mt-6" onClick={() => navigate("/merchant")}>
                    Go to Merchant Dashboard
                  </Button>
                </>
              )}
              <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pb-6 pt-8 text-primary-foreground">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-primary-foreground/10 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Merchant Registration</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-4 space-y-4">
        {/* Rejection notice */}
        {existingApp?.status === "rejected" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Previous Application Rejected</p>
                {existingApp.rejection_reason && (
                  <p className="text-xs text-muted-foreground mt-1">{existingApp.rejection_reason}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Please update your details and re-submit.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step indicator */}
        <div className="flex items-center justify-between px-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex flex-col items-center ${i <= stepIndex ? "text-secondary" : "text-muted-foreground"}`}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    i < stepIndex
                      ? "bg-secondary border-secondary text-secondary-foreground"
                      : i === stepIndex
                      ? "border-secondary text-secondary"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span className="text-[10px] mt-1 font-medium">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 mt-[-12px] ${i < stepIndex ? "bg-primary" : "bg-muted-foreground/20"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step: Business Details */}
        {step === "business" && (
          <Card className="border-border/50">
            <CardContent className="p-5 space-y-4">
              <h2 className="font-display text-base font-semibold">Business Information</h2>

              <div className="space-y-1">
                <Label>Business Name *</Label>
                <Input
                  placeholder="Your business name"
                  value={form.business_name}
                  onChange={(e) => updateField("business_name", e.target.value)}
                  maxLength={100}
                />
                {errors.business_name && <p className="text-xs text-destructive">{errors.business_name}</p>}
              </div>

              <div className="space-y-1">
                <Label>Business Type *</Label>
                <Select value={form.business_type} onValueChange={(v) => updateField("business_type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.business_type && <p className="text-xs text-destructive">{errors.business_type}</p>}
              </div>

              <div className="space-y-1">
                <Label>SSM Registration No. *</Label>
                <Input
                  placeholder="e.g. 202301012345"
                  value={form.business_registration_no}
                  onChange={(e) => updateField("business_registration_no", e.target.value)}
                  maxLength={30}
                />
                {errors.business_registration_no && <p className="text-xs text-destructive">{errors.business_registration_no}</p>}
              </div>

              <div className="space-y-1">
                <Label>Business Address *</Label>
                <Textarea
                  placeholder="Full business address"
                  value={form.business_address}
                  onChange={(e) => updateField("business_address", e.target.value)}
                  maxLength={300}
                  rows={3}
                />
                {errors.business_address && <p className="text-xs text-destructive">{errors.business_address}</p>}
              </div>

              <div className="space-y-1">
                <Label>Primary Category</Label>
                <Select value={form.primary_category} onValueChange={(v) => updateField("primary_category", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIMARY_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Affiliate commission rate */}
              <div className="space-y-3 rounded-xl bg-secondary/5 border border-secondary/15 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-semibold">Affiliate Commission Rate</span>
                  </div>
                  <span className="font-display text-xl font-bold text-secondary">{commissionRate}%</span>
                </div>
                <Slider
                  min={5}
                  max={30}
                  step={1}
                  value={[commissionRate]}
                  onValueChange={([v]) => setCommissionRate(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Min 5%</span>
                  <span>Max 30%</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This is your total commission pool per sale. It is split equally: 1/6 buyer cashback + 1/6 each across 5 affiliate tiers.
                  Higher rates attract more affiliates to promote your store.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Documents */}
        {step === "documents" && (
          <Card className="border-border/50">
            <CardContent className="p-5 space-y-4">
              <h2 className="font-display text-base font-semibold">Supporting Documents</h2>
              <p className="text-xs text-muted-foreground">
                Upload your SSM certificate, business license, and any other supporting documents. Max 5MB per file.
              </p>

              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.path} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{doc.name}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeDoc(doc)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 py-8 transition-colors hover:border-secondary/50 hover:bg-secondary/5">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium text-muted-foreground">Tap to upload documents</span>
                    <span className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG (max 5MB each)</span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </CardContent>
          </Card>
        )}

        {/* Step: Bank Details */}
        {step === "bank" && (
          <Card className="border-border/50">
            <CardContent className="p-5 space-y-4">
              <h2 className="font-display text-base font-semibold">Bank Account Details</h2>
              <p className="text-xs text-muted-foreground">
                For receiving withdrawals. Your account will be verified with a RM1 test payment.
              </p>

              <div className="space-y-1">
                <Label>Bank Name *</Label>
                <Select value={form.bank_name} onValueChange={(v) => updateField("bank_name", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_LIST.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bank_name && <p className="text-xs text-destructive">{errors.bank_name}</p>}
              </div>

              <div className="space-y-1">
                <Label>Account Number *</Label>
                <Input
                  placeholder="e.g. 1234567890"
                  value={form.bank_account_no}
                  onChange={(e) => updateField("bank_account_no", e.target.value.replace(/[^\d\s-]/g, ""))}
                  maxLength={25}
                  inputMode="numeric"
                />
                {errors.bank_account_no && <p className="text-xs text-destructive">{errors.bank_account_no}</p>}
              </div>

              <div className="space-y-1">
                <Label>Account Holder Name *</Label>
                <Input
                  placeholder="Name as per bank account"
                  value={form.bank_account_holder}
                  onChange={(e) => updateField("bank_account_holder", e.target.value)}
                  maxLength={100}
                />
                {errors.bank_account_holder && <p className="text-xs text-destructive">{errors.bank_account_holder}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <Card className="border-border/50">
            <CardContent className="p-5 space-y-4">
              <h2 className="font-display text-base font-semibold">Review Your Application</h2>

              <div className="space-y-3 divide-y divide-border/50">
                <div className="space-y-2 pb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business</p>
                  <Row label="Name" value={form.business_name} />
                  <Row label="Type" value={form.business_type} />
                  <Row label="SSM No." value={form.business_registration_no} />
                  <Row label="Address" value={form.business_address} />
                  {form.primary_category && (
                    <Row label="Category" value={PRIMARY_CATEGORIES.find((c) => c.value === form.primary_category)?.label || form.primary_category} />
                  )}
                  <Row label="Commission Rate" value={`${commissionRate}% per sale`} />
                </div>

                <div className="space-y-2 pt-3 pb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</p>
                  {docs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  ) : (
                    docs.map((d) => (
                      <p key={d.path} className="text-sm flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" /> {d.name}
                      </p>
                    ))
                  )}
                </div>

                <div className="space-y-2 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bank Account</p>
                  <Row label="Bank" value={form.bank_name} />
                  <Row label="Account No." value={form.bank_account_no} />
                  <Row label="Holder" value={form.bank_account_holder} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {stepIndex > 0 && (
            <Button variant="outline" className="flex-1 gap-1.5" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step !== "review" ? (
            <Button className="flex-1 gap-1.5" onClick={nextStep}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="flex-1 gap-1.5"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Application
            </Button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right max-w-[60%]">{value}</span>
  </div>
);

export default MerchantRegister;
