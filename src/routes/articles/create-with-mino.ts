import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { authMiddleware } from "../auth-middleware";
import { CreateArticleInput } from "../../types/article";
import { Client as MinioClient } from "minio";

// Konfigurasi MinIO
const MINIO_CONFIG = {
  endPoint: "localhost",
  port: 9001,
  useSSL: false,
  accessKey: "G9tWjHvLYwWdaz2vzrww",
  secretKey: "K4FW9QiNj20PIVkCPg7e6towS8Ns9iwXu2wFOlEd",
};

const minioClient = new MinioClient(MINIO_CONFIG);
const BUCKET_NAME = "portal-bucket";
const baseUrl = `${MINIO_CONFIG.useSSL ? "https" : "http"}://${
  MINIO_CONFIG.endPoint
}:${MINIO_CONFIG.port}`;

export async function createArticle(fastify: FastifyInstance) {
  fastify.post<{
    Body: CreateArticleInput;
  }>("/articles", { preHandler: [authMiddleware] }, async (request, reply) => {
    try {
      const data = await request.file(); // Ambil file upload jika ada
      const platformId = Number(request.body.platform_id);

      if (
        !request.body.platform_id ||
        isNaN(platformId) ||
        platformId < 0 ||
        platformId > 9
      ) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "platform_id harus berupa integer antara 0 dan 9",
        });
      }

      // **Generate article_id**
      let articleId = request.body.article_id;
      if (!articleId) {
        const now = new Date();
        const year = (now.getFullYear() % 100).toString().padStart(2, "0");
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");

        const { data: lastArticle, error: seqError } = await supabase
          .from("articles")
          .select("article_id")
          .eq("platform_id", platformId)
          .order("article_id", { ascending: false })
          .limit(1)
          .single();

        if (seqError && seqError.code !== "PGRST116") {
          throw seqError;
        }

        let sequence = 1;
        if (lastArticle?.article_id) {
          const lastSeq = Number(lastArticle.article_id.toString().slice(-3));
          sequence = lastSeq + 1;
          if (sequence > 999)
            throw new Error("Sequence exceeded max value (999) for this day");
        }

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

      let imageUrl = null;

      // **Upload ke MinIO jika ada file**
      if (data) {
        console.log("Received file:", {
          filename: data.filename,
          mimetype: data.mimetype,
        });

        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedTypes.includes(data.mimetype)) {
          return reply.code(400).send({
            error: "Invalid file type",
            details: `Supported types: ${allowedTypes.join(", ")}`,
          });
        }

        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");

        const filePath = `uploads/${year}/${month}/${Date.now()}-${
          data.filename
        }`;

        const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
        if (!bucketExists) {
          await minioClient.makeBucket(BUCKET_NAME);
          console.log(`Bucket ${BUCKET_NAME} created`);
        }

        await minioClient.putObject(
          BUCKET_NAME,
          filePath,
          fileBuffer,
          fileBuffer.length,
          { "Content-Type": data.mimetype }
        );

        imageUrl = `${baseUrl}/${BUCKET_NAME}/${filePath}`;
        console.log("Uploaded image:", imageUrl);
      }

      // **Siapkan data artikel**
      const articleData = {
        ...request.body,
        platform_id: platformId,
        article_id: articleId,
        type: request.body.type || "post",
        status: request.body.status || "draft",
        image_url: imageUrl, // Tambahkan URL gambar jika ada
      };

      // **Simpan ke Supabase**
      const { data: newArticle, error } = await supabase
        .from("articles")
        .insert(articleData)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return reply.code(409).send({
            error: "Conflict",
            message: `Article dengan slug '${articleData.slug}' sudah ada`,
            details: error.details,
          });
        } else if (error.code === "23502") {
          return reply.code(400).send({
            error: "Bad Request",
            message: `Field yang diperlukan: ${error.details}`,
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

      reply.code(201).send(newArticle);
    } catch (error: any) {
      fastify.log.error("Error creating article:", error);
      reply.code(500).send({
        error: "Internal Server Error",
        message: "Gagal membuat artikel",
        details: error.message || "Terjadi kesalahan tidak terduga",
      });
    }
  });
}
