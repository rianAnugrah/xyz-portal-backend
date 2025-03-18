import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { createArticle } from "./create";

import { updateArticle } from "./update";
import { deleteArticle } from "./delete";
import { readArticleSingle } from "./read-single";
import { readArticleBatch } from "./read-batch";
import { createArticleWithImage } from "./create-with-image";
import { createArticleWithFormData } from "./create-with-form-data";

export default async function articleRoutes(fastify: FastifyInstance) {
  await Promise.all([
    createArticle(fastify),
    createArticleWithImage(fastify),
    createArticleWithFormData(fastify),
    readArticleSingle(fastify),
    readArticleBatch(fastify),
    updateArticle(fastify),
    deleteArticle(fastify),
  ]);
}
