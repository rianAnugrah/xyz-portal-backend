import { FastifyInstance } from 'fastify'
import analyticsCoreRoutes from './analytics-core'
import analyticsChartsRoutes from './analytics-charts'
import analyticsArticlesRoutes from './analytics-articles'
import analyticsCategoriesRoutes from './analytics-categories'
import analyticsDebugRoutes from './analytics-debug'

export default async function analyticsRoutes(server: FastifyInstance) {
  // Register all analytics sub-routes
  await analyticsCoreRoutes(server)
  await analyticsChartsRoutes(server)
  await analyticsArticlesRoutes(server)
  await analyticsCategoriesRoutes(server)
  await analyticsDebugRoutes(server)
}
