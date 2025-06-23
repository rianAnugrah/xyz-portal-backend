import { FastifyInstance } from 'fastify'
import supabase from '../../supabase'

export default async function analyticsArticlesRoutes(server: FastifyInstance) {
  // GET: Articles with most views
  server.get('/analytics/users/article-count', async (req, reply) => {
    const query = req.query as {
      limit?: string
      order_by?: 'views' | 'title' | 'created_at'
      order_direction?: 'asc' | 'desc'
      date_from?: string
      date_to?: string
    }

    const limit = query.limit ? parseInt(query.limit) : 50
    const orderBy = query.order_by || 'views'
    const orderDirection = query.order_direction || 'desc'

    try {
      // Base query to get articles with their views
      let articlesQuery = supabase
        .from('articles')
        .select(`
          _id,
          article_id,
          title,
          slug,
          views,
          created_at,
          updated_at,
          category,
          author_id,
          author:author_id (
            user_id,
            username,
            email,
            fullname,
            first_name,
            last_name
          )
        `)

      // Apply date filters if provided
      if (query.date_from) {
        articlesQuery = articlesQuery.gte('created_at', query.date_from)
      }
      if (query.date_to) {
        articlesQuery = articlesQuery.lte('created_at', query.date_to + 'T23:59:59.999Z')
      }

      // Apply sorting
      let orderColumn = 'views'
      switch (orderBy) {
        case 'title':
          orderColumn = 'title'
          break
        case 'created_at':
          orderColumn = 'created_at'
          break
        case 'views':
        default:
          orderColumn = 'views'
          break
      }

      articlesQuery = articlesQuery.order(orderColumn, { ascending: orderDirection === 'asc' })

      // Apply limit
      articlesQuery = articlesQuery.limit(limit)

      const { data: articlesData, error: articlesError } = await articlesQuery

      if (articlesError) {
        return reply.status(500).send({ 
          message: 'Gagal mengambil data artikel.', 
          error: articlesError 
        })
      }

      // Format the response data
      const articles = articlesData?.map(article => {
        const author = article.author as any
        return {
          articleId: article.article_id,
          title: article.title,
          slug: article.slug,
          views: article.views || 0,
          category: article.category,
          createdAt: article.created_at,
          updatedAt: article.updated_at,
          author: {
            userId: author?.user_id || article.author_id,
            name: author?.fullname || author?.username || `${author?.first_name || ''} ${author?.last_name || ''}`.trim() || 'Unknown',
            email: author?.email || 'Unknown'
          }
        }
      }) || []

      // Calculate summary statistics
      const totalArticles = articles.length
      const totalViews = articles.reduce((sum, article) => sum + article.views, 0)
      const avgViewsPerArticle = totalArticles > 0 ? totalViews / totalArticles : 0
      const maxViews = articles.length > 0 ? Math.max(...articles.map(a => a.views)) : 0
      const minViews = articles.length > 0 ? Math.min(...articles.map(a => a.views)) : 0

      return reply.send({
        message: 'Data artikel dengan views terbanyak berhasil diambil.',
        data: {
          summary: {
            totalArticles,
            totalViews,
            avgViewsPerArticle: Number(avgViewsPerArticle.toFixed(2)),
            maxViews,
            minViews
          },
          filters: {
            dateFrom: query.date_from || null,
            dateTo: query.date_to || null,
            orderBy,
            orderDirection,
            limit
          },
          articles
        }
      })

    } catch (error) {
      return reply.status(500).send({ 
        message: 'Terjadi kesalahan saat mengambil data artikel.', 
        error 
      })
    }
  })

  // GET: Article view statistics
  server.get('/analytics/articles/views', async (req, reply) => {
    const query = req.query as {
      limit?: string
      order_by?: 'view_count' | 'article_title' | 'created_at'
      order_direction?: 'asc' | 'desc'
      date_from?: string
      date_to?: string
    }

    const limit = query.limit ? parseInt(query.limit) : 50
    const orderBy = query.order_by || 'view_count'
    const orderDirection = query.order_direction || 'desc'

    try {
      // Base query to get analytics data for articles
      // Exclude null and empty article_id values
      let analyticsQuery = supabase
        .from('analytics_logs')
        .select('article_id, article_slug, created_at')
        .not('article_id', 'is', null)
        .not('article_id', 'eq', '')

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

      // Group analytics by article and count views
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
        
        // Update latest view date
        if (!articleStats.latestViewDate || log.created_at > articleStats.latestViewDate) {
          articleStats.latestViewDate = log.created_at
        }
      }

      // Get article details for the articles that have views (batch processing to avoid URI too long)
      const articleIds = Array.from(articleViewMap.keys())
      const batchSize = 100 // Process in batches to avoid URI too long error
      let articlesData: any[] = []

      // Process article IDs in batches
      for (let i = 0; i < articleIds.length; i += batchSize) {
        const batch = articleIds.slice(i, i + batchSize)
        const { data: batchData, error: batchError } = await supabase
          .from('articles')
          .select(`
            _id,
            article_id,
            title,
            slug,
            created_at,
            author_id,
            category,
            views
          `)
          .in('article_id', batch)

        if (batchError) {
          return reply.status(500).send({ 
            message: 'Gagal mengambil data artikel.', 
            error: batchError 
          })
        }

        if (batchData) {
          articlesData = [...articlesData, ...batchData]
        }
      }

      // Get author details (also batch this to be safe)
      const authorIds = [...new Set(articlesData?.map(article => article.author_id).filter(Boolean))]
      let authorsData: any[] = []

      // Process author IDs in batches
      for (let i = 0; i < authorIds.length; i += batchSize) {
        const batch = authorIds.slice(i, i + batchSize)
        const { data: batchData } = await supabase
          .from('users')
          .select('user_id, username, fullname, first_name, last_name')
          .in('user_id', batch)

        if (batchData) {
          authorsData = [...authorsData, ...batchData]
        }
      }

      const authorsMap = new Map(authorsData?.map(author => [author.user_id, author]) || [])

      // Merge article details with view statistics from analytics_logs only
      let result = articlesData?.map(article => {
        const viewStats = articleViewMap.get(article.article_id?.toString())
        const author = authorsMap.get(article.author_id)
        
        return {
          articleId: article.article_id,
          title: article.title,
          slug: article.slug,
          category: article.category,
          authorName: author?.fullname || author?.username || `${author?.first_name || ''} ${author?.last_name || ''}`.trim() || 'Unknown',
          createdAt: article.created_at,
          viewCount: viewStats?.viewCount || 0, // Only count from analytics_logs
          totalCount: article.views,
          latestViewDate: viewStats?.latestViewDate
        }
      }) || []

      // Sort based on query parameters
      result.sort((a, b) => {
        let comparison = 0
        
        switch (orderBy) {
          case 'view_count':
            comparison = a.viewCount - b.viewCount
            break
          case 'article_title':
            comparison = a.title.localeCompare(b.title)
            break
          case 'created_at':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            break
          default:
            comparison = a.viewCount - b.viewCount
        }

        return orderDirection === 'desc' ? -comparison : comparison
      })

      // Apply limit
      result = result.slice(0, limit)

      // Calculate summary statistics based on analytics_logs data only
      const totalArticles = result.length
      const totalViews = result.reduce((sum, article) => sum + article.viewCount, 0)
      const avgViewsPerArticle = totalArticles > 0 ? totalViews / totalArticles : 0

      return reply.send({
        message: 'Data statistik views per artikel berhasil diambil dari analytics logs.',
        data: {
          summary: {
            totalArticles,
            totalViews,
            avgViewsPerArticle: Number(avgViewsPerArticle.toFixed(2))
          },
          filters: {
            dateFrom: query.date_from || null,
            dateTo: query.date_to || null,
            orderBy,
            orderDirection,
            limit
          },
          articles: result
        }
      })

    } catch (error) {
      return reply.status(500).send({ 
        message: 'Terjadi kesalahan saat mengambil data artikel.', 
        error 
      })
    }
  })
} 