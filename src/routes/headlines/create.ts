import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";

export async function createHeadlines(fastify: FastifyInstance) {
  fastify.post(
    "/headlines",
    //{ preHandler: authMiddleware },
    async (request, reply) => {
      const { headlines } = request.body as {
        headlines: Array<{
          article_id: string;
          position: number;
          headline_category?: string;
        }>;
      };

      const { platform_id } = request.query as {
        platform_id?: string;
      };

      // Input validation
      if (!headlines || !Array.isArray(headlines)) {
        return reply.status(400).send({
          message: "Headlines must be provided as an array",
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
              .from("headlines")
              .upsert(
                {
                  article_id: headline.article_id,
                  position: headline.position,
                  platform_id: platform_id,
                  headline_category: headline.headline_category
                },
                {
                  onConflict: "position,platform_id,headline_category"
                }
              )
              .eq("position", headline.position)
              .eq("platform_id", platform_id)
              .eq("headline_category", headline.headline_category)
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
          message: "Headlines processed successfully",
          data: results,
        });
      } catch (error) {
        console.error("Error processing headlines:", error);
        return reply.status(500).send({
          message: "Failed to process headlines",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
