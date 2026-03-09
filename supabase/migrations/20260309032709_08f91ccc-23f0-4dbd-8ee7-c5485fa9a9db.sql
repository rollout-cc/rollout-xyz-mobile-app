
CREATE OR REPLACE FUNCTION public.search_rolly_knowledge(search_query text, match_limit integer DEFAULT 3)
RETURNS TABLE(id uuid, chapter text, content text, rank real)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    rk.id,
    rk.chapter,
    rk.content,
    ts_rank(rk.search_vector, to_tsquery('english', search_query)) AS rank
  FROM public.rolly_knowledge rk
  WHERE rk.search_vector @@ to_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT match_limit;
$$;
