import { FastifyInstance } from 'fastify'
import supabase from '../../supabase'

export default async function analyticsCoreRoutes(server: FastifyInstance) {
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
      event_type?: string
      ad_position?: string
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
      country: body.country || null,
      event_type: body.event_type || null,
      ad_position: body.ad_position || null
    })
  
    if (error) {
      return reply.status(500).send({ message: 'Gagal menyimpan data analytics.', error })
    }
    
    if (body.article_id) {
      // Alternative: SELECT current views, then UPDATE with incremented value
      try {
        const { data: articleData, error: selectError } = await supabase
          .from('articles')
          .select('views')
          .eq('article_id', body.article_id)
          .single()
        
        if (!selectError && articleData) {
          const currentViews = articleData.views || 0
          await supabase
            .from('articles')
            .update({ views: currentViews + 1 })
            .eq('article_id', body.article_id)
        }
      } catch (error) {
        console.error('Failed to increment article views:', error)
      }
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

  // GET: Duration summary
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

  // GET: Ads count by position
  server.get('/analytics/ads/position-stats', async (req, reply) => {
    const query = req.query as {
      date_from?: string
      date_to?: string
    }

    try {
      // Base query to get ads analytics data
      let adsQuery = supabase
        .from('analytics_logs')
        .select('ad_position, event_type, created_at')
        .not('ad_position', 'is', null)
        .not('ad_position', 'eq', '')

      // Apply date filters if provided
      if (query.date_from) {
        adsQuery = adsQuery.gte('created_at', query.date_from)
      }
      if (query.date_to) {
        adsQuery = adsQuery.lte('created_at', query.date_to + 'T23:59:59.999Z')
      }

      const { data: adsData, error: adsError } = await adsQuery

      if (adsError) {
        return reply.status(500).send({ 
          message: 'Gagal mengambil data ads.', 
          error: adsError 
        })
      }

      // Group ads data by position and event type
      const positionStats: Record<string, { click: number, touch: number, other: number }> = {}

      for (const log of adsData || []) {
        const position = log.ad_position
        const eventType = log.event_type || 'other'

        if (!positionStats[position]) {
          positionStats[position] = {
            click: 0,
            touch: 0,
            other: 0
          }
        }

        // Count events by type
        switch (eventType.toLowerCase()) {
          case 'click':
            positionStats[position].click += 1
            break
          case 'touch':
            positionStats[position].touch += 1
            break
          default:
            positionStats[position].other += 1
            break
        }
      }

      // Calculate totals
      const totalStats = {
        click: 0,
        touch: 0,
        other: 0
      }

      Object.values(positionStats).forEach(stats => {
        totalStats.click += stats.click
        totalStats.touch += stats.touch
        totalStats.other += stats.other
      })

      return reply.send({
        message: 'Data statistik ads per posisi berhasil diambil.',
        data: {
          ad_position: positionStats,
          total: totalStats,
          filters: {
            dateFrom: query.date_from || null,
            dateTo: query.date_to || null
          }
        }
      })

    } catch (error) {
      return reply.status(500).send({ 
        message: 'Terjadi kesalahan saat mengambil data ads.', 
        error 
      })
    }
  })
} 