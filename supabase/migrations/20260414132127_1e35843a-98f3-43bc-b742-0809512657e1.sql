
-- Phase 11: Full-Text Search Indexing (#46)
-- Add tsvector column and GIN index on marketplace_products for fast search

-- Add generated tsvector column combining name, description, and category
ALTER TABLE public.marketplace_products
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_marketplace_products_search
ON public.marketplace_products USING GIN (search_vector);

-- Create a search function that returns ranked results
CREATE OR REPLACE FUNCTION public.search_marketplace_products(
  search_query text,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  images jsonb,
  store_id uuid,
  store_name text,
  store_slug text,
  sold_count integer,
  rank real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.images,
    p.store_id,
    s.store_name,
    s.slug AS store_slug,
    p.sold_count,
    ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM marketplace_products p
  JOIN marketplace_stores s ON s.id = p.store_id
  WHERE p.status = 'active'
    AND s.status = 'live'
    AND p.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT result_limit
  OFFSET result_offset;
$$;

-- Create a lightweight autocomplete function for typeahead
CREATE OR REPLACE FUNCTION public.autocomplete_marketplace(
  search_term text,
  max_results integer DEFAULT 8
)
RETURNS TABLE (
  item_type text,
  item_id uuid,
  item_name text,
  item_image text,
  item_price numeric,
  item_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Products matching
  (
    SELECT
      'product'::text AS item_type,
      p.id AS item_id,
      p.name AS item_name,
      (p.images->0)::text AS item_image,
      p.price AS item_price,
      s.slug AS item_slug
    FROM marketplace_products p
    JOIN marketplace_stores s ON s.id = p.store_id
    WHERE p.status = 'active'
      AND s.status = 'live'
      AND (
        p.name ILIKE '%' || search_term || '%'
        OR p.search_vector @@ to_tsquery('english', search_term || ':*')
      )
    ORDER BY p.sold_count DESC
    LIMIT max_results
  )
  UNION ALL
  -- Stores matching
  (
    SELECT
      'store'::text AS item_type,
      s.id AS item_id,
      s.store_name AS item_name,
      s.logo_url AS item_image,
      NULL::numeric AS item_price,
      s.slug AS item_slug
    FROM marketplace_stores s
    WHERE s.status = 'live'
      AND s.store_name ILIKE '%' || search_term || '%'
    ORDER BY s.store_name
    LIMIT 3
  );
$$;
