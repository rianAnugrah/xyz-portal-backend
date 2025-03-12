import { FastifyInstance } from "fastify";
import supabase from "../../supabase";

export async function deleteCategory(fastify: FastifyInstance) {
  fastify.delete("/categories/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      return reply.status(500).send({ 
        message: "Failed to delete category", 
        error: error.message 
      });
    }

    if (!data || data.length === 0) {
      return reply.status(404).send({ message: "Category not found" });
    }

    return reply.send({ 
      message: "Category deleted successfully",
      data: data[0]
    });
  });
}