import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileText, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { storeId: string; }

const MerchantProductImportExport = ({ storeId }: Props) => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const exportProducts = async () => {
    setExporting(true);
    const { data: products } = await supabase
      .from("marketplace_products")
      .select("name, description, price, stock_quantity, sku, weight_kg, status, is_featured, sold_count, category_id, images, seo")
      .eq("store_id", storeId)
      .order("name");

    if (!products || products.length === 0) {
      toast({ title: "No products to export" });
      setExporting(false);
      return;
    }

    // CSV export
    const header = "name,description,price,stock_quantity,sku,weight_kg,status,is_featured\n";
    const rows = products.map(p =>
      `"${(p.name || "").replace(/"/g, '""')}","${(p.description || "").replace(/"/g, '""')}",${p.price},${p.stock_quantity},"${p.sku || ""}",${p.weight_kg || ""},${p.status},${p.is_featured}`
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    // JSON export
    const jsonBlob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
    const b = document.createElement("a");
    b.href = URL.createObjectURL(jsonBlob);
    b.download = `products-export-${new Date().toISOString().split("T")[0]}.json`;
    b.click();

    toast({ title: "Exported as CSV and JSON" });
    setExporting(false);
  };

  const importProducts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      let products: any[] = [];

      if (file.name.endsWith(".json")) {
        products = JSON.parse(text);
        if (!Array.isArray(products)) throw new Error("JSON must be an array");
      } else {
        // Parse CSV
        const lines = text.split("\n").filter(l => l.trim());
        if (lines.length < 2) throw new Error("CSV must have header + data rows");
        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const nameIdx = headers.indexOf("name");
        const priceIdx = headers.indexOf("price");
        if (nameIdx === -1 || priceIdx === -1) throw new Error("CSV must have 'name' and 'price' columns");

        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].match(/(".*?"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, "").trim()) || [];
          if (!vals[nameIdx]) continue;
          const product: any = {};
          headers.forEach((h, j) => { product[h] = vals[j] || ""; });
          products.push(product);
        }
      }

      let success = 0;
      const errors: string[] = [];

      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (!p.name) { errors.push(`Row ${i + 1}: Missing name`); continue; }

        const { error } = await supabase.from("marketplace_products").insert({
          store_id: storeId,
          name: p.name,
          description: p.description || null,
          price: parseFloat(p.price) || 0,
          stock_quantity: parseInt(p.stock_quantity) || 0,
          sku: p.sku || null,
          weight_kg: p.weight_kg ? parseFloat(p.weight_kg) : null,
          status: p.status || "draft",
          is_featured: p.is_featured === "true" || p.is_featured === true,
        });

        if (error) errors.push(`Row ${i + 1} (${p.name}): ${error.message}`);
        else success++;
      }

      setImportResult({ success, errors });
      toast({ title: `Imported ${success} product${success !== 1 ? "s" : ""}${errors.length > 0 ? `, ${errors.length} error(s)` : ""}` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }

    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csv = "name,description,price,stock_quantity,sku,weight_kg,status,is_featured\n\"Example Product\",\"A great product\",29.90,100,\"SKU-001\",0.5,draft,false\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "product-import-template.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Export */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Export Products</p>
              <p className="text-[10px] text-white/40">Download all products as CSV and JSON</p>
            </div>
            <Button size="sm" onClick={exportProducts} disabled={exporting}
              className="h-8 text-xs bg-secondary text-primary hover:bg-secondary/90">
              {exporting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-white">Import Products</p>
            <p className="text-[10px] text-white/40">Upload CSV or JSON file with product data</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}
              className="h-8 text-xs border-white/10 text-white/60 hover:bg-white/10">
              <FileText className="h-3 w-3 mr-1" /> Template
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importing}
              className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white">
              {importing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
              Upload File
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.json" onChange={importProducts} className="hidden" />
        </CardContent>
      </Card>

      {/* Import results */}
      {importResult && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <p className="text-sm text-green-400">{importResult.success} imported successfully</p>
            </div>
            {importResult.errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <p className="text-sm text-red-400">{importResult.errors.length} error(s)</p>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-[10px] text-red-300/60">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantProductImportExport;
