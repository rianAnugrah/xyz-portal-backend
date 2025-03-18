import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";
import {
  Article,
  ArticleQueryParams,
  CreateArticleInput,
} from "../../types/article";

export async function updateArticle(fastify: FastifyInstance) {
  // Update Article
  fastify.put<{
    Params: { id: string };
    Body: Partial<Article>;
  }>("/articles/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = {
        ...request.body,
        updated_at: Math.floor(Date.now() / 1000) * 1000,
      };

      const { data, error } = await supabase
        .from("articles")
        .update(updateData)
        .eq("article_id", id)
        .select("*")
        .single();

      if (error) throw error;
      if (!data) {
        return reply.code(404).send({ error: "Article not found" });
      }

      reply.send(data);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: "Failed to update article" });
    }
  });
}
