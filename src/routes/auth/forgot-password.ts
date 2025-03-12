
import { FastifyInstance } from "fastify";
import * as crypto from "crypto";
import supabase from "../../supabase";

export async function forgotPasswordRoute(fastify: FastifyInstance) {
  fastify.post("/forgot-password", async (request, reply) => {
    const { email } = request.body as { email: string };

    const token = crypto.createHash("sha256").update(email + Date.now().toString()).digest("hex");

    await supabase.from("password_resets").insert([{ email, token }]);

    return reply.send({ message: "Password reset link sent", token });
  });
}