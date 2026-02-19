-- Enable Realtime for marketplace_orders so status changes propagate live
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_orders;