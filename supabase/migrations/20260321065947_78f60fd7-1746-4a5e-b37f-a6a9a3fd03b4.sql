CREATE OR REPLACE FUNCTION public.execute_readonly_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow read-only statements
  IF NOT (
    upper(ltrim(query_text)) ~ '^(SELECT|WITH|EXPLAIN)'
  ) THEN
    RAISE EXCEPTION 'Only SELECT / WITH / EXPLAIN queries are allowed';
  END IF;
  
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query_text || ') t'
    INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;