import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";
import { ArticleQueryParams, CreateArticleInput } from "../../types/article";

export async function readArticle(fastify: FastifyInstance) {

  // Read All Articles dengan filter, sort, pagination, search, tags, dan category
  fastify.get<{
    Querystring: ArticleQueryParams;
  }>("/articles", async (request, reply) => {
    try {
      const {
        page = "1",
        limit = "10",
        sortBy = "created_at",
        sortOrder = "desc",
        search,
        tags,
        category,
        status,
      } = request.query;

      // Konversi page dan limit ke number
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum - 1;

      // Buat query dasar
      let query = supabase
        .from("articles")
        .select("*", { count: "exact" }) // Hitung total untuk pagination
        .eq("is_deleted", false);

      // Filter berdasarkan status (jika ada)
      if (status) {
        query = query.eq("status", status);
      }

      // Pencarian berdasarkan title atau description
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      // Filter berdasarkan tags (menggunakan contains untuk JSONB)
      if (tags) {
        const tagsArray = tags.split(",").map((tag) => tag.trim());
        query = query.contains("tags", tagsArray);
      }

      // Filter berdasarkan category (menggunakan contains untuk JSONB)
      if (category) {
        const categoryArray = category.split(",").map((cat) => cat.trim());
        query = query.contains("category", categoryArray);
      }

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      // Pagination
      query = query.range(start, end);

      // Eksekusi query
      const { data, error, count } = await query;

      if (error) throw error;

      // Hitung total halaman
      const totalPages = Math.ceil((count || 0) / limitNum);

      // Response dengan metadata pagination
      reply.send({
        data: data || [],
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
      fastify.log.error(error);
      reply.code(500).send({ error: "Failed to fetch articles" });
    }
  });

  // ... (kode lain untuk POST, GET single, PUT, DELETE tetap sama)

  // Read Single Article
  fastify.get<{
    Params: { id: string };
  }>("/articles/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      const { data, error } = await supabase
        .from("articles")
        .select("*")
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