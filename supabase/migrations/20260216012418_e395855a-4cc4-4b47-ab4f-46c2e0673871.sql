
-- Add document_urls column to store uploaded document references
ALTER TABLE public.merchant_applications
ADD COLUMN document_urls jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for merchant documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-documents', 'merchant-documents', false);

-- RLS: Users can upload to their own folder
CREATE POLICY "Users can upload own merchant docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'merchant-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can view own documents
CREATE POLICY "Users can view own merchant docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'merchant-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Admins can view all merchant docs
CREATE POLICY "Admins can view all merchant docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'merchant-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: Users can delete own docs (before approval)
CREATE POLICY "Users can delete own merchant docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'merchant-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
