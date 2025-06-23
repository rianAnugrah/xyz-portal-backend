import { FastifyInstance } from 'fastify'
import supabase from '../../supabase'

export default async function analyticsCategoriesRoutes(server: FastifyInstance) {
  // GET: Category view statistics
  server.get('/analytics/categories/views', async (req, reply) => {
    const query = req.query as {
      limit?: string
      order_by?: 'view_count' | 'category_name' | 'created_at'
      order_direction?: 'asc' | 'desc'
      date_from?: string
      date_to?: string
    }

    const limit = query.limit ? parseInt(query.limit) : 50
    const orderBy = query.order_by || 'view_count'
    const orderDirection = query.order_direction || 'desc'

    try {
      // Base query to get analytics data for categories
      // Exclude null and empty category_slug values
      let analyticsQuery = supabase
        .from('analytics_logs')
        .select('category_slug, created_at')
        .not('category_slug', 'is', null)
        .not('category_slug', 'eq', '')

      // Apply date filters if provided
      if (query.date_from) {
        analyticsQuery = analyticsQuery.gte('created_at', query.date_from)
      }
      if (query.date_to) {
        analyticsQuery = analyticsQuery.lte('created_at', query.date_to + 'T23:59:59.999Z')
      }

      const { data: analyticsData, error: analyticsError } = await analyticsQuery

      if (analyticsError) {
        return reply.status(500).send({ 
          message: 'Gagal mengambil data analytics.', 
          error: analyticsError 
        })
      }

      // Group analytics by category and count views
      const categoryViewMap = new Map<string, {
        categorySlug: string
        viewCount: number
        latestViewDate?: string
      }>()

      for (const log of analyticsData || []) {
        const categorySlug = log.category_slug

        if (!categoryViewMap.has(categorySlug)) {
          categoryViewMap.set(categorySlug, {
            categorySlug,
            viewCount: 0,
            latestViewDate: log.created_at
          })
        }

        const categoryStats = categoryViewMap.get(categorySlug)!
        categoryStats.viewCount += 1
        
        // Update latest view date
        if (!categoryStats.latestViewDate || log.created_at > categoryStats.latestViewDate) {
          categoryStats.latestViewDate = log.created_at
        }
      }

      // Get category details for the categories that have views (batch processing to avoid URI too long)
      // Note: analytics_logs.category_slug actually contains category names, not slugs
      const categoryNames = Array.from(categoryViewMap.keys())
      const batchSize = 100 // Process in batches to avoid URI too long error
      let categoriesData: any[] = []

      // Process category names in batches (matching by category_name instead of category_slug)
      for (let i = 0; i < categoryNames.length; i += batchSize) {
        const batch = categoryNames.slice(i, i + batchSize)
        const { data: batchData, error: batchError } = await supabase
          .from('categories')
          .select('id, category_name, category_slug, created_at, category_desc, category_count')
          .in('category_name', batch)

        if (batchError) {
          return reply.status(500).send({ 
            message: 'Gagal mengambil data kategori.', 
            error: batchError 
          })
        }

        if (batchData) {
          categoriesData = [...categoriesData, ...batchData]
        }
      }

      // Merge category details with view statistics and group by category name
      // Note: Match by category_name since analytics_logs.category_slug contains category names
      const categoryMap = new Map<string, any>()
      
      // Group categories by name, taking the first occurrence of each name
      for (const category of categoriesData || []) {
        const categoryName = category.category_name
        
        if (!categoryMap.has(categoryName)) {
          const viewStats = categoryViewMap.get(categoryName)
          categoryMap.set(categoryName, {
            categoryId: category.id,
            categoryName: category.category_name,
            categorySlug: category.category_slug,
            viewCount: viewStats?.viewCount || 0
          })
        }
      }
      
      let result = Array.from(categoryMap.values())

      // Sort based on query parameters
      result.sort((a, b) => {
        let comparison = 0
        
        switch (orderBy) {
          case 'view_count':
            comparison = a.viewCount - b.viewCount
            break
          case 'category_name':
            comparison = a.categoryName.localeCompare(b.categoryName)
            break
          case 'created_at':
            // Fallback to view_count sorting since we don't have createdAt in response
            comparison = a.viewCount - b.viewCount
            break
          default:
            comparison = a.viewCount - b.viewCount
        }

        return orderDirection === 'desc' ? -comparison : comparison
      })

      // Apply limit
      result = result.slice(0, limit)

      // Calculate summary statistics
      const totalCategories = result.length
      const totalViews = result.reduce((sum, category) => sum + category.viewCount, 0)
      const avgViewsPerCategory = totalCategories > 0 ? totalViews / totalCategories : 0

      return reply.send({
        message: 'Data statistik views per kategori berhasil diambil.',
        data: {
          summary: {
            totalCategories,
            totalViews,
            avgViewsPerCategory: Number(avgViewsPerCategory.toFixed(2))
          },
          categories: result
        }
      })

    } catch (error) {
      return reply.status(500).send({ 
        message: 'Terjadi kesalahan saat mengambil data kategori.', 
        error 
      })
    }
  })
} 