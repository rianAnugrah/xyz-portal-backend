import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";

export async function createEditorChoices(fastify: FastifyInstance) {
  fastify.post(
    "/editor-choices",
    //{ preHandler: authMiddleware },
    async (request, reply) => {
      const { headlines } = request.body as {
        headlines: Array<{
          article_id: string;
          position: number;
        }>;
      };

      const { platform_id } = request.query as {
        platform_id?: string;
      };

      // Input validation
      if (!headlines || !Array.isArray(headlines)) {
        return reply.status(400).send({
          message: "Editor choices must be provided as an array",
        });
      }

      if (!platform_id) {
        return reply.status(400).send({
          message: "platform_id is required",
        });
      }

      try {
        const results = await Promise.all(
          headlines.map(async (headline) => {
            const { data, error } = await supabase
              .from("editor_choices")
              .upsert(
                {
                  article_id: headline.article_id,
                  position: headline.position,
                  platform_id: platform_id,
                },
                {
                  onConflict: "position,platform_id", // Changed to a single string with comma-separated columns
                }
              )
              .eq("position", headline.position)
              .eq("platform_id", platform_id)
              .select();

            if (error) {
              throw new Error(
                `Failed to process headline at position ${headline.position}: ${error.message}`
              );
            }
            return data;
          })
        );

        return reply.status(201).send({
          message: "Editor Choice processed successfully",
          data: results,
        });
      } catch (error) {
        console.error("Error processing Editor Choice:", error);
        return reply.status(500).send({
          message: "Failed to process Editor Choice",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
