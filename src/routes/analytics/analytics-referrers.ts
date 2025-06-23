import { FastifyInstance } from 'fastify'
import supabase from '../../supabase'

export default async function analyticsReferrersRoutes(server: FastifyInstance) {
  // GET: Referrer/source statistics
  server.get('/analytics/referrers/sources', async (req, reply) => {
    const query = req.query as {
      limit?: string
      order_by?: 'referrer_count' | 'referrer_name' | 'created_at'
      order_direction?: 'asc' | 'desc'
      date_from?: string
      date_to?: string
      group_by?: 'referrer' | 'referrer_url' | 'domain'
    }

    const limit = query.limit ? parseInt(query.limit) : 50
    const orderBy = query.order_by || 'referrer_count'
    const orderDirection = query.order_direction || 'desc'
    const groupBy = query.group_by || 'referrer'

    try {
      // Base query to get analytics data for referrers
      let analyticsQuery = supabase
        .from('analytics_logs')
        .select('referrer, referrer_url, created_at')
        .not('referrer', 'is', null)
        .not('referrer', 'eq', '')

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
          message: 'Gagal mengambil data analytics referrer.', 
          error: analyticsError 
        })
      }

      // Function to extract domain from URL
      const extractDomain = (url: string): string => {
        try {
          if (!url || url === 'direct' || url === 'unknown') return url
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url
          }
          const domain = new URL(url).hostname
          return domain.replace('www.', '')
        } catch {
          return url || 'unknown'
        }
      }

      // Group analytics by referrer and count visits
      const referrerMap = new Map<string, {
        referrerKey: string
        referrerName: string
        referrerUrl?: string
        visitCount: number
        latestVisitDate?: string
        firstVisitDate?: string
      }>()

      for (const log of analyticsData || []) {
        let referrerKey: string
        let referrerName: string
        let referrerUrl: string | undefined

        switch (groupBy) {
          case 'referrer_url':
            referrerKey = log.referrer_url || log.referrer || 'direct'
            referrerName = log.referrer_url || log.referrer || 'Direct Traffic'
            referrerUrl = log.referrer_url
            break
          case 'domain':
            const domain = extractDomain(log.referrer_url || log.referrer || '')
            referrerKey = domain
            referrerName = domain === 'direct' || domain === 'unknown' ? 'Direct Traffic' : domain
            referrerUrl = log.referrer_url
            break
          case 'referrer':
          default:
            referrerKey = log.referrer || 'direct'
            referrerName = log.referrer || 'Direct Traffic'
            referrerUrl = log.referrer_url
            break
        }

        if (!referrerMap.has(referrerKey)) {
          referrerMap.set(referrerKey, {
            referrerKey,
            referrerName,
            referrerUrl,
            visitCount: 0,
            latestVisitDate: log.created_at,
            firstVisitDate: log.created_at
          })
        }

        const referrerStats = referrerMap.get(referrerKey)!
        referrerStats.visitCount += 1
        
        // Update latest visit date
        if (!referrerStats.latestVisitDate || log.created_at > referrerStats.latestVisitDate) {
          referrerStats.latestVisitDate = log.created_at
        }
        
        // Update first visit date
        if (!referrerStats.firstVisitDate || log.created_at < referrerStats.firstVisitDate) {
          referrerStats.firstVisitDate = log.created_at
        }
      }

      // Convert map to array and sort
      let result = Array.from(referrerMap.values())

      // Sort based on query parameters
      result.sort((a, b) => {
        let comparison = 0
        
        switch (orderBy) {
          case 'referrer_count':
            comparison = a.visitCount - b.visitCount
            break
          case 'referrer_name':
            comparison = a.referrerName.localeCompare(b.referrerName)
            break
          case 'created_at':
            comparison = new Date(a.latestVisitDate || 0).getTime() - new Date(b.latestVisitDate || 0).getTime()
            break
          default:
            comparison = a.visitCount - b.visitCount
        }

        return orderDirection === 'desc' ? -comparison : comparison
      })

      // Apply limit
      result = result.slice(0, limit)

      // Calculate summary statistics
      const totalReferrers = result.length
      const totalVisits = result.reduce((sum, referrer) => sum + referrer.visitCount, 0)
      const avgVisitsPerReferrer = totalReferrers > 0 ? totalVisits / totalReferrers : 0
      const topReferrer = result.length > 0 ? result[0] : null

      return reply.send({
        message: 'Data statistik referrer berhasil diambil.',
        data: {
          summary: {
            totalReferrers,
            totalVisits,
            avgVisitsPerReferrer: Number(avgVisitsPerReferrer.toFixed(2)),
            topReferrer: topReferrer ? {
              name: topReferrer.referrerName,
              visits: topReferrer.visitCount
            } : null
          },
          filters: {
            dateFrom: query.date_from || null,
            dateTo: query.date_to || null,
            groupBy,
            orderBy,
            orderDirection,
            limit
          },
          referrers: result.map(referrer => ({
            referrerName: referrer.referrerName,
            referrerUrl: referrer.referrerUrl,
            visitCount: referrer.visitCount,
            latestVisitDate: referrer.latestVisitDate,
            firstVisitDate: referrer.firstVisitDate,
            percentage: totalVisits > 0 ? Number(((referrer.visitCount / totalVisits) * 100).toFixed(2)) : 0
          }))
        }
      })

    } catch (error) {
      return reply.status(500).send({ 
        message: 'Terjadi kesalahan saat mengambil data referrer.', 
        error 
      })
    }
  })

  // GET: Top referrer domains (simplified endpoint)
  server.get('/analytics/referrers/domains', async (req, reply) => {
    const query = req.query as {
      limit?: string
      date_from?: string
      date_to?: string
    }

    const limit = query.limit ? parseInt(query.limit) : 20

    try {
      // Base query to get analytics data for referrers
      let analyticsQuery = supabase
        .from('analytics_logs')
        .select('referrer, referrer_url, created_at')
        .not('referrer', 'is', null)
        .not('referrer', 'eq', '')

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
          message: 'Gagal mengambil data analytics referrer.', 
          error: analyticsError 
        })
      }

      // Function to extract domain from URL
      const extractDomain = (url: string): string => {
        try {
          if (!url || url === 'direct' || url === 'unknown') return 'Direct Traffic'
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url
          }
          const domain = new URL(url).hostname
          return domain.replace('www.', '')
        } catch {
          return 'Unknown'
        }
      }

      // Group by domain
      const domainCounts = new Map<string, number>()

      for (const log of analyticsData || []) {
        const domain = extractDomain(log.referrer_url || log.referrer || '')
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
      }

      // Convert to array and sort by count
      const sortedDomains = Array.from(domainCounts.entries())
        .map(([domain, count]) => ({ domain, visits: count }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, limit)

      return reply.send({
        message: 'Data top referrer domains berhasil diambil.',
        data: {
          summary: {
            totalDomains: domainCounts.size,
            totalVisits: Array.from(domainCounts.values()).reduce((sum, count) => sum + count, 0)
          },
          domains: sortedDomains
        }
      })

    } catch (error) {
      return reply.status(500).send({ 
        message: 'Terjadi kesalahan saat mengambil data referrer domains.', 
        error 
      })
    }
  })
} 