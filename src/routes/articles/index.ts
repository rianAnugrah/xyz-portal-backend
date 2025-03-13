import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { createArticle } from "./create";
import { readArticle } from "./read";
import { updateArticle } from "./update";
import { deleteArticle } from "./delete";

export default async function articleRoutes(fastify: FastifyInstance) {
    
  await Promise.all([
    createArticle(fastify),
    readArticle(fastify),
    updateArticle(fastify),
    deleteArticle(fastify)
  ]);
}
