import { FastifyInstance } from 'fastify'
import supabase from '../../supabase'
import { formatDate, getWeekKey } from '../../helpers/analytics-utils'

export default async function analyticsChartsRoutes(server: FastifyInstance) {
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
} 