import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { formatDate } from "../../helpers/date-format";
import { ArticleQueryParams } from "../../types/article";

export async function getHeadlines(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: ArticleQueryParams;
  }>("/headlines", async (request, reply) => {
    fastify.log.info("Starting query for headlines...");

    const { platform_id } = request.query;

    let query = supabase.from("headlines").select(
      `position,
        article_id,
      article:article_id (
        _id,
        article_id,
        platform_id,
        title,
        slug,
        date,
        description,
        category,
        tags,
        image,
        author:author_id (
          user_id,
          username,
          fullname,
          avatar
        )
      )
    `
    );

    if (platform_id) {
      fastify.log.info("Filtering by platform_id:", platform_id);
      query = query.eq("platform_id", platform_id);
    }

    const { data, error } = await query;

    fastify.log.info("Query executed:", { data, error });

    if (error) {
      return reply.status(500).send({
        message: "Failed to fetch headlines",
        error: error.message,
      });
    }

    const formattedData = data?.map((headline: any) => ({
      ...headline,
      article: {
        ...headline.article,
        image: headline.article.image.includes("http")
          ? headline.article.image
          : `${process.env.IMAGE_URL}${headline.article.image}`,
        date: formatDate(headline.article.date),
      },
    }));

    return reply.send({
      message: "success",
      data: formattedData || [],
    });
  });
}
