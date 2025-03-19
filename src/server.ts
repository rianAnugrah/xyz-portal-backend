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

const fastify = Fastify({ logger: true });

fastify.register(cors);
fastify.register(jwt, { secret: process.env.JWT_SECRET! });

fastify.register(fastifyMultipart);

fastify.register(authRoutes, { prefix: "/api" });
fastify.register(routes, { prefix: "/api" });
fastify.register(categoryRoutes, { prefix: "/api" });
fastify.register(articleRoutes, { prefix: "/api" });
fastify.register(uploadRoute, { prefix: "/api" });
fastify.register(userRoutes, { prefix: "/api" });
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
