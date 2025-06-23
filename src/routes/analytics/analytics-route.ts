import { FastifyInstance } from 'fastify'
import supabase from '../../supabase'

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getWeekKey(date: Date): string {
  const firstDay = new Date(date)
  firstDay.setDate(date.getDate() - ((date.getDay() + 6) % 7)) // Monday as first day
  return `${firstDay.getFullYear()}-W${String(getWeekNumber(firstDay)).padStart(2, '0')}`
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function fillMissingPeriods(result: Record<string, number>, dateFrom: string, dateTo: string, groupBy: 'day' | 'week' | 'month'): Record<string, number> {
  const filledResult: Record<string, number> = { ...result }
  const startDate = new Date(dateFrom)
  const endDate = new Date(dateTo)
  
  if (groupBy === 'day') {
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const key = formatDate(currentDate)
      if (!(key in filledResult)) {
        filledResult[key] = 0
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
  } else if (groupBy === 'week') {
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const key = getWeekKey(currentDate)
      if (!(key in filledResult)) {
        filledResult[key] = 0
      }
      currentDate.setDate(currentDate.getDate() + 7)
    }
  } else if (groupBy === 'month') {
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      if (!(key in filledResult)) {
        filledResult[key] = 0
      }
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
  }
  
  return filledResult
}

export default async function analyticsRoutes(server: FastifyInstance) {
  // POST: Simpan data
  server.post('/analytics', async (req, reply) => {
    const body = req.body as {
      visitorId: string
      sessionId?: string
      ip: string
      userAgent: string
      platform: string
      browser: string
      device: string
      os: string
      screenWidth?: number
      screenHeight?: number
      referrer?: string
      referrerUrl?: string
      pathname?: string
      url: string
      type: string
      is_article_page?: boolean
      category_slug?: string
      article_id?: string
      article_slug?: string
      tag_list?: string[]
      timestamp?: string
      exitedAt?: string
      duration?: number
      platform_id?: number
      country?: string
    }
  
    const { error } = await supabase.from('analytics_logs').insert({
      visitor_id: body.visitorId,
      session_id: body.sessionId || null,
      ip: body.ip,
      user_agent: body.userAgent,
      platform: body.platform,
      browser: body.browser,
      device: body.device,
      os: body.os,
      screen_width: body.screenWidth || null,
      screen_height: body.screenHeight || null,
      referrer: body.referrer || null,
      referrer_url: body.referrerUrl || null,
      pathname: body.pathname || null,
      url: body.url,
      type: body.type,
      is_article_page: body.is_article_page ?? null,
      category_slug: body.category_slug || null,
      article_id: body.article_id || null,
      article_slug: body.article_slug || null,
      tag_list: body.tag_list || null,
      timestamp: body.timestamp || new Date().toISOString(),
      exited_at: body.exitedAt || null,
      duration: body.duration || null,
      platform_id: body.platform_id || null,
      country: body.country || null
    })
  
    if (error) {
      return reply.status(500).send({ message: 'Gagal menyimpan data analytics.', error })
    }
    
    if (body.article_id) {
      await supabase.rpc('increment_article_view', { aid: body.article_id })
    }
    
    
  
    return reply.send({ message: 'Data analytics berhasil disimpan.' })
  })
  

  // GET: Data analytics
  server.get('/analytics', async (req, reply) => {
    const query = req.query as {
      type?: string
      date_from?: string
      date_to?: string
      ip?: string
      visitorId?: string
      limit?: string
    }

    let db = supabase.from('analytics_logs').select('*').order('created_at', { ascending: false })

    if (query.type) db = db.eq('type', query.type)
    if (query.ip) db = db.eq('ip', query.ip)
    if (query.visitorId) db = db.eq('visitor_id', query.visitorId)
    if (query.date_from) db = db.gte('created_at', query.date_from)
    if (query.date_to) db = db.lte('created_at', query.date_to)
    if (query.limit) db = db.limit(parseInt(query.limit))

    const { data, error } = await db
    if (error) return reply.status(500).send({ message: 'Gagal ambil data.', error })

    return reply.send({ message: 'Berhasil ambil data.', data })
  })

  // GET: Chart daily
  server.get('/analytics/chart/daily', async (req, reply) => {
    const { data, error } = await supabase
      .from('analytics_logs')
      .select('created_at, visitor_id, duration')
      .order('created_at', { ascending: true })
    
    if (error) return reply.status(500).send({ message: 'Gagal ambil data.', error })

    const result: Record<string, {
      totalVisitors: number
      uniqueVisitors: Set<string>
      totalDuration: number
      validDurationCount: number
    }> = {}

    for (const item of data ?? []) {
      const d = new Date(item.created_at)
      const key = formatDate(d)
      
      if (!result[key]) {
        result[key] = {
          totalVisitors: 0,
          uniqueVisitors: new Set(),
          totalDuration: 0,
          validDurationCount: 0
        }
      }
      
      // Hitung total visitors (semua entries)
      result[key].totalVisitors += 1
      
      // Hitung unique visitors (visitor_id unik per hari)
      if (item.visitor_id) {
        result[key].uniqueVisitors.add(item.visitor_id)
      }
      
      // Hitung durasi rata-rata
      if (item.duration && item.duration > 0) {
        result[key].totalDuration += item.duration
        result[key].validDurationCount += 1
      }
    }

    return reply.send({
      message: 'Daily chart generated.',
      data: Object.entries(result).map(([date, stats]) => ({
        date,
        totalVisitors: stats.totalVisitors,
        uniqueVisitors: stats.uniqueVisitors.size,
        duration: stats.validDurationCount > 0 
          ? Number((stats.totalDuration / stats.validDurationCount).toFixed(2))
          : 0
      }))
    })
  })

  // GET: Chart weekly
  server.get('/analytics/chart/weekly', async (req, reply) => {
    const { data, error } = await supabase.from('analytics_logs').select('created_at').order('created_at', { ascending: true })
    if (error) return reply.status(500).send({ message: 'Gagal ambil data.', error })

    const result: Record<string, number> = {}
    for (const item of data ?? []) {
      const d = new Date(item.created_at)
      const key = getWeekKey(d)
      result[key] = (result[key] || 0) + 1
    }

    return reply.send({
      message: 'Weekly chart generated.',
      data: Object.entries(result).map(([week, count]) => ({ week, count }))
    })
  })

  // GET: Chart monthly
  server.get('/analytics/chart/monthly', async (req, reply) => {
    const { data, error } = await supabase.from('analytics_logs').select('created_at').order('created_at', { ascending: true })
    if (error) return reply.status(500).send({ message: 'Gagal ambil data.', error })

    const result: Record<string, number> = {}
    for (const item of data ?? []) {
      const d = new Date(item.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      result[key] = (result[key] || 0) + 1
    }

    return reply.send({
      message: 'Monthly chart generated.',
      data: Object.entries(result).map(([month, count]) => ({ month, count }))
    })
  })

  // GET: Chart weekly progress
  server.get('/analytics/chart/weekly-progress', async (req, reply) => {
    const { data, error } = await supabase.from('analytics_logs').select('created_at').order('created_at', { ascending: true })
    if (error) return reply.status(500).send({ message: 'Gagal ambil data.', error })

    const result: Record<string, number> = {}
    for (const item of data ?? []) {
      const d = new Date(item.created_at)
      const key = getWeekKey(d)
      result[key] = (result[key] || 0) + 1
    }

    const sortedWeeks = Object.keys(result).sort()
    const progress = sortedWeeks.map((week, i) => {
      const current = result[week]
      const prev = i > 0 ? result[sortedWeeks[i - 1]] : 0
      const growth = prev === 0 ? 0 : ((current - prev) / prev) * 100
      return {
        week,
        current,
        previous: prev,
        growth: Number(growth.toFixed(2))
      }
    })

    return reply.send({ message: 'Weekly progress generated.', data: progress })
  })

  server.get('/analytics/duration-summary', async (req, reply) => {
    const { data, error } = await supabase
      .from('analytics_logs')
      .select('duration')
      .not('duration', 'is', null)

    if (error) {
      return reply.status(500).send({ message: 'Gagal mengambil data durasi.', error })
    }

    const durations = data.map((d: any) => d.duration ?? 0)
    const totalVisit = durations.length
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const avgDuration = totalVisit === 0 ? 0 : totalDuration / totalVisit

    return reply.send({
      message: 'Durasi summary berhasil diambil.',
      data: {
        totalVisit,
        totalDuration,
        avgDuration: Number(avgDuration.toFixed(2))
      }
    })
  })

  // GET: Chart data based on date range
  server.get('/analytics/chart/date-range', async (req, reply) => {
    const query = req.query as {
      date_from?: string
      date_to?: string
      group_by?: 'day' | 'week' | 'month'
    }

    // Default to last 30 days if no date range provided
    const dateFrom = query.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const dateTo = query.date_to || new Date().toISOString().split('T')[0]
    const groupBy = query.group_by || 'day'

    let db = supabase
      .from('analytics_logs')
      .select('created_at, visitor_id, duration')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo + 'T23:59:59.999Z')
      .order('created_at', { ascending: true })

    const { data, error } = await db
    if (error) return reply.status(500).send({ message: 'Gagal ambil data.', error })

    const result: Record<string, {
      totalVisitors: number
      uniqueVisitors: Set<string>
      totalDuration: number
      validDurationCount: number
    }> = {}
    
    for (const item of data ?? []) {
      const d = new Date(item.created_at)
      let key: string
      
      switch (groupBy) {
        case 'week':
          key = getWeekKey(d)
          break
        case 'month':
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          break
        case 'day':
        default:
          key = formatDate(d)
          break
      }
      
      if (!result[key]) {
        result[key] = {
          totalVisitors: 0,
          uniqueVisitors: new Set(),
          totalDuration: 0,
          validDurationCount: 0
        }
      }
      
      // Hitung total visitors (semua entries)
      result[key].totalVisitors += 1
      
      // Hitung unique visitors (visitor_id unik per periode)
      if (item.visitor_id) {
        result[key].uniqueVisitors.add(item.visitor_id)
      }
      
      // Hitung durasi rata-rata
      if (item.duration && item.duration > 0) {
        result[key].totalDuration += item.duration
        result[key].validDurationCount += 1
      }
    }

    // Fill in missing dates/periods with empty stats
    const filledResult: Record<string, {
      totalVisitors: number
      uniqueVisitors: Set<string>
      totalDuration: number
      validDurationCount: number
    }> = {}
    
    const startDate = new Date(dateFrom)
    const endDate = new Date(dateTo)
    
    if (groupBy === 'day') {
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const key = formatDate(currentDate)
        filledResult[key] = result[key] || {
          totalVisitors: 0,
          uniqueVisitors: new Set(),
          totalDuration: 0,
          validDurationCount: 0
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    } else if (groupBy === 'week') {
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const key = getWeekKey(currentDate)
        filledResult[key] = result[key] || {
          totalVisitors: 0,
          uniqueVisitors: new Set(),
          totalDuration: 0,
          validDurationCount: 0
        }
        currentDate.setDate(currentDate.getDate() + 7)
      }
    } else if (groupBy === 'month') {
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
        filledResult[key] = result[key] || {
          totalVisitors: 0,
          uniqueVisitors: new Set(),
          totalDuration: 0,
          validDurationCount: 0
        }
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }

    return reply.send({
      message: 'Chart data berhasil diambil.',
      data: {
        dateFrom,
        dateTo,
        groupBy,
        chartData: Object.entries(filledResult).map(([period, stats]) => ({
          date: period,
          totalVisitors: stats.totalVisitors,
          uniqueVisitors: stats.uniqueVisitors.size,
          duration: stats.validDurationCount > 0 
            ? Number((stats.totalDuration / stats.validDurationCount).toFixed(2))
            : 0
        }))
      }
    })
  })

  // GET: User article creation statistics
  server.get('/analytics/users/article-count', async (req, reply) => {
    const query = req.query as {
      limit?: string
      order_by?: 'article_count' | 'user_name' | 'created_at'
      order_direction?: 'asc' | 'desc'
      date_from?: string
      date_to?: string
    }

    const limit = query.limit ? parseInt(query.limit) : 50
    const orderBy = query.order_by || 'article_count'
    const orderDirection = query.order_direction || 'desc'

    try {
      // Base query to get users and their article counts
      let articlesQuery = supabase
        .from('articles')
        .select(`
          author_id,
          created_at,
          author:author_id (
            user_id,
            username,
            email,
            fullname,
            first_name,
            last_name,
            role
          )
        `)

      // Apply date filters if provided
      if (query.date_from) {
        articlesQuery = articlesQuery.gte('created_at', query.date_from)
      }
      if (query.date_to) {
        articlesQuery = articlesQuery.lte('created_at', query.date_to + 'T23:59:59.999Z')
      }

      const { data: articlesData, error: articlesError } = await articlesQuery

      if (articlesError) {
        return reply.status(500).send({ 
          message: 'Gagal mengambil data artikel.', 
          error: articlesError 
        })
      }

      // Group articles by user and count them
      const userArticleMap = new Map<string, {
        userId: string
        userName: string
        userEmail: string
        userCreatedAt: string
        articleCount: number
        latestArticleDate?: string
      }>()

      for (const article of articlesData || []) {
        const authorId = article.author_id
        const author = article.author as any

        if (!authorId || !author) continue

        if (!userArticleMap.has(authorId)) {
          userArticleMap.set(authorId, {
            userId: author.user_id || authorId,
            userName: author.fullname || author.username || `${author.first_name || ''} ${author.last_name || ''}`.trim() || 'Unknown',
            userEmail: author.email || 'Unknown',
            userCreatedAt: article.created_at, // Using article creation date as fallback
            articleCount: 0,
            latestArticleDate: article.created_at
          })
        }

        const userStats = userArticleMap.get(authorId)!
        userStats.articleCount += 1
        
        // Update latest article date
        if (!userStats.latestArticleDate || article.created_at > userStats.latestArticleDate) {
          userStats.latestArticleDate = article.created_at
        }
      }

      // Convert to array and sort
      let result = Array.from(userArticleMap.values())

      // Sort based on query parameters
      result.sort((a, b) => {
        let comparison = 0
        
        switch (orderBy) {
          case 'article_count':
            comparison = a.articleCount - b.articleCount
            break
          case 'user_name':
            comparison = a.userName.localeCompare(b.userName)
            break
          case 'created_at':
            comparison = new Date(a.userCreatedAt).getTime() - new Date(b.userCreatedAt).getTime()
            break
          default:
            comparison = a.articleCount - b.articleCount
        }

        return orderDirection === 'desc' ? -comparison : comparison
      })

      // Apply limit
      result = result.slice(0, limit)

      // Calculate summary statistics
      const totalUsers = result.length
      const totalArticles = result.reduce((sum, user) => sum + user.articleCount, 0)
      const avgArticlesPerUser = totalUsers > 0 ? totalArticles / totalUsers : 0

      return reply.send({
        message: 'Data statistik artikel per user berhasil diambil.',
        data: {
          summary: {
            totalUsers,
            totalArticles,
            avgArticlesPerUser: Number(avgArticlesPerUser.toFixed(2))
          },
          users: result.map(user => ({
            userId: user.userId,
            userName: user.userName,
            userEmail: user.userEmail,
            userCreatedAt: user.userCreatedAt,
            articleCount: user.articleCount,
            latestArticleDate: user.latestArticleDate
          }))
        }
      })

    } catch (error) {
      return reply.status(500).send({ 
        message: 'Terjadi kesalahan saat mengambil data.', 
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

      // Merge article details with view statistics
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
          viewCount: viewStats?.viewCount || 0,
          totalViews: article.views || 0, // Database stored views
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

      // Calculate summary statistics
      const totalArticles = result.length
      const totalViews = result.reduce((sum, article) => sum + article.viewCount, 0)
      const avgViewsPerArticle = totalArticles > 0 ? totalViews / totalArticles : 0

      return reply.send({
        message: 'Data statistik views per artikel berhasil diambil.',
        data: {
          summary: {
            totalArticles,
            totalViews,
            avgViewsPerArticle: Number(avgViewsPerArticle.toFixed(2))
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
}
