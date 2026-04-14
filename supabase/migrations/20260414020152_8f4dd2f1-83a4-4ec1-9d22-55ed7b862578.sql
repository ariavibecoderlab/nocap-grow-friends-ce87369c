
-- 1. Inventory alerts table
CREATE TABLE public.marketplace_inventory_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  threshold INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_alerted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

ALTER TABLE public.marketplace_inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all inventory alerts"
  ON public.marketplace_inventory_alerts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can manage own inventory alerts"
  ON public.marketplace_inventory_alerts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM marketplace_stores s
    WHERE s.id = marketplace_inventory_alerts.store_id AND s.merchant_user_id = auth.uid()
  ));

-- 2. Manager permissions table
CREATE TABLE public.marketplace_manager_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES public.marketplace_store_managers(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(manager_id, permission)
);

ALTER TABLE public.marketplace_manager_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all manager permissions"
  ON public.marketplace_manager_permissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can manage own store manager permissions"
  ON public.marketplace_manager_permissions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM marketplace_store_managers sm
    JOIN marketplace_stores s ON s.id = sm.store_id
    WHERE sm.id = marketplace_manager_permissions.manager_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Managers can view own permissions"
  ON public.marketplace_manager_permissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM marketplace_store_managers sm
    WHERE sm.id = marketplace_manager_permissions.manager_id AND sm.user_id = auth.uid()
  ));

-- 3. Add SEO column to products
ALTER TABLE public.marketplace_products ADD COLUMN IF NOT EXISTS seo JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 4. Triggers for updated_at
CREATE TRIGGER update_inventory_alerts_updated_at
  BEFORE UPDATE ON public.marketplace_inventory_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
