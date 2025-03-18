import { FastifyInstance, RouteOptions } from "fastify";
import { Client as MinioClient } from "minio";
import { authMiddleware } from "../auth-middleware";
import multipart, { MultipartFile } from "@fastify/multipart";

// Konfigurasi MinIO
const MINIO_CONFIG = {
  endPoint: process.env.MINIO_URL!,
  port: 9001,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
};

const minioClient = new MinioClient(MINIO_CONFIG);
const BUCKET_NAME = "portal-bucket";

const baseUrl = `${MINIO_CONFIG.useSSL ? "https" : "http"}://${
  MINIO_CONFIG.endPoint
}:${MINIO_CONFIG.port}`;

export async function uploadRoute(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  const routeOptions: RouteOptions = {
    method: "POST",
    url: "/upload",
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      try {
        const data = (await request.file()) as MultipartFile;
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
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");

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
    },
  };

  fastify.route(routeOptions);
}
