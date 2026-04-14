import { useEffect, useState, useRef, ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compressImage";
import {
  Store, Package, Truck, CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, Upload, Sparkles, ArrowRight, Image as ImageIcon, X,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
}

interface MerchantOnboardingWizardProps {
  branchId: string;
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function MerchantOnboardingWizard({ branchId, userId, onComplete, onSkip }: MerchantOnboardingWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step completion tracking
  const [hasStore, setHasStore] = useState(false);
  const [hasProduct, setHasProduct] = useState(false);
  const [hasShipping, setHasShipping] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Step 1: Store setup fields
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [storeTagline, setStoreTagline] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 2: First product fields
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("10");
  const [productDescription, setProductDescription] = useState("");
  const [productImages, setProductImages] = useState<File[]>([]);
  const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);
  const productImageRef = useRef<HTMLInputElement>(null);

  // Step 3: Shipping fields
  const [shippingRate, setShippingRate] = useState("8");
  const [freeShippingMin, setFreeShippingMin] = useState("");

  useEffect(() => {
    checkProgress();
  }, [branchId]);

  const checkProgress = async () => {
    setLoading(true);
    const { data: store } = await supabase
      .from("marketplace_stores")
      .select("id, store_name, shipping_flat_rate, free_shipping_min")
      .eq("branch_id", branchId)
      .maybeSingle();

    if (store) {
      setHasStore(true);
      setStoreId(store.id);
      setShippingRate(String(store.shipping_flat_rate || 8));
      setFreeShippingMin(store.free_shipping_min ? String(store.free_shipping_min) : "");

      const { count } = await supabase
        .from("marketplace_products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id);

      setHasProduct((count || 0) > 0);
      setHasShipping(store.shipping_flat_rate > 0);

      // Auto-advance to first incomplete step
      if ((count || 0) === 0) setCurrentStep(1);
      else if (store.shipping_flat_rate <= 0) setCurrentStep(2);
    }

    setLoading(false);
  };

  const steps: OnboardingStep[] = [
    { id: "store", title: "Create Your Store", description: "Set up your store name, brand, and identity", icon: Store, completed: hasStore },
    { id: "product", title: "Add First Product", description: "List your first product with photos and pricing", icon: Package, completed: hasProduct },
    { id: "shipping", title: "Configure Shipping", description: "Set delivery rates and free shipping thresholds", icon: Truck, completed: hasShipping },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const allComplete = completedCount === steps.length;

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const handleLogoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 512, 512, 0.8);
    setLogoFile(compressed);
    setLogoPreview(URL.createObjectURL(compressed));
  };

  const handleProductImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const compressed = await Promise.all(files.slice(0, 4).map(f => compressImage(f, 800, 800, 0.85)));
    setProductImages(prev => [...prev, ...compressed].slice(0, 4));
    setProductImagePreviews(prev => [...prev, ...compressed.map(f => URL.createObjectURL(f))].slice(0, 4));
  };

  const removeProductImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
    setProductImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Step 1: Create store
  const handleCreateStore = async () => {
    if (!storeName.trim()) {
      toast({ title: "Store name required", variant: "destructive" });
      return;
    }
    const slug = storeSlug.trim() || generateSlug(storeName);
    setSaving(true);

    let logoUrl: string | null = null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop() || "jpg";
      const path = `${userId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("marketplace-assets").upload(path, logoFile);
      if (!upErr) {
        const { data: pub } = supabase.storage.from("marketplace-assets").getPublicUrl(path);
        logoUrl = pub.publicUrl;
      }
    }

    const { data: newStore, error } = await supabase
      .from("marketplace_stores")
      .insert({
        branch_id: branchId,
        merchant_user_id: userId,
        store_name: storeName.trim(),
        slug,
        tagline: storeTagline.trim() || null,
        description: storeDescription.trim() || null,
        logo_url: logoUrl,
        status: "live",
        shipping_flat_rate: 8,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message.includes("duplicate") ? "Store slug already taken. Try a different name." : error.message, variant: "destructive" });
      return;
    }

    setStoreId(newStore.id);
    setHasStore(true);
    setCurrentStep(1);
    toast({ title: "🎉 Store created!", description: "Now let's add your first product." });
  };

  // Step 2: Add first product
  const handleAddProduct = async () => {
    if (!productName.trim() || !productPrice) {
      toast({ title: "Name and price required", variant: "destructive" });
      return;
    }
    if (!storeId) return;
    setSaving(true);

    // Upload images
    const imageUrls: string[] = [];
    for (const file of productImages) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("marketplace-assets").upload(path, file);
      if (!upErr) {
        const { data: pub } = supabase.storage.from("marketplace-assets").getPublicUrl(path);
        imageUrls.push(pub.publicUrl);
      }
    }

    const { error } = await supabase
      .from("marketplace_products")
      .insert({
        store_id: storeId,
        name: productName.trim(),
        price: parseFloat(productPrice),
        stock_quantity: parseInt(productStock) || 10,
        description: productDescription.trim() || null,
        images: imageUrls,
        status: "active",
      });

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setHasProduct(true);
    setCurrentStep(2);
    toast({ title: "🎉 Product added!", description: "Last step — configure shipping." });
  };

  // Step 3: Save shipping
  const handleSaveShipping = async () => {
    if (!storeId) return;
    setSaving(true);

    const { error } = await supabase
      .from("marketplace_stores")
      .update({
        shipping_flat_rate: parseFloat(shippingRate) || 0,
        free_shipping_min: freeShippingMin ? parseFloat(freeShippingMin) : null,
      })
      .eq("id", storeId);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setHasShipping(true);
    toast({ title: "🎉 All set!", description: "Your store is ready to go live!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  if (allComplete) {
    return (
      <Card className="border-secondary/30 bg-secondary/5">
        <CardContent className="p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/20">
            <Sparkles className="h-8 w-8 text-secondary" />
          </div>
          <h3 className="text-lg font-display font-bold text-white">Your Store is Ready! 🎉</h3>
          <p className="text-sm text-white/60">You've completed all setup steps. Your store is live and ready to receive orders.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={onComplete} className="bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-2">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            Store Setup Wizard
          </h2>
          <p className="text-xs text-white/40 mt-0.5">{completedCount} of {steps.length} steps completed</p>
        </div>
        <Button variant="ghost" size="sm" className="text-white/30 text-xs hover:text-white/60" onClick={onSkip}>
          Skip for now
        </Button>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-2 bg-white/10" />

      {/* Step indicators */}
      <div className="flex gap-2">
        {steps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => {
              if (step.completed || i <= currentStep) setCurrentStep(i);
            }}
            className={`flex-1 rounded-lg border p-3 text-left transition-all ${
              i === currentStep
                ? "border-secondary bg-secondary/10"
                : step.completed
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-white/10 bg-white/5 opacity-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              ) : (
                <step.icon className={`h-4 w-4 shrink-0 ${i === currentStep ? "text-secondary" : "text-white/30"}`} />
              )}
              <span className={`text-xs font-medium truncate ${i === currentStep ? "text-white" : step.completed ? "text-green-400" : "text-white/40"}`}>
                {step.title}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Step content */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4 space-y-4">
          {/* Step 1: Store Setup */}
          {currentStep === 0 && !hasStore && (
            <>
              <div className="space-y-1">
                <Label className="text-white/70 text-sm">Store Name *</Label>
                <Input
                  placeholder="e.g. Nasi Lemak Express"
                  value={storeName}
                  onChange={(e) => {
                    setStoreName(e.target.value);
                    if (!storeSlug || storeSlug === generateSlug(storeName)) {
                      setStoreSlug(generateSlug(e.target.value));
                    }
                  }}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-sm">Store URL Slug</Label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/30">/store/</span>
                  <Input
                    placeholder="my-store"
                    value={storeSlug}
                    onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-sm">Tagline</Label>
                <Input
                  placeholder="e.g. Authentic Malaysian cuisine"
                  value={storeTagline}
                  onChange={(e) => setStoreTagline(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-sm">Description</Label>
                <Textarea
                  placeholder="Tell customers about your store..."
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 min-h-[80px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-sm">Store Logo</Label>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                {logoPreview ? (
                  <div className="relative w-20 h-20">
                    <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded-lg object-cover border border-white/10" />
                    <button onClick={() => { setLogoFile(null); setLogoPreview(null); }} className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="border-white/10 text-white/60 gap-1.5" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Upload Logo
                  </Button>
                )}
              </div>
              <Button
                className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-2"
                onClick={handleCreateStore}
                disabled={saving || !storeName.trim()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                Create Store
              </Button>
            </>
          )}

          {/* Step 1 already completed */}
          {currentStep === 0 && hasStore && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto" />
              <p className="text-white font-medium">Store already created!</p>
              <Button size="sm" className="bg-secondary text-primary hover:bg-secondary/90 gap-1" onClick={() => setCurrentStep(1)}>
                Next Step <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Add First Product */}
          {currentStep === 1 && !hasProduct && (
            <>
              {!storeId ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-white/60 text-sm">Please create your store first.</p>
                  <Button size="sm" variant="outline" className="border-white/10 text-white/60 gap-1" onClick={() => setCurrentStep(0)}>
                    <ChevronLeft className="h-4 w-4" /> Go Back
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-sm">Product Name *</Label>
                    <Input
                      placeholder="e.g. Nasi Lemak Special"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-white/70 text-sm">Price (RM) *</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/70 text-sm">Stock Qty</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="10"
                        value={productStock}
                        onChange={(e) => setProductStock(e.target.value)}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-sm">Description</Label>
                    <Textarea
                      placeholder="Describe your product..."
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      className="border-white/10 bg-white/5 text-white placeholder:text-white/30 min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-sm">Product Photos (up to 4)</Label>
                    <input ref={productImageRef} type="file" accept="image/*" multiple className="hidden" onChange={handleProductImageSelect} />
                    <div className="flex gap-2 flex-wrap">
                      {productImagePreviews.map((preview, i) => (
                        <div key={i} className="relative w-16 h-16">
                          <img src={preview} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                          <button onClick={() => removeProductImage(i)} className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5">
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {productImages.length < 4 && (
                        <button
                          onClick={() => productImageRef.current?.click()}
                          className="w-16 h-16 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center hover:border-white/30 transition-colors"
                        >
                          <ImageIcon className="h-5 w-5 text-white/20" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-2"
                    onClick={handleAddProduct}
                    disabled={saving || !productName.trim() || !productPrice}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                    Add Product
                  </Button>
                </>
              )}
            </>
          )}

          {/* Step 2 already completed */}
          {currentStep === 1 && hasProduct && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto" />
              <p className="text-white font-medium">First product added!</p>
              <Button size="sm" className="bg-secondary text-primary hover:bg-secondary/90 gap-1" onClick={() => setCurrentStep(2)}>
                Next Step <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 3: Shipping */}
          {currentStep === 2 && (
            <>
              <div className="space-y-1">
                <Label className="text-white/70 text-sm">Flat Shipping Rate (RM)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="8.00"
                  value={shippingRate}
                  onChange={(e) => setShippingRate(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
                <p className="text-[10px] text-white/30">Applied to every order</p>
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-sm">Free Shipping Above (RM)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Leave empty to disable"
                  value={freeShippingMin}
                  onChange={(e) => setFreeShippingMin(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
                <p className="text-[10px] text-white/30">Orders above this amount get free shipping</p>
              </div>
              <Button
                className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-2"
                onClick={handleSaveShipping}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                {hasShipping ? "Update Shipping" : "Save & Go Live"} 🚀
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/40 gap-1"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(prev => prev - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {currentStep < steps.length - 1 && steps[currentStep].completed && (
          <Button
            variant="ghost"
            size="sm"
            className="text-secondary gap-1"
            onClick={() => setCurrentStep(prev => prev + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
