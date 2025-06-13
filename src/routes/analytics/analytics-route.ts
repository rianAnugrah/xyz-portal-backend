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

export default async function analyticsRoutes(server: FastifyInstance) {
  // POST: Simpan data
  server.post('/analytics', async (req, reply) => {
    const body = req.body as {
      visitorId: string
      ip: string
      referrer?: string
      timestamp?: string
      type: string
      url: string
      userAgent: string
      browser?: string
      os?: string
      device?: string
      country?: string
      city?: string
      platform?: string
      screenWidth?: number
      screenHeight?: number
      sessionId?: string
    }

    const { error } = await supabase.from('analytics_logs').insert({
      visitor_id: body.visitorId,
      ip: body.ip,
      referrer: body.referrer || null,
      timestamp: body.timestamp || new Date().toISOString(),
      type: body.type,
      url: body.url,
      user_agent: body.userAgent,
      browser: body.browser || null,
      os: body.os || null,
      device: body.device || null,
      country: body.country || null,
      city: body.city || null,
      platform: body.platform || null,
      screen_width: body.screenWidth || null,
      screen_height: body.screenHeight || null,
      session_id: body.sessionId || null
    })

    if (error) return reply.status(500).send({ message: 'Gagal simpan data.', error })

    return reply.send({ message: 'Berhasil simpan data.' })
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
    const { data, error } = await supabase.from('analytics_logs').select('created_at').order('created_at', { ascending: true })
    if (error) return reply.status(500).send({ message: 'Gagal ambil data.', error })

    const result: Record<string, number> = {}
    for (const item of data ?? []) {
      const d = new Date(item.created_at)
      const key = formatDate(d)
      result[key] = (result[key] || 0) + 1
    }

    return reply.send({
      message: 'Daily chart generated.',
      data: Object.entries(result).map(([date, count]) => ({ date, count }))
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
}
