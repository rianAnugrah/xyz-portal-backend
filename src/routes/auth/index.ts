import { FastifyInstance } from "fastify";
import { registerRoute } from "./register";
import { loginRoute } from "./login";
import { forgotPasswordRoute } from "./forgot-password";

export default async function authRoutes(fastify: FastifyInstance) {
  await Promise.all([
    registerRoute(fastify),
    loginRoute(fastify),
    forgotPasswordRoute(fastify)
  ]);
}