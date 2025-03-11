import { FastifyInstance } from "fastify";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import supabase from "./supabase";

const hashSHA256 = (password: string): string => {
    return crypto.createHash("sha256").update(password).digest("hex");
  };

async function authRoutes(fastify: FastifyInstance) {
  // Register User
  fastify.post("/register", async (request, reply) => {
    const { email, password, name } = request.body as { email: string; password: string; name: string };
    const hashedPassword = hashSHA256(password);

    const { data, error } = await supabase.from("users").insert([{ email, password_hash: hashedPassword, name }]);

    if (error) return reply.status(500).send(error);
    return reply.status(201).send({ message: "User registered successfully", data });
  });

  // Login User
  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single();
    if (error || !user) return reply.status(400).send({ message: "User not found" });


    const isValidPassword = hashSHA256(password) === user.password_hash;
    
    console.log('isValidPassword', password, user.password_hash);
    if (!isValidPassword) return reply.status(401).send({ message: "Invalid credentials" });

    //const token = fastify.jwt.sign({ id: user.id, email: user.email });
    return reply.send({  user });
  });

  // Add User (Admin Only)
  fastify.post("/add-user", async (request, reply) => {
    const { email, password, name } = request.body as { email: string; password: string; name: string };
    const hashedPassword = hashSHA256(password);

    const { data, error } = await supabase.from("users").insert([{ email, password_hash: hashedPassword, name }]);

    if (error) return reply.status(500).send(error);
    return reply.status(201).send({ message: "User added successfully", data });
  });

  // Forgot Password
  fastify.post("/forgot-password", async (request, reply) => {
    const { email } = request.body as { email: string };

    const token = crypto.createHash("sha256").update(email + Date.now().toString()).digest("hex");

    await supabase.from("password_resets").insert([{ email, token }]);

    return reply.send({ message: "Password reset link sent", token });
  });
}

export default authRoutes;
