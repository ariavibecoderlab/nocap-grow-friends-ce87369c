import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Plus, Star, Trash2, Loader2 } from "lucide-react";

interface Address {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string | null;
  state: string | null;
  postcode: string | null;
  is_default: boolean;
}

interface AddressSelectorProps {
  onSelect: (addr: { name: string; phone: string; address: string }) => void;
}

export default function AddressSelector({ onSelect }: AddressSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  // Form state
  const [label, setLabel] = useState("Home");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (user) fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", user!.id)
      .order("is_default", { ascending: false });
    setAddresses((data as Address[]) || []);
    setLoading(false);
  };

  const handleSelect = (addr: Address) => {
    const parts = [addr.address_line, addr.city, addr.state, addr.postcode].filter(Boolean);
    onSelect({
      name: addr.recipient_name,
      phone: addr.phone,
      address: parts.join(", "),
    });
    setOpen(false);
  };

  const handleSave = async () => {
    if (!recipientName.trim() || !phone.trim() || !addressLine.trim()) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("user_addresses").insert({
      user_id: user!.id,
      label: label.trim() || "Home",
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      address_line: addressLine.trim(),
      city: city.trim() || null,
      state: state.trim() || null,
      postcode: postcode.trim() || null,
      is_default: isDefault,
    });
    if (error) {
      toast({ title: "Error saving address", variant: "destructive" });
    } else {
      toast({ title: "Address saved" });
      resetForm();
      setShowForm(false);
      await fetchAddresses();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("user_addresses").delete().eq("id", id);
    toast({ title: "Address removed" });
    fetchAddresses();
  };

  const resetForm = () => {
    setLabel("Home");
    setRecipientName("");
    setPhone("");
    setAddressLine("");
    setCity("");
    setState("");
    setPostcode("");
    setIsDefault(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-white/10 text-white/60 text-xs h-7 px-2">
          <MapPin className="h-3 w-3 mr-1" /> Saved Addresses
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MapPin className="h-4 w-4 text-secondary" /> Saved Addresses
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-lg border border-white/10 bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => handleSelect(addr)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">{addr.label}</span>
                    {addr.is_default && <Star className="h-3 w-3 fill-secondary text-secondary" />}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(addr.id); }}
                    className="text-white/20 hover:text-red-400 p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-xs text-white/80">{addr.recipient_name} · {addr.phone}</p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {[addr.address_line, addr.city, addr.state, addr.postcode].filter(Boolean).join(", ")}
                </p>
              </div>
            ))}

            {addresses.length === 0 && !showForm && (
              <p className="text-xs text-white/30 text-center py-4">No saved addresses yet</p>
            )}
          </div>
        )}

        {showForm ? (
          <div className="space-y-2 border-t border-white/10 pt-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-white/50 text-[10px]">Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-xs h-8 mt-0.5" placeholder="Home, Office..." />
              </div>
              <div>
                <Label className="text-white/50 text-[10px]">Recipient Name *</Label>
                <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-xs h-8 mt-0.5" />
              </div>
            </div>
            <div>
              <Label className="text-white/50 text-[10px]">Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xs h-8 mt-0.5" />
            </div>
            <div>
              <Label className="text-white/50 text-[10px]">Address *</Label>
              <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xs h-8 mt-0.5" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-white/50 text-[10px]">City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-xs h-8 mt-0.5" />
              </div>
              <div>
                <Label className="text-white/50 text-[10px]">State</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-xs h-8 mt-0.5" />
              </div>
              <div>
                <Label className="text-white/50 text-[10px]">Postcode</Label>
                <Input value={postcode} onChange={(e) => setPostcode(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-xs h-8 mt-0.5" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-white/20" />
              <span className="text-xs text-white/50">Set as default</span>
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}
                className="border-white/10 text-white/50 text-xs h-8 flex-1">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}
                className="bg-secondary text-primary text-xs h-8 flex-1">
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}
            className="border-white/10 text-white/50 text-xs h-8 w-full mt-2">
            <Plus className="h-3 w-3 mr-1" /> Add New Address
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
