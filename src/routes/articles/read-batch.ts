import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { ArticleQueryParams } from "../../types/article"; // Adjust path as needed
import { formatDate } from "../../helpers/date-format";

export async function readArticleBatch(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: ArticleQueryParams;
  }>("/articles", async (request, reply) => {
    try {
      const {
        page = "1",
        limit = "10",
        sortBy = "date", //creted_at
        sortOrder = "desc",
        search,
        tags,
        category,
        status,
        platform_id,
        author_id,
      } = request.query;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum - 1;

      console.log("======= Query Params =========");
      console.log(request.query);

      let query = supabase
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
      `,
          { count: "exact" }
        )
        .eq("is_deleted", false);

      if (status) {
        fastify.log.info("Filtering by status:", status);
        query = query.eq("status", status);
      }

      if (author_id) {
        fastify.log.info("Filtering by author_id:", author_id);
        query = query.eq("author_id", author_id);
      }

      if (platform_id) {
        fastify.log.info("Filtering by platform_id:", platform_id);
        query = query.eq("platform_id", platform_id);
      }

      // if (search) {
      //   query = query.or(
      //     `title.ilike.%${search}%,description.ilike.%${search}%`
      //   );
      // }

      if (search) {
        query = query.or(`title.ilike.%${search}%`);
      }

      if (tags) {
        const tagsArray = tags.split(",").map((tag) => tag.trim());
        fastify.log.info("Parsed tags array:", tagsArray);
        query = query.contains("tags", JSON.stringify(tagsArray));
      }

      if (category) {
        const categoryArray = category.split(",").map((cat) => cat.trim());
        fastify.log.info("Parsed category array:", categoryArray);
        query = query.contains("category", JSON.stringify(categoryArray));
      }

      query = query.order(sortBy, { ascending: sortOrder === "asc" });
      query = query.range(start, end);

      const { data, error, count } = await query;
      fastify.log.info("Query result:", { data, count, error });

      if (error) throw error;

      // Format date fields using the utility function
      const formattedData = data?.map((article) => ({
        ...article,
        created_at: formatDate(article.created_at),
        date: formatDate(article.date),
        updated_at: formatDate(article.updated_at),
        approved_at: formatDate(article.approved_at),
        // Add other date fields if needed, e.g., updated_at
        // updated_at: formatDate(article.updated_at),
      }));

      const totalPages = Math.ceil((count || 0) / limitNum);

      reply.send({
        data: formattedData || [],
        meta: {
          page: pageNum,
          limit: limitNum,
          totalItems: count || 0,
          totalPages,
          sortBy,
          sortOrder,
        },
      });
    } catch (error) {
      fastify.log.error("Error fetching articles:", error);
      reply.code(500).send({ error: "Failed to fetch articles" });
    }
  });
}
