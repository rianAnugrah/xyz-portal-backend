export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getWeekKey(date: Date): string {
  const firstDay = new Date(date)
  firstDay.setDate(date.getDate() - ((date.getDay() + 6) % 7)) // Monday as first day
  return `${firstDay.getFullYear()}-W${String(getWeekNumber(firstDay)).padStart(2, '0')}`
}

export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function fillMissingPeriods(result: Record<string, number>, dateFrom: string, dateTo: string, groupBy: 'day' | 'week' | 'month'): Record<string, number> {
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