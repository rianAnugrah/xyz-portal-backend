import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";
import { ArticleQueryParams, CreateArticleInput } from "../../types/article";
import { formatDate } from "../../helpers/date-format";

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
        .eq("article_id", id)
        .eq("is_deleted", false)
        .single();

      if (error) throw error;
      if (!data) {
        return reply.code(404).send({ error: "Article not found" });
      }

      // Format the response data
      const formattedData = {
        ...data,
        created_at: formatDate(data.created_at),
        date: formatDate(data.date),
        updated_at: formatDate(data.updated_at),
        approved_at: formatDate(data.approved_at),
        image: data.image.includes("http")
          ? data.image
          : `${process.env.IMAGE_URL}${data.image}`,
      };

      reply.send(formattedData);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: "Failed to fetch article" });
    }
  });
}

export async function readArticleBySlug(fastify: FastifyInstance) {
  // Read Single Article
  fastify.get<{
    Params: { slug: string };
  }>("/articles-by-slug/:slug", async (request, reply) => {
    try {
      const { slug } = request.params;

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
        .eq("slug", slug)
        .eq("is_deleted", false)
        .single();

      if (error) throw error;
      if (!data) {
        return reply.code(404).send({ error: "Article not found" });
      }

      // Format the response data
      const formattedData = {
        ...data,
        created_at: formatDate(data.created_at),
        date: formatDate(data.date),
        updated_at: formatDate(data.updated_at),
        approved_at: formatDate(data.approved_at),
        image: data.image.includes("http")
          ? data.image
          : `${process.env.IMAGE_URL}${data.image}`,
      };

      reply.send(formattedData);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: "Failed to fetch article by slug" });
    }
  });
}
