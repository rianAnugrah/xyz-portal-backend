import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import authRoutes from "./authRoutes";
import routes from "./routes";

const fastify = Fastify({ logger: true });

fastify.register(cors);
fastify.register(jwt, { secret: process.env.JWT_SECRET! });
fastify.register(authRoutes);
fastify.register(routes);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" }); // Menambahkan host: '0.0.0.0'
    console.log("Server running on http://0.0.0.0:3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
