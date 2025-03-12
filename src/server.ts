import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import routes from "./routes";
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/categories";

const fastify = Fastify({ logger: true });

fastify.register(cors);
fastify.register(jwt, { secret: process.env.JWT_SECRET! });
fastify.register(authRoutes, {prefix : "/api"});
fastify.register(routes, {prefix : "/api"});
fastify.register(categoryRoutes, {prefix : "/api"});

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
