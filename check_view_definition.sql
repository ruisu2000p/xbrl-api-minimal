-- Check current view definition
SELECT
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'markdown_files_metadata';

-- Check security_invoker setting
SELECT
    n.nspname AS schema,
    c.relname AS view_name,
    CASE
        WHEN c.relkind = 'v' THEN
            CASE
                WHEN pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER'
                ELSE 'SECURITY INVOKER (default)'
            END
        ELSE 'Not a view'
    END AS security_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname = 'markdown_files_metadata';

-- Alternative check using pg_rewrite
SELECT
    c.relname AS view_name,
    r.ev_type,
    r.is_instead,
    pg_get_viewdef(c.oid, true) AS view_definition
FROM pg_rewrite r
JOIN pg_class c ON c.oid = r.ev_class
WHERE c.relname = 'markdown_files_metadata'
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');