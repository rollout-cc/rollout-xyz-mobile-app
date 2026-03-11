UPDATE public.rolly_knowledge 
SET content = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(content, 'Donny Slater', '', 'gi'),
        'Brian\s*"?Z"?\s*Zisook', '', 'gi'),
      'Zisook', '', 'gi'),
    'Donny', '', 'gi'),
  '\s{2,}', ' ', 'g')
WHERE content ILIKE '%donny%' OR content ILIKE '%zisook%' OR content ILIKE '%slater%';