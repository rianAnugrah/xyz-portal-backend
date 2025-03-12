import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ 
      message: "Unauthorized - Please login first",
      error: "Invalid or missing token"
    });
  }
}