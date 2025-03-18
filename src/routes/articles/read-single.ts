import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";
import { ArticleQueryParams, CreateArticleInput } from "../../types/article";

export async function readArticleSingle(fastify: FastifyInstance) {
  // Read Single Article
  fastify.get<{
    Params: { id: string };
  }>("/articles/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      const { data, error } = await supabase
        .from("articles")
        .select(
          `
        *,
        author:author_id (
          user_id,
          username,
          email,
          fullname,
          first_name,
          last_name,
          role,
          avatar
        )
      `
        )
        .eq("_id", id)
        .eq("is_deleted", false)
        .single();

      if (error) throw error;
      if (!data) {
        return reply.code(404).send({ error: "Article not found" });
      }

      reply.send(data);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: "Failed to fetch article" });
    }
  });
}
