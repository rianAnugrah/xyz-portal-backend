import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { formatDate } from "../../helpers/date-format";

export async function getMostViews(fastify: FastifyInstance) {
  fastify.get("/most-views", async (request, reply) => {
    fastify.log.info("Starting query for headlines...");
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // Mengurangi 3 hari dari tanggal saat ini

    let query = supabase
      .from("articles")
      .select(
        `
        _id,
        article_id,
        title,
        slug,
        date,
        image,
        views,
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

    const { data, error } = await query;

    fastify.log.info("Query executed:", { data, error });

    if (error) {
      return reply.status(500).send({
        message: "Failed to fetch most views",
        error: error.message,
      });
    }

    return reply.send({
      message: "success",
      data: data || [],
    });
  });
}
