import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";

export async function updateCategory(fastify: FastifyInstance) {
  fastify.put("/categories/:id", { preHandler: authMiddleware },async (request, reply) => {
    const { id } = request.params as { id: string };
    const { 
      category_name, 
      category_desc, 
      category_count, 
      category_slug, 
      platform_id 
    } = request.body as { 
      category_name?: string;
      category_desc?: string;
      category_count?: number;
      category_slug?: string;
      platform_id?: string;
    };

    const updates = {
      ...(category_name && { category_name }),
      ...(category_desc !== undefined && { category_desc }),
      ...(category_count !== undefined && { category_count }),
      ...(category_slug && { category_slug }),
      ...(platform_id && { platform_id })
    };

    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      return reply.status(500).send({ 
        message: "Failed to update category", 
        error: error.message 
      });
    }

    if (!data || data.length === 0) {
      return reply.status(404).send({ message: "Category not found" });
    }

    return reply.send({ 
      message: "Category updated successfully", 
      data: data[0] 
    });
  });
}