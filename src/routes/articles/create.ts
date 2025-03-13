import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";
import { CreateArticleInput } from "../../types/article";

export async function createArticle(fastify: FastifyInstance) {

  // Create Article
fastify.post<{
    Body: CreateArticleInput;
  }>("/articles", async (request, reply) => {
    try {
      const articleData = {
        ...request.body,
        type: request.body.type || "post",
        status: request.body.status || "draft",
      };
  
      const { data, error } = await supabase
        .from("articles")
        .insert(articleData)
        .select()
        .single();
  
      if (error) {
        // Tangani error spesifik dari Supabase
        if (error.code === "23505") { // Pelanggaran constraint unik (misalnya slug)
          return reply.code(409).send({
            error: "Conflict",
            message: `Article with slug '${articleData.slug}' already exists`,
            details: error.details
          });
        } else if (error.code === "23502") { // Kolom NOT NULL violation
          return reply.code(400).send({
            error: "Bad Request",
            message: `Missing required field: ${error.details}`,
            details: error.details
          });
        } else {
          // Error lainnya
          return reply.code(400).send({
            error: "Bad Request",
            message: error.message,
            details: error.details
          });
        }
      }
  
      reply.code(201).send(data);
    } catch (error: any) {
      // Tangani error tak terduga (misalnya koneksi database gagal)
      fastify.log.error(error);
      reply.code(500).send({
        error: "Internal Server Error",
        message: "Failed to create article",
        details: error.message || "An unexpected error occurred"
      });
    }
  });
}