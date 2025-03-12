import { FastifyInstance } from "fastify";
import { createCategory } from "./create";
import { getCategories } from "./read";
import { updateCategory } from "./update";
import { deleteCategory } from "./delete";

export default async function categoryRoutes(fastify: FastifyInstance) {
    
  await Promise.all([
    createCategory(fastify),
    getCategories(fastify),
    updateCategory(fastify),
    deleteCategory(fastify)
  ]);
}