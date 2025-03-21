import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { formatDate } from "../../helpers/date-format";

export async function getEditorChoices(fastify: FastifyInstance) {
  fastify.get("/editor-choices", async (request, reply) => {
    fastify.log.info("Starting query for editor choice...");
    let query = supabase.from("editor_choices").select(
      `position,
        article_id,
      article:article_id (
        _id,
        article_id,
        title,
        slug,
        date,
        image,
        description,
        author:author_id (
          user_id,
          username,
          fullname,
          avatar
        )
      )
    `
    );
    const { data, error } = await query;

    fastify.log.info("Query executed:", { data, error });

    if (error) {
      return reply.status(500).send({
        message: "Failed to fetch editor_choices",
        error: error.message,
      });
    }

    const formattedData = data?.map((headline: any) => ({
      ...headline,
      article: {
        ...headline.article,
        image: headline.article.image.includes("http")
          ? headline.article.image
          : `${process.env.IMAGE_URL}${headline.article.image}`,
        date: formatDate(headline.article.date),
      },
    }));

    return reply.send({
      message: "success",
      data: formattedData || [],
    });
  });
}
