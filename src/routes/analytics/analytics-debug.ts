import { FastifyInstance } from 'fastify'
import supabase from '../../supabase'

export default async function analyticsDebugRoutes(server: FastifyInstance) {
  // GET: Debug endpoint for category analytics
  server.get('/analytics/categories/debug', async (req, reply) => {
    try {
      // Get analytics logs WITH category_slug (including nulls and empty strings)
      const { data: allAnalyticsData, error: allAnalyticsError } = await supabase
        .from('analytics_logs')
        .select('category_slug, created_at, article_id, article_slug')
        .limit(200)

      // Get analytics logs WITHOUT null category_slug
      const { data: nonNullAnalyticsData, error: nonNullAnalyticsError } = await supabase
        .from('analytics_logs')
        .select('category_slug, created_at')
        .not('category_slug', 'is', null)
        .limit(100)

      // Get analytics logs with empty string category_slug
      const { data: emptyStringData, error: emptyStringError } = await supabase
        .from('analytics_logs')
        .select('category_slug, created_at')
        .eq('category_slug', '')
        .limit(20)

      // Get all categories from categories table
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, category_name, category_slug')
        .limit(50)

      // Count all category slugs (including nulls and empty)
      const allCategorySlugCounts = new Map<string, number>()
      for (const log of allAnalyticsData || []) {
        const slug = log.category_slug || 'NULL_OR_EMPTY'
        allCategorySlugCounts.set(slug, (allCategorySlugCounts.get(slug) || 0) + 1)
      }

      // Count non-null category slugs
      const nonNullCategorySlugCounts = new Map<string, number>()
      for (const log of nonNullAnalyticsData || []) {
        const slug = log.category_slug
        nonNullCategorySlugCounts.set(slug, (nonNullCategorySlugCounts.get(slug) || 0) + 1)
      }

      return reply.send({
        message: 'Debug data untuk category analytics',
        data: {
          analytics: {
            totalLogsAll: allAnalyticsData?.length || 0,
            totalLogsNonNull: nonNullAnalyticsData?.length || 0,
            totalLogsEmptyString: emptyStringData?.length || 0,
            sampleAllLogs: allAnalyticsData?.slice(0, 10) || [],
            sampleNonNullLogs: nonNullAnalyticsData?.slice(0, 5) || [],
            allCategorySlugCounts: Object.fromEntries(allCategorySlugCounts),
            nonNullCategorySlugCounts: Object.fromEntries(nonNullCategorySlugCounts)
          },
          categories: {
            totalCategories: categoriesData?.length || 0,
            sampleCategories: categoriesData?.slice(0, 10) || []
          },
          errors: {
            allAnalyticsError,
            nonNullAnalyticsError,
            emptyStringError,
            categoriesError
          }
        }
      })

    } catch (error) {
      return reply.status(500).send({ 
        message: 'Debug error', 
        error 
      })
    }
  })

  // GET: Debug endpoint for article views
  server.get('/analytics/articles/debug', async (req, reply) => {
    try {
      // Get some analytics data
      const { data: analyticsData } = await supabase
        .from('analytics_logs')
        .select('article_id, article_slug, created_at')
        .not('article_id', 'is', null)
        .not('article_id', 'eq', '')
        .limit(20)

      // Group analytics by article and count views (same logic as main endpoint)
      const articleViewMap = new Map<string, {
        articleId: string
        articleSlug: string
        viewCount: number
        latestViewDate?: string
      }>()

      for (const log of analyticsData || []) {
        const articleId = log.article_id

        if (!articleViewMap.has(articleId)) {
          articleViewMap.set(articleId, {
            articleId,
            articleSlug: log.article_slug || 'unknown',
            viewCount: 0,
            latestViewDate: log.created_at
          })
        }

        const articleStats = articleViewMap.get(articleId)!
        articleStats.viewCount += 1
      }

      // Get some article details
      const articleIds = Array.from(articleViewMap.keys()).slice(0, 10)
      const { data: articlesData } = await supabase
        .from('articles')
        .select('_id, article_id, title, slug, created_at')
        .in('article_id', articleIds)

      // Test the same logic as the main endpoint for merging data
      let testResult = articlesData?.map(article => {
        const viewStats = articleViewMap.get(article.article_id?.toString())
        
        return {
          articleId: article.article_id,
          title: article.title,
          slug: article.slug,
          viewCount: viewStats?.viewCount || 0,
          lookupKey: article.article_id?.toString(),
          hasViewStats: !!viewStats,
          mapKeys: Array.from(articleViewMap.keys())
        }
      }) || []

      // Check for missing articles (IDs in analytics but not in articles table)
      const foundArticleIds = new Set(articlesData?.map(a => String(a.article_id)) || [])
      const missingArticles = articleIds.filter(id => !foundArticleIds.has(String(id)))

      // Check for ID matching issues
      const idMatching = articleIds.map(analyticsId => {
        const foundInArticles = articlesData?.find(article => 
          String(article.article_id) === String(analyticsId)
        )
        return {
          analyticsId,
          analyticsIdType: typeof analyticsId,
          foundInArticles: !!foundInArticles,
          articleId: foundInArticles?.article_id,
          articleIdType: typeof foundInArticles?.article_id,
          stringMatch: String(analyticsId) === String(foundInArticles?.article_id)
        }
      })

      return reply.send({
        message: 'Debug data untuk article views',
        data: {
          analytics: {
            totalLogs: analyticsData?.length || 0,
            sampleLogs: analyticsData?.slice(0, 5) || [],
            uniqueArticleIds: articleViewMap.size,
            viewCounts: Object.fromEntries(Array.from(articleViewMap.entries()).slice(0, 5))
          },
          articles: {
            totalArticles: articlesData?.length || 0,
            sampleArticles: articlesData?.slice(0, 5) || [],
            missingArticles,
            missingCount: missingArticles.length
          },
          mergeTest: {
            testResults: testResult.slice(0, 5),
            totalProcessed: testResult.length,
            withViewCounts: testResult.filter(r => r.viewCount > 0).length,
            withoutViewCounts: testResult.filter(r => r.viewCount === 0).length
          },
          idMatching,
          typeCheck: {
            analyticsIdTypes: analyticsData?.slice(0, 3).map(log => ({
              id: log.article_id,
              type: typeof log.article_id,
              isNull: log.article_id === null,
              isEmpty: log.article_id === '',
              stringValue: String(log.article_id)
            })) || [],
            articleIdTypes: articlesData?.slice(0, 3).map(article => ({
              id: article.article_id,
              type: typeof article.article_id,
              isNull: article.article_id === null,
              toString: article.article_id?.toString(),
              stringValue: String(article.article_id)
            })) || []
          }
        }
      })

    } catch (error) {
      return reply.status(500).send({ 
        message: 'Debug error', 
        error 
      })
    }
  })
} 