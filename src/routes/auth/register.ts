import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { hashSHA256 } from "../../helpers/hash";


export async function registerRoute(fastify: FastifyInstance) {
  fastify.post("/register", async (request, reply) => {
    const { email, password, name } = request.body as { email: string; password: string; name: string };
    const hashedPassword = hashSHA256(password);

    const { data, error } = await supabase
      .from("users")
      .insert([{ email, password_hash: hashedPassword, name }]);

    if (error) return reply.status(500).send(error);
    return reply.status(201).send({ message: "User registered successfully", data });
  });
}