import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import routes from "./routes";
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/categories";
import articleRoutes from "./routes/articles";
import { uploadRoute } from "./routes/upload/upload-route";
import fastifyMultipart from "@fastify/multipart";
import { userRoutes } from "./routes/users";
import headlineRoutes from "./routes/headlines";
import mostViewsRoutes from "./routes/most-views";
import editorChoicesRoutes from "./routes/editor-choices";
import { galleryRoutes } from "./routes/gallery/gallery-route";
import platformAccessRoutes from "./routes/platform-access";
import platformRoutes from "./routes/platforms";
import analyticsRoutes from "./routes/analytics/analytics-route";

const fastify = Fastify({ logger: true });

//Configure CORS explicitly
fastify.register(cors, {
  origin: [
    "https://xyzonemedia.com",
    "https://cms.xyzone.media",
    "http://localhost:4014", // for local dev
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  preflightContinue: false, // Ensure Fastify responds to OPTIONS itself
  optionsSuccessStatus: 204, // Return 204 for OPTIONS
});
// fastify.register(cors);
fastify.register(jwt, { secret: process.env.JWT_SECRET! });

fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB, sesuaikan sesuai kebutuhan
    files: 1, // Batasi 1 file per request
  },
});

fastify.register(authRoutes, { prefix: "/api" });
fastify.register(routes, { prefix: "/api" });
fastify.register(categoryRoutes, { prefix: "/api" });
fastify.register(articleRoutes, { prefix: "/api" });
fastify.register(uploadRoute, { prefix: "/api" });
fastify.register(userRoutes, { prefix: "/api" });
fastify.register(headlineRoutes, { prefix: "/api" });
fastify.register(editorChoicesRoutes, { prefix: "/api" });
fastify.register(mostViewsRoutes, { prefix: "/api" });
fastify.register(galleryRoutes, { prefix: "/api" });
fastify.register(platformAccessRoutes, { prefix: "/api" });
fastify.register(platformRoutes, { prefix: "/api" });
fastify.register(analyticsRoutes, { prefix: "/api" });
// Health check route
fastify.get("/", async (request, reply) => {
  reply.send({ status: "ok" });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" }); // Menambahkan host: '0.0.0.0'
    console.log("Server running on http://0.0.0.0:3000");
    console.log(`Server running on ${process.env.ENV} environment`);
    console.log(`Server running on ${process.env.SUPABASE_URL} supabase`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
