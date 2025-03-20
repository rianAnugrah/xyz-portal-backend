import { FastifyInstance } from "fastify";
import { getHeadlines } from "./read";
import { createHeadlines } from "./create";

export default async function headlineRoutes(fastify: FastifyInstance) {
  await Promise.all([getHeadlines(fastify), createHeadlines(fastify)]);
}
