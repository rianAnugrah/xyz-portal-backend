import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { hashSHA256 } from "../../helpers/hash";


export async function loginRoute(fastify: FastifyInstance) {
  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
  
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
  
    if (error) {
      console.error("Supabase error:", error);
      return reply.status(500).send({ message: "Database error", error });
    }
  
    if (!user) return reply.status(400).send({ message: "User not found" });
  
    const isValidPassword = await hashSHA256(password) === user.password_hash;
    if (!isValidPassword) return reply.status(401).send({ message: "Invalid credentials" });
  
    const token = fastify.jwt.sign({ id: user.id, email: user.email });
  
    return reply.send({ token, user });
  });
}