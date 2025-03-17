import { FastifyInstance } from "fastify";
import { Client as MinioClient } from "minio";
import { authMiddleware } from "../auth-middleware";

// Konfigurasi MinIO
const MINIO_CONFIG = {
  endPoint: "localhost", // Ganti dengan host MinIO Anda
  port: 9001, // Default port MinIO
  useSSL: false, // Ganti ke true jika menggunakan HTTPS
  accessKey: "G9tWjHvLYwWdaz2vzrww", // Ganti dengan access key Anda
  secretKey: "K4FW9QiNj20PIVkCPg7e6towS8Ns9iwXu2wFOlEd",
};

const minioClient = new MinioClient(MINIO_CONFIG);
const BUCKET_NAME = "portal-bucket";

// Buat base URL dari konfigurasi
const baseUrl = `${MINIO_CONFIG.useSSL ? "https" : "http"}://${
  MINIO_CONFIG.endPoint
}:${MINIO_CONFIG.port}`;

export async function uploadRoute(fastify: FastifyInstance) {
  await fastify.register(require("@fastify/multipart"), {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  fastify.post(
    "/upload",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({ error: "No file uploaded" });
        }

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
        const year = now.getFullYear().toString(); // e.g., "2025"
        const month = (now.getMonth() + 1).toString().padStart(2, "0"); // e.g., "03"

        // Simpan file dalam folder uploads/{tahun}/{bulan}/
        const filePath = `${year}/${month}/${Date.now()}-${data.filename}`;

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

        console.log("Upload success:", { bucket: BUCKET_NAME, filePath });

        // Konstruksi URL publik
        const publicUrl = `${baseUrl}/${BUCKET_NAME}/${filePath}`;

        console.log("Generated URL:", publicUrl);

        return reply.code(200).send({
          message: "Image uploaded successfully",
          url: publicUrl,
        });
      } catch (error) {
        console.error("Unexpected upload error:", error);
        return reply.code(500).send({
          error: "Upload failed",
          details:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  );
}
