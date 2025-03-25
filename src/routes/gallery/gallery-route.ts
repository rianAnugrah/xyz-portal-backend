import { FastifyInstance, RouteOptions } from "fastify";
import { Client as MinioClient } from "minio";
import { authMiddleware } from "../auth-middleware";
import { MultipartFile } from "@fastify/multipart";
import { Stream } from "stream";

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

// Fungsi untuk mengambil daftar objek dari MinIO
async function listObjectsFromMinio(): Promise<
  { name: string; url: string; lastModified: Date }[]
> {
  return new Promise((resolve, reject) => {
    const objects: { name: string; url: string; lastModified: Date }[] = [];
    const stream = minioClient.listObjectsV2(BUCKET_NAME, "", true);

    stream.on("data", (obj) => {
      if (obj.name) {
        const publicUrl = `${baseUrl}/${BUCKET_NAME}/${obj.name}`;
        objects.push({
          name: obj.name,
          url: publicUrl,
          lastModified: obj.lastModified,
        });
      }
    });

    stream.on("error", (err) => {
      reject(err);
    });

    stream.on("end", () => {
      resolve(objects);
    });
  });
}

export async function galleryRoutes(fastify: FastifyInstance) {
  // Rute untuk mengunggah gambar ke MinIO (tanpa Supabase)
  const uploadRoute: RouteOptions = {
    method: "POST",
    url: "/gallery-upload",
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      try {
        const data = (await request.file()) as MultipartFile;
        if (!data) {
          return reply.code(400).send({ error: "No file uploaded" });
        }

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

        const publicUrl = `${baseUrl}/${BUCKET_NAME}/${filePath}`;

        return reply.code(200).send({
          message: "Image uploaded successfully",
          url: publicUrl,
        });
      } catch (error) {
        console.error("Upload error:", error);
        return reply.code(500).send({
          error: "Upload failed",
          details:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
  };

  // Rute untuk mendapatkan daftar gambar dari MinIO
  const getGalleryRoute: RouteOptions = {
    method: "GET",
    url: "/gallery",
    handler: async (request, reply) => {
      try {
        const images = await listObjectsFromMinio();

        // Filter hanya file gambar berdasarkan ekstensi (opsional)
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif"];
        const filteredImages = images.filter((img) =>
          imageExtensions.some((ext) => img.name.toLowerCase().endsWith(ext))
        );

        return reply.code(200).send({
          message: "Gallery retrieved successfully",
          images: filteredImages,
        });
      } catch (error) {
        console.error("Gallery fetch error:", error);
        return reply.code(500).send({
          error: "Failed to fetch gallery",
          details:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
  };

  fastify.route(uploadRoute);
  fastify.route(getGalleryRoute);
}
