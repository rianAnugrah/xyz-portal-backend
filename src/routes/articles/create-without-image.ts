import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";
import { CreateArticleInput } from "../../types/article";

export async function createArticle(fastify: FastifyInstance) {
  fastify.post<{
    Body: CreateArticleInput;
  }>("/articles", async (request, reply) => {
    try {
      // Check if platform_id exists and is a valid integer, throw error if missing or invalid
      const platformId = Number(request.body.platform_id);
      if (
        !request.body.platform_id ||
        isNaN(platformId) ||
        platformId < 0 ||
        platformId > 9
      ) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "platform_id must be a valid integer between 0 and 9",
        });
      }

      // Generate article_id if not provided
      let articleId = request.body.article_id;
      if (articleId === undefined || articleId === null) {
        const now = new Date();
        const year = (now.getFullYear() % 100).toString().padStart(2, "0"); // e.g., "25" (2-digit year)
        const month = (now.getMonth() + 1).toString().padStart(2, "0"); // e.g., "03"
        const day = now.getDate().toString().padStart(2, "0"); // e.g., "14"

        // Get the latest article for the platform to determine the sequence
        const { data: lastArticle, error: seqError } = await supabase
          .from("articles")
          .select("article_id")
          .eq("platform_id", platformId)
          .order("article_id", { ascending: false })
          .limit(1)
          .single();

        if (seqError && seqError.code !== "PGRST116") {
          throw seqError; // PGRST116 = no rows found
        }

        let sequence = 1; // Default sequence as integer
        if (
          lastArticle &&
          lastArticle.article_id !== null &&
          lastArticle.article_id !== undefined
        ) {
          const lastArticleId = Number(lastArticle.article_id); // Ensure it’s a number
          const lastSeq = Math.floor(lastArticleId % 1000); // Last 3 digits
          sequence = lastSeq + 1; // Increment
          if (sequence > 999) {
            throw new Error(
              "Sequence exceeded maximum value (999) for this day"
            );
          }
        }

        // Construct article_id as an integer: [platform_id][YY][MM][DD][sequence]
        articleId = Number(
          `${platformId}${year}${month}${day}${sequence
            .toString()
            .padStart(3, "0")}`
        );
        if (articleId > 2147483647) {
          throw new Error(
            "Generated article_id exceeds integer limit (2,147,483,647)"
          );
        }
      }

      // Prepare article data
      const articleData = {
        ...request.body,
        platform_id: platformId, // Ensure platform_id is an integer
        article_id: articleId, // Integer article_id
        type: request.body.type || "post",
        status: request.body.status || "draft",
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from("articles")
        .insert(articleData)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return reply.code(409).send({
            error: "Conflict",
            message: `Article with slug '${articleData.slug}' already exists`,
            details: error.details,
          });
        } else if (error.code === "23502") {
          return reply.code(400).send({
            error: "Bad Request",
            message: `Missing required field: ${error.details}`,
            details: error.details,
          });
        } else {
          return reply.code(400).send({
            error: "Bad Request",
            message: error.message,
            details: error.details,
          });
        }
      }

      reply.code(201).send(data);
    } catch (error: any) {
      fastify.log.error("Error creating article:", error);
      reply.code(500).send({
        error: "Internal Server Error",
        message: "Failed to create article",
        details: error.message || "An unexpected error occurred",
      });
    }
  });
}
