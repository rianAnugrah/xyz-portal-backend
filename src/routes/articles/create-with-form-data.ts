import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Client as MinioClient } from "minio";
import { randomUUID } from "crypto";
import path from "path";

type ArticleFields = {
  [key: string]: { value: string };
};

export async function createArticleWithFormData(fastify: FastifyInstance) {
  const supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

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

  fastify.post(
    "/articles-with-form-data",
    async (req: FastifyRequest, reply: FastifyReply) => {
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

      let imageUrl = "";
      if (data.file) {
        const fileName = `${randomUUID()}${path.extname(data.filename)}`;
        try {
          const fileBuffer = await data.toBuffer();
          await minioClient.putObject(
            BUCKET_NAME,
            fileName,
            fileBuffer,
            fileBuffer.length,
            {
              "Content-Type": data.mimetype,
            }
          );
          imageUrl = `${process.env.MINIO_URL}/${BUCKET_NAME}/${fileName}`;
        } catch (error) {
          return reply
            .status(500)
            .send({ error: "Image upload to MinIO failed" });
        }
      }

      const { error: insertError } = await supabase.from("articles").insert([
        {
          article_id: fields.article_id ? Number(fields.article_id.value) : 0,
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
          category: fields.category ? JSON.parse(fields.category.value) : [],
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
      ]);

      if (insertError) {
        return reply.status(500).send({ error: insertError.message });
      }

      return reply
        .status(201)
        .send({ message: "Article created successfully" });
    }
  );
}
