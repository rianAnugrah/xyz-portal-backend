import { FastifyInstance } from "fastify";
import supabase from "../../supabase";

export async function getCategories(fastify: FastifyInstance) {
  // Get all categories with search, filter, sort, and pagination
  fastify.get("/categories", async (request, reply) => {
    const { 
      search, // search di category_name dan category_desc
      platform_id, // filter by platform_id
      sort_by = "created_at", // default sort by created_at
      sort_order = "desc", // default descending
      page = 1, // default page 1
      limit = 10 // default 10 items per page
    } = request.query as {
      search?: string;
      platform_id?: string;
      sort_by?: string;
      sort_order?: "asc" | "desc";
      page?: number;
      limit?: number;
    };

    // Buat query dasar
    let query = supabase
      .from("categories")
      .select("*", { count: "exact" }); // count untuk total data

    // Search functionality
    if (search) {
      query = query
        .or(`category_name.ilike.%${search}%,category_desc.ilike.%${search}%`);
    }

    // Filter by platform_id
    if (platform_id) {
      query = query.eq("platform_id", platform_id);
    }

    // Sorting
    const validSortFields = ["created_at", "category_name", "category_count"];
    const sortField = validSortFields.includes(sort_by) ? sort_by : "created_at";
    const sortDirection = sort_order === "asc" ? true : false;
    query = query.order(sortField, { ascending: sortDirection });

    // Pagination
    const pageNum = Math.max(1, Number(page)); // ensure page >= 1
    const limitNum = Math.max(1, Math.min(100, Number(limit))); // limit between 1-100
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    query = query.range(from, to);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      return reply.status(500).send({ 
        message: "Failed to fetch categories", 
        error: error.message 
      });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limitNum);
    const pagination = {
      current_page: pageNum,
      per_page: limitNum,
      total_items: count || 0,
      total_pages: totalPages,
      has_next: pageNum < totalPages,
      has_previous: pageNum > 1
    };

    return reply.send({ 
      data: data || [],
      pagination
    });
  });

  // Get single category by id (tetap sama)
  fastify.get("/categories/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return reply.status(500).send({ 
        message: "Failed to fetch category", 
        error: error.message 
      });
    }

    if (!data) {
      return reply.status(404).send({ message: "Category not found" });
    }

    return reply.send({ data });
  });
}