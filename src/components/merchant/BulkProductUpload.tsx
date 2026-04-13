import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BulkProductUploadProps {
  storeId: string;
  onComplete: () => void;
}

const CSV_TEMPLATE = `name,price,stock_quantity,description,sku,status,weight_kg
"Example Product",29.90,100,"A great product","SKU-001",active,0.5
"Another Item",15.00,50,"Description here","SKU-002",draft,`;

export default function BulkProductUpload({ storeId, onComplete }: BulkProductUploadProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    total_rows: number;
    inserted: number;
    errors: { row: number; error?: string; name?: string }[];
  } | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast({ title: "Please upload a CSV file", variant: "destructive" });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const csv_data = await file.text();
      const { data, error } = await supabase.functions.invoke("bulk-csv-upload", {
        body: { store_id: storeId, csv_data },
      });

      if (error) throw error;

      setResult(data);
      if (data.inserted > 0) {
        toast({ title: `${data.inserted} product(s) imported successfully!` });
        onComplete();
      } else {
        toast({ title: "No products imported", description: "Check errors below", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Bulk Product Upload</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a CSV file to add multiple products at once. Download the template to see the required format.
        </p>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate} className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> Download Template
          </Button>
          <Button
            size="sm"
            className="bg-secondary text-primary text-xs"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1" />
            )}
            {uploading ? "Importing…" : "Upload CSV"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {uploading && <Progress value={50} className="h-1.5" />}

        {result && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> {result.inserted} imported
              </span>
              {result.errors.length > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle className="h-3.5 w-3.5" /> {result.errors.length} error(s)
                </span>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-[10px] text-red-400/80">
                    Row {err.row}: {err.error} {err.name ? `(${err.name})` : ""}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
