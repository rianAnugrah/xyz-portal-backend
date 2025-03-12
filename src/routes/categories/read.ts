import { FastifyInstance } from "fastify";
import supabase from "../../supabase";

export async function getCategories(fastify: FastifyInstance) {
  // Get all categories
  fastify.get("/categories", async (request, reply) => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return reply.status(500).send({ 
        message: "Failed to fetch categories", 
        error: error.message 
      });
    }

    return reply.send({ data });
  });

  // Get single category by id
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