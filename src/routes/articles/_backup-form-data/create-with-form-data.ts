import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { Client as MinioClient } from "minio";
import { randomUUID } from "crypto";
import path from "path";
import supabase from "../../../supabase";

type ArticleFields = {
  [key: string]: { value: string };
};

export async function createArticleWithFormData(fastify: FastifyInstance) {
  // Konfigurasi MinIO
  const MINIO_CONFIG = {
    endPoint: process.env.MINIO_URL!,
    port: 9001,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  };

  const minioClient = new MinioClient(MINIO_CONFIG);
  const BUCKET_NAME = "articles";
  const baseUrl = `${MINIO_CONFIG.useSSL ? "https" : "http"}://${
    MINIO_CONFIG.endPoint
  }:${MINIO_CONFIG.port}`;

  fastify.post(
    "/articles-with-form-data",
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await req.file();
        if (!data) {
          return reply.status(400).send({ error: "No file uploaded" });
        }

        const fields: ArticleFields = (await data.fields) as ArticleFields;

        if (!fields.title || !fields.slug || !fields.content) {
          return reply
            .status(400)
            .send({ error: "Title, slug, and content are required" });
        }

        let articleId = fields.article_id ? Number(fields.article_id.value) : 0;
        let platformId = fields.platform_id
          ? Number(fields.platform_id.value)
          : 0;

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
          // if (articleId > 2147483647) {
          //   throw new Error(
          //     "Generated article_id exceeds integer limit (2,147,483,647)"
          //   );
          // }
        }

        let imageUrl = "";
        if (data.file) {
          const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
          if (!allowedTypes.includes(data.mimetype)) {
            return reply.code(400).send({
              error: "Invalid file type",
              details: `Supported types: ${allowedTypes.join(", ")}`,
            });
          }

          const fileName = `${randomUUID()}${path.extname(data.filename)}`;
          const chunks: Buffer[] = [];
          for await (const chunk of data.file) {
            chunks.push(chunk);
          }
          const fileBuffer = Buffer.concat(chunks);

          const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
          if (!bucketExists) {
            await minioClient.makeBucket(BUCKET_NAME);
            console.log(`Bucket ${BUCKET_NAME} created`);
          }

          await minioClient.putObject(
            BUCKET_NAME,
            fileName,
            fileBuffer,
            fileBuffer.length,
            { "Content-Type": data.mimetype }
          );

          imageUrl = `${baseUrl}/${BUCKET_NAME}/${fileName}`;
        }

        console.log("LOGLOGLOGLOG================>", req, fields);

        const { data: insertedData, error: insertError } = await supabase
          .from("articles")
          .insert([
            {
              article_id: fields.article_id
                ? Number(fields.article_id.value)
                : 0,
              platform_id: fields.platform_id
                ? Number(fields.platform_id.value)
                : null,
              title: fields.title.value,
              type: fields.type ? fields.type.value : "",
              image: imageUrl,
              image_alt: fields.image_alt ? fields.image_alt.value : null,
              date: fields.date ? new Date(fields.date.value) : new Date(),
              slug: fields.slug.value,
              content: fields.content.value,
              tags: fields.tags ? JSON.parse(fields.tags.value) : [],
              description: fields.description ? fields.description.value : null,
              category: fields.category
                ? JSON.parse(fields.category.value)
                : [],
              author_id: fields.author_id ? Number(fields.author_id.value) : 0,
              status: fields.status ? fields.status.value : "draft",
              approved_by: fields.approved_by
                ? Number(fields.approved_by.value)
                : 0,
              approved_at: fields.approved_at
                ? new Date(fields.approved_at.value)
                : new Date(),
              is_deleted: fields.is_deleted
                ? fields.is_deleted.value === "true"
                : false,
              created_at: new Date(),
              updated_at: new Date(),
              views: fields.views ? Number(fields.views.value) : 0,
              caption: fields.caption ? fields.caption.value : null,
              image_description: fields.image_description
                ? fields.image_description.value
                : null,
              meta_title: fields.meta_title ? fields.meta_title.value : null,
              scheduled_at: fields.scheduled_at
                ? new Date(fields.scheduled_at.value)
                : null,
              image_title: fields.image_title ? fields.image_title.value : null,
            },
          ])
          .select("*")
          .single();

        if (insertError) {
          return reply.status(500).send({ error: insertError.message });
        }

        return reply.status(201).send({
          message: "Article created successfully",
          imageUrl,
          data: insertedData,
        });
      } catch (error) {
        console.error("Unexpected error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          details:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  );
}
