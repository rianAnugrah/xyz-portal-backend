import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { formatDate } from "../../helpers/date-format";
import { ArticleQueryParams } from "../../types/article";

export async function getMostViews(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: ArticleQueryParams;
  }>("/most-views", async (request, reply) => {
    fastify.log.info("Starting query for headlines...");
    const { platform_id } = request.query;
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // Mengurangi 3 hari dari tanggal saat ini

    let query = supabase
      .from("articles")
      .select(
        `
        _id,
        article_id,
        platform_id,
        title,
        slug,
        date,
        image,
        views,
        category,
        tags,
        description,
        author:author_id (
          user_id,
          username,
          fullname,
          avatar
        )
      `
      )
      .gt("date", threeDaysAgo.toISOString()) // Menggunakan ISO string yang kompatibel dengan PostgreSQL
      .order("views", { ascending: false }) // Urutkan berdasarkan views terbanyak
      .limit(5); // Ambil 5 artikel

    if (platform_id) {
      fastify.log.info("Filtering by platform_id:", platform_id);
      query = query.eq("platform_id", platform_id);
    }
    const { data, error } = await query;

    fastify.log.info("Query executed:", { data, error });

    if (error) {
      return reply.status(500).send({
        message: "Failed to fetch most views",
        error: error.message,
      });
    }

    const formattedData = data?.map((article) => ({
      ...article,
      date: formatDate(article.date),
      image: article.image.includes("http")
        ? article.image
        : `${process.env.IMAGE_URL}${article.image}`,
      // Add other date fields if needed, e.g., updated_at
      // updated_at: formatDate(article.updated_at),
    }));

    return reply.send({
      message: "success",
      data: formattedData || [],
    });
  });
}
