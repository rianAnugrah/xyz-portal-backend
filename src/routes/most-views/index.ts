import { FastifyInstance } from "fastify";
import { getMostViews } from "./read";

export default async function mostViewsRoutes(fastify: FastifyInstance) {
  await Promise.all([getMostViews(fastify)]);
}
