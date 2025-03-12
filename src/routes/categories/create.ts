import { FastifyInstance } from "fastify";
import supabase from "../../supabase";

export async function createCategory(fastify: FastifyInstance) {
  fastify.post("/categories", async (request, reply) => {
    const { 
      category_name, 
      category_desc, 
      category_count, 
      category_slug, 
      platform_id 
    } = request.body as { 
      category_name: string;
      category_desc?: string;
      category_count?: number;
      category_slug: string;
      platform_id?: string;
    };

    const { data, error } = await supabase
      .from("categories")
      .insert([{
        category_name,
        category_desc,
        category_count,
        category_slug,
        platform_id: platform_id || "xyzonemedia" // default value
      }])
      .select();

    if (error) {
      return reply.status(500).send({ 
        message: "Failed to create category", 
        error: error.message 
      });
    }

    return reply.status(201).send({ 
      message: "Category created successfully", 
      data: data[0] 
    });
  });
}