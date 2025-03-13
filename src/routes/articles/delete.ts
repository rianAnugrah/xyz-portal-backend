import { FastifyInstance } from "fastify";
import supabase from "../../supabase";

export async function deleteArticle(fastify: FastifyInstance) {

  // Delete Article (soft delete)
  fastify.delete<{
    Params: { id: string };
  }>("/articles/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      const { data, error } = await supabase
        .from("articles")
        .update({ is_deleted: true })
        .eq("_id", id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return reply.code(404).send({ error: "Article not found" });
      }

      reply.send({ message: "Article deleted successfully" });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: "Failed to delete article" });
    }
  });
}