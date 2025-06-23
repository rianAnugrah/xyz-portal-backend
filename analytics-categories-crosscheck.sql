-- SUPABASE SQL QUERY FOR CROSS-CHECK ANALYTICS CATEGORIES
-- This query replicates the logic from analytics-categories.ts

-- 1. Basic query to get category view statistics
WITH category_views AS (
  SELECT 
    category_slug,
    COUNT(*) as view_count,
    MAX(created_at) as latest_view_date,
    MIN(created_at) as first_view_date
  FROM analytics_logs 
  WHERE category_slug IS NOT NULL 
    AND category_slug != ''
    -- Add date filters if needed (uncomment and modify dates)
    -- AND created_at >= '2024-01-01'
    -- AND created_at <= '2024-12-31T23:59:59.999Z'
  GROUP BY category_slug
),

-- 2. Join with categories table (note: category_slug in analytics_logs = category_name in categories)
category_stats AS (
  SELECT 
    c.id as category_id,
    c.category_name,
    c.category_slug,
    c.created_at as category_created_at,
    c.category_desc,
    c.category_count,
    COALESCE(cv.view_count, 0) as view_count,
    cv.latest_view_date,
    cv.first_view_date
  FROM categories c
  LEFT JOIN category_views cv ON c.category_name = cv.category_slug
)

-- 3. Final result with summary statistics
SELECT 
  -- Summary statistics
  (SELECT COUNT(*) FROM category_stats WHERE view_count > 0) as total_categories_with_views,
  (SELECT COUNT(*) FROM categories) as total_categories,
  (SELECT SUM(view_count) FROM category_stats) as total_views,
  (SELECT ROUND(AVG(view_count), 2) FROM category_stats WHERE view_count > 0) as avg_views_per_category,
  
  -- Category details
  category_id,
  category_name,
  category_slug,
  view_count,
  latest_view_date,
  first_view_date,
  category_created_at,
  category_desc,
  category_count

FROM category_stats
WHERE view_count > 0  -- Only show categories with views
ORDER BY view_count DESC  -- Default ordering
LIMIT 50;  -- Default limit

-- Alternative queries for specific checks:

-- Query 1: Check categories without any views
-- SELECT 
--   category_id,
--   category_name,
--   category_slug,
--   category_created_at
-- FROM categories c
-- WHERE NOT EXISTS (
--   SELECT 1 FROM analytics_logs al 
--   WHERE al.category_slug = c.category_name
-- )
-- ORDER BY category_name;

-- Query 2: Check for potential data inconsistencies
-- SELECT 
--   'Analytics logs with category_slug not in categories table' as issue_type,
--   category_slug,
--   COUNT(*) as occurrence_count
-- FROM analytics_logs al
-- WHERE category_slug IS NOT NULL 
--   AND category_slug != ''
--   AND NOT EXISTS (
--     SELECT 1 FROM categories c 
--     WHERE c.category_name = al.category_slug
--   )
-- GROUP BY category_slug
-- ORDER BY occurrence_count DESC;

-- Query 3: Date range analysis
-- SELECT 
--   DATE(created_at) as date,
--   category_slug,
--   COUNT(*) as daily_views
-- FROM analytics_logs 
-- WHERE category_slug IS NOT NULL 
--   AND category_slug != ''
--   AND created_at >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY DATE(created_at), category_slug
-- ORDER BY date DESC, daily_views DESC;

-- Query 4: Top categories by views (matching the API logic)
-- SELECT 
--   c.id as categoryId,
--   c.category_name as categoryName,
--   c.category_slug as categorySlug,
--   COUNT(al.category_slug) as viewCount
-- FROM categories c
-- LEFT JOIN analytics_logs al ON c.category_name = al.category_slug
-- WHERE al.category_slug IS NOT NULL 
--   AND al.category_slug != ''
-- GROUP BY c.id, c.category_name, c.category_slug
-- ORDER BY viewCount DESC
-- LIMIT 50; 